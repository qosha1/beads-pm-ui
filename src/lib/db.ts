import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { Bead, Dependency, Team } from "./types";

const TEAMS_DIR = path.resolve(process.cwd(), "../teams");

export function getTeams(): Team[] {
  const teams: Team[] = [];

  if (!fs.existsSync(TEAMS_DIR)) {
    return teams;
  }

  const entries = fs.readdirSync(TEAMS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const beadsPath = path.join(TEAMS_DIR, entry.name, ".beads", "beads.db");
      if (fs.existsSync(beadsPath)) {
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

export function getBeadsForTeam(teamId: string): Bead[] {
  const teams = getTeams();
  const team = teams.find((t) => t.id === teamId);

  if (!team) {
    return [];
  }

  const db = new Database(team.path, { readonly: true });

  try {
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
  } finally {
    db.close();
  }
}

export function getDependenciesForTeam(teamId: string): Dependency[] {
  const teams = getTeams();
  const team = teams.find((t) => t.id === teamId);

  if (!team) {
    return [];
  }

  const db = new Database(team.path, { readonly: true });

  try {
    return db.prepare(`
      SELECT issue_id, depends_on_id, type
      FROM dependencies
      WHERE type = 'blocks'
    `).all() as Dependency[];
  } finally {
    db.close();
  }
}

export function getAllBeads(): { beads: Bead[]; dependencies: Dependency[] } {
  const teams = getTeams();
  const allBeads: Bead[] = [];
  const allDeps: Dependency[] = [];

  for (const team of teams) {
    allBeads.push(...getBeadsForTeam(team.id));
    allDeps.push(...getDependenciesForTeam(team.id));
  }

  return { beads: allBeads, dependencies: allDeps };
}

export function updateBead(
  teamId: string,
  beadId: string,
  updates: Record<string, unknown>
): boolean {
  const teams = getTeams();
  const team = teams.find((t) => t.id === teamId);

  if (!team) {
    return false;
  }

  const db = new Database(team.path);

  try {
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
      return false;
    }

    fieldsToUpdate.push("updated_at = CURRENT_TIMESTAMP");
    values.push(beadId);

    const sql = `UPDATE issues SET ${fieldsToUpdate.join(", ")} WHERE id = ?`;
    const result = db.prepare(sql).run(...values);

    return result.changes > 0;
  } finally {
    db.close();
  }
}
