import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";

// Mock statement methods
const mockStatement = {
  all: vi.fn((): unknown[] => []),
  get: vi.fn((): unknown => undefined),
  run: vi.fn(() => ({ changes: 0 })),
};

const mockDb = {
  prepare: vi.fn(() => mockStatement),
  close: vi.fn(),
};

// Mock fs/promises
vi.mock("fs/promises", () => ({
  default: {
    access: vi.fn(),
    readdir: vi.fn(),
  },
}));

// Mock better-sqlite3 with a factory function that returns our mockDb
vi.mock("better-sqlite3", () => {
  return {
    default: function MockDatabase() {
      return mockDb;
    },
  };
});

// Import after mocks are set up
import fs from "fs/promises";
import { getTeams, getBeadsForTeam, updateBead, getDependenciesForTeam, getAllBeads } from "../db";

describe("db.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTeams()", () => {
    it("returns empty array when teams directory does not exist", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

      const teams = await getTeams();

      expect(teams).toEqual([]);
    });

    it("returns empty array when teams directory is empty and no root beads", async () => {
      vi.mocked(fs.access).mockImplementation(async (p) => {
        // Root beads doesn't exist, teams dir exists
        if (String(p).includes(".beads/beads.db")) throw new Error("ENOENT");
        return undefined;
      });
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const teams = await getTeams();

      expect(teams).toEqual([]);
    });

    it("returns teams with valid beads.db files", async () => {
      let callCount = 0;
      vi.mocked(fs.access).mockImplementation(async () => {
        callCount++;
        // First call is root beads check - doesn't exist
        if (callCount === 1) throw new Error("ENOENT");
        return undefined;
      });
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: "team1", isDirectory: () => true },
        { name: "team2", isDirectory: () => true },
      ] as unknown as ReturnType<typeof fs.readdir> extends Promise<infer T> ? T : never);

      const teams = await getTeams();

      expect(teams).toHaveLength(2);
      expect(teams[0].id).toBe("team1");
      expect(teams[0].name).toBe("TEAM1");
      expect(teams[1].id).toBe("team2");
      expect(teams[1].name).toBe("TEAM2");
    });

    it("includes root beads (ceo) when present", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: "team1", isDirectory: () => true },
      ] as unknown as ReturnType<typeof fs.readdir> extends Promise<infer T> ? T : never);

      const teams = await getTeams();

      expect(teams).toHaveLength(2);
      expect(teams[0].id).toBe("ceo");
      expect(teams[0].name).toBe("CEO");
      expect(teams[1].id).toBe("team1");
    });

    it("filters out directories without beads.db", async () => {
      let callCount = 0;
      vi.mocked(fs.access).mockImplementation(async (p) => {
        callCount++;
        // First call is root beads check - doesn't exist
        if (callCount === 1) throw new Error("ENOENT");
        // Second call is TEAMS_DIR - exists
        if (callCount === 2) return undefined;
        // Only team1 has beads.db (not team2)
        if (String(p).includes("team2")) throw new Error("ENOENT");
        return undefined;
      });
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: "team1", isDirectory: () => true },
        { name: "team2", isDirectory: () => true },
      ] as unknown as ReturnType<typeof fs.readdir> extends Promise<infer T> ? T : never);

      const teams = await getTeams();

      expect(teams).toHaveLength(1);
      expect(teams[0].id).toBe("team1");
    });

    it("only processes directory entries", async () => {
      let callCount = 0;
      vi.mocked(fs.access).mockImplementation(async () => {
        callCount++;
        // First call is root beads check - doesn't exist
        if (callCount === 1) throw new Error("ENOENT");
        return undefined;
      });
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: "team1", isDirectory: () => true },
        { name: "file.txt", isDirectory: () => false },
        { name: "team2", isDirectory: () => true },
      ] as unknown as ReturnType<typeof fs.readdir> extends Promise<infer T> ? T : never);

      const teams = await getTeams();

      expect(teams).toHaveLength(2);
      expect(teams.map((t) => t.id)).toEqual(["team1", "team2"]);
    });
  });

  describe("getBeadsForTeam(teamId)", () => {
    it("returns empty array for non-existent team", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

      const beads = await getBeadsForTeam("nonexistent");

      expect(beads).toEqual([]);
    });

    it("returns beads with correct structure", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: "team1", isDirectory: () => true },
      ] as unknown as ReturnType<typeof fs.readdir> extends Promise<infer T> ? T : never);

      const mockRows = [
        {
          id: "bead-1",
          title: "Test Bead",
          description: "Description",
          status: "open",
          priority: 1,
          issue_type: "task",
          assignee: "user1",
          estimated_minutes: 60,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
          due_at: null,
          defer_until: null,
        },
      ];

      mockStatement.all.mockReturnValue(mockRows);

      const beads = await getBeadsForTeam("team1");

      expect(beads).toHaveLength(1);
      expect(beads[0].id).toBe("bead-1");
      expect(beads[0].title).toBe("Test Bead");
      expect(beads[0].team).toBe("team1");
    });

    it("includes team property in returned beads", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: "myteam", isDirectory: () => true },
      ] as unknown as ReturnType<typeof fs.readdir> extends Promise<infer T> ? T : never);

      const mockRows = [{ id: "bead-1", title: "Test", description: "", status: "open", priority: 1, issue_type: "task", assignee: null, estimated_minutes: null, created_at: "", updated_at: "", due_at: null, defer_until: null }];

      mockStatement.all.mockReturnValue(mockRows);

      const beads = await getBeadsForTeam("myteam");

      expect(beads[0].team).toBe("myteam");
    });
  });

  describe("getDependenciesForTeam(teamId)", () => {
    it("returns empty array for non-existent team", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

      const deps = await getDependenciesForTeam("nonexistent");

      expect(deps).toEqual([]);
    });

    it("returns dependencies from database", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: "team1", isDirectory: () => true },
      ] as unknown as ReturnType<typeof fs.readdir> extends Promise<infer T> ? T : never);

      const mockDeps = [
        { issue_id: "bead-1", depends_on_id: "bead-2", type: "blocks" },
      ];

      mockStatement.all.mockReturnValue(mockDeps);

      const deps = await getDependenciesForTeam("team1");

      expect(deps).toHaveLength(1);
      expect(deps[0].issue_id).toBe("bead-1");
    });
  });

  describe("getAllBeads()", () => {
    it("returns empty arrays when no teams exist", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

      const result = await getAllBeads();

      expect(result.beads).toEqual([]);
      expect(result.dependencies).toEqual([]);
    });

    it("aggregates beads and dependencies from all teams", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: "team1", isDirectory: () => true },
        { name: "team2", isDirectory: () => true },
      ] as unknown as ReturnType<typeof fs.readdir> extends Promise<infer T> ? T : never);

      // First calls for beads, then for dependencies
      let callIndex = 0;
      mockStatement.all.mockImplementation(() => {
        callIndex++;
        // Return different data for each call
        if (callIndex <= 2) {
          // Beads calls
          return [{ id: `bead-${callIndex}`, title: "Test", description: "", status: "open", priority: 1, issue_type: "task", assignee: null, estimated_minutes: null, created_at: "", updated_at: "", due_at: null, defer_until: null }];
        }
        // Dependencies calls
        return [{ issue_id: "bead-1", depends_on_id: "bead-2", type: "blocks" }];
      });

      const result = await getAllBeads();

      expect(result.beads.length).toBeGreaterThan(0);
      expect(result.dependencies.length).toBeGreaterThan(0);
    });
  });

  describe("updateBead(teamId, beadId, updates)", () => {
    it("returns error for non-existent team", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

      const result = await updateBead("nonexistent", "bead-1", { title: "New" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Team not found");
    });

    it("returns error when no valid fields to update", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: "team1", isDirectory: () => true },
      ] as unknown as ReturnType<typeof fs.readdir> extends Promise<infer T> ? T : never);

      const result = await updateBead("team1", "bead-1", { invalid_field: "value" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("No valid fields to update");
    });

    it("returns error when bead not found", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: "team1", isDirectory: () => true },
      ] as unknown as ReturnType<typeof fs.readdir> extends Promise<infer T> ? T : never);

      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await updateBead("team1", "nonexistent", { title: "New" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Bead not found");
    });

    it("successfully updates valid fields", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: "team1", isDirectory: () => true },
      ] as unknown as ReturnType<typeof fs.readdir> extends Promise<infer T> ? T : never);

      const updatedRow = {
        id: "bead-1",
        title: "Updated Title",
        description: "Desc",
        status: "in_progress",
        priority: 1,
        issue_type: "task",
        assignee: "user1",
        estimated_minutes: 120,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
        due_at: null,
        defer_until: null,
      };

      mockStatement.run.mockReturnValue({ changes: 1 });
      mockStatement.get.mockReturnValue(updatedRow);

      const result = await updateBead("team1", "bead-1", { title: "Updated Title", status: "in_progress" });

      expect(result.success).toBe(true);
      expect(result.bead?.title).toBe("Updated Title");
      expect(result.bead?.team).toBe("team1");
    });

    it("only allows specific fields to be updated", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: "team1", isDirectory: () => true },
      ] as unknown as ReturnType<typeof fs.readdir> extends Promise<infer T> ? T : never);

      mockStatement.run.mockReturnValue({ changes: 0 });

      const result = await updateBead("team1", "bead-1", {
        title: "Valid",
        id: "should-be-ignored",
        created_at: "should-be-ignored",
        description: "should-be-ignored",
      });

      // title is allowed, so it should proceed to update
      // but bead not found (changes: 0)
      expect(result.success).toBe(false);
      expect(result.error).toBe("Bead not found");
    });

    it("returns error if updated bead cannot be retrieved", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: "team1", isDirectory: () => true },
      ] as unknown as ReturnType<typeof fs.readdir> extends Promise<infer T> ? T : never);

      mockStatement.run.mockReturnValue({ changes: 1 }); // Update succeeded
      mockStatement.get.mockReturnValue(undefined); // Simulate failed retrieval

      const result = await updateBead("team1", "bead-1", { title: "New" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to retrieve updated bead");
    });
  });
});
