import Database from "better-sqlite3";
import path from "path";
import fs from "fs/promises";
import type { Bead, Dependency, Team } from "./types";

const TEAMS_DIR = path.resolve(process.cwd(), "../teams");

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Database connection pool with LRU cache
interface CachedConnection {
  db: Database.Database;
  lastAccess: number;
  readonly: boolean;
}

const MAX_CACHE_SIZE = 10;
const CONNECTION_TTL_MS = 5 * 60 * 1000; // 5 minutes

const connectionCache = new Map<string, CachedConnection>();

function getConnection(dbPath: string, readonly: boolean = true): Database.Database {
  const cacheKey = `${dbPath}:${readonly ? "ro" : "rw"}`;
  const now = Date.now();

  // Check if we have a cached connection
  const cached = connectionCache.get(cacheKey);
  if (cached) {
    cached.lastAccess = now;
    return cached.db;
  }

  // Evict stale connections
  evictStaleConnections(now);

  // Evict oldest if at capacity
  if (connectionCache.size >= MAX_CACHE_SIZE) {
    evictOldestConnection();
  }

  // Create new connection
  const db = new Database(dbPath, { readonly });
  connectionCache.set(cacheKey, { db, lastAccess: now, readonly });

  return db;
}

function evictStaleConnections(now: number): void {
  for (const [key, conn] of connectionCache.entries()) {
    if (now - conn.lastAccess > CONNECTION_TTL_MS) {
      try {
        conn.db.close();
      } catch {
        // Ignore close errors
      }
      connectionCache.delete(key);
    }
  }
}

function evictOldestConnection(): void {
  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  for (const [key, conn] of connectionCache.entries()) {
    if (conn.lastAccess < oldestTime) {
      oldestTime = conn.lastAccess;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    const conn = connectionCache.get(oldestKey);
    if (conn) {
      try {
        conn.db.close();
      } catch {
        // Ignore close errors
      }
      connectionCache.delete(oldestKey);
    }
  }
}

// Cleanup on process exit
function cleanupConnections(): void {
  for (const [, conn] of connectionCache.entries()) {
    try {
      conn.db.close();
    } catch {
      // Ignore close errors
    }
  }
  connectionCache.clear();
}

if (typeof process !== "undefined") {
  process.on("exit", cleanupConnections);
  process.on("SIGINT", () => {
    cleanupConnections();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanupConnections();
    process.exit(0);
  });
}

export async function getTeams(): Promise<Team[]> {
  const teams: Team[] = [];

  if (!(await pathExists(TEAMS_DIR))) {
    return teams;
  }

  const entries = await fs.readdir(TEAMS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const beadsPath = path.join(TEAMS_DIR, entry.name, ".beads", "beads.db");
      if (await pathExists(beadsPath)) {
        teams.push({
          id: entry.name,
          name: entry.name.toUpperCase(),
          path: beadsPath,
        });
      }
    }
  }

  return teams;
}

export async function getBeadsForTeam(teamId: string): Promise<Bead[]> {
  const teams = await getTeams();
  const team = teams.find((t) => t.id === teamId);

  if (!team) {
    return [];
  }

  const db = getConnection(team.path, true);

  const rows = db.prepare(`
    SELECT
      id, title, description, status, priority, issue_type,
      assignee, estimated_minutes, created_at, updated_at,
      due_at, defer_until
    FROM issues
    WHERE deleted_at IS NULL
    ORDER BY priority ASC, created_at DESC
  `).all() as Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    priority: number;
    issue_type: string;
    assignee: string | null;
    estimated_minutes: number | null;
    created_at: string;
    updated_at: string;
    due_at: string | null;
    defer_until: string | null;
  }>;

  return rows.map((row) => ({
    ...row,
    status: row.status as Bead["status"],
    team: teamId,
  }));
}

export async function getDependenciesForTeam(teamId: string): Promise<Dependency[]> {
  const teams = await getTeams();
  const team = teams.find((t) => t.id === teamId);

  if (!team) {
    return [];
  }

  const db = getConnection(team.path, true);

  return db.prepare(`
    SELECT issue_id, depends_on_id, type
    FROM dependencies
    WHERE type = 'blocks'
  `).all() as Dependency[];
}

export async function getAllBeads(): Promise<{ beads: Bead[]; dependencies: Dependency[] }> {
  const teams = await getTeams();
  const allBeads: Bead[] = [];
  const allDeps: Dependency[] = [];

  for (const team of teams) {
    allBeads.push(...(await getBeadsForTeam(team.id)));
    allDeps.push(...(await getDependenciesForTeam(team.id)));
  }

  return { beads: allBeads, dependencies: allDeps };
}

export interface UpdateBeadResult {
  success: boolean;
  bead?: Bead;
  error?: string;
}

export async function updateBead(
  teamId: string,
  beadId: string,
  updates: Record<string, unknown>
): Promise<UpdateBeadResult> {
  const teams = await getTeams();
  const team = teams.find((t) => t.id === teamId);

  if (!team) {
    return { success: false, error: "Team not found" };
  }

  const db = getConnection(team.path, false);

  const allowedFields = [
    "title",
    "status",
    "priority",
    "assignee",
    "due_at",
    "estimated_minutes",
  ];

  const fieldsToUpdate: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fieldsToUpdate.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fieldsToUpdate.length === 0) {
    return { success: false, error: "No valid fields to update" };
  }

  fieldsToUpdate.push("updated_at = CURRENT_TIMESTAMP");
  values.push(beadId);

  const sql = `UPDATE issues SET ${fieldsToUpdate.join(", ")} WHERE id = ?`;
  const result = db.prepare(sql).run(...values);

  if (result.changes === 0) {
    return { success: false, error: "Bead not found" };
  }

  // Fetch and return the updated bead
  const row = db.prepare(`
    SELECT
      id, title, description, status, priority, issue_type,
      assignee, estimated_minutes, created_at, updated_at,
      due_at, defer_until
    FROM issues
    WHERE id = ?
  `).get(beadId) as {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: number;
    issue_type: string;
    assignee: string | null;
    estimated_minutes: number | null;
    created_at: string;
    updated_at: string;
    due_at: string | null;
    defer_until: string | null;
  } | undefined;

  if (!row) {
    return { success: false, error: "Failed to retrieve updated bead" };
  }

  const bead: Bead = {
    ...row,
    status: row.status as Bead["status"],
    team: teamId,
  };

  return { success: true, bead };
}
