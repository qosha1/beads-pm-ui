import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "../route";

// Mock the db module
vi.mock("@/lib/db", () => ({
  getTeams: vi.fn(),
  getAllBeads: vi.fn(),
  updateBead: vi.fn(),
}));

import { getTeams, getAllBeads, updateBead } from "@/lib/db";

const mockTeams = [
  { id: "team1", name: "TEAM1", path: "/path/to/team1" },
  { id: "team2", name: "TEAM2", path: "/path/to/team2" },
];

const mockBeads = [
  {
    id: "bead-1",
    title: "Task 1",
    description: "Description 1",
    status: "open" as const,
    priority: 1,
    issue_type: "task",
    assignee: "user1",
    estimated_minutes: 60,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    due_at: null,
    defer_until: null,
    team: "team1",
  },
  {
    id: "bead-2",
    title: "Task 2",
    description: "Description 2",
    status: "in_progress" as const,
    priority: 2,
    issue_type: "feature",
    assignee: "user2",
    estimated_minutes: 120,
    created_at: "2025-01-02T00:00:00Z",
    updated_at: "2025-01-02T00:00:00Z",
    due_at: null,
    defer_until: null,
    team: "team2",
  },
];

const mockDependencies = [
  { issue_id: "bead-1", depends_on_id: "bead-2", type: "blocks" },
];

describe("API Route: /api/beads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTeams).mockResolvedValue(mockTeams);
    vi.mocked(getAllBeads).mockResolvedValue({ beads: mockBeads, dependencies: mockDependencies });
  });

  describe("GET", () => {
    it("returns teams when team=_teams", async () => {
      const request = new NextRequest("http://localhost/api/beads?team=_teams");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockTeams);
      expect(getTeams).toHaveBeenCalledTimes(1);
    });

    it("sets cache headers for teams response", async () => {
      const request = new NextRequest("http://localhost/api/beads?team=_teams");
      const response = await GET(request);

      expect(response.headers.get("Cache-Control")).toBe("private, max-age=300, stale-while-revalidate=60");
    });

    it("returns all beads and dependencies when no team filter", async () => {
      const request = new NextRequest("http://localhost/api/beads");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.beads).toHaveLength(2);
      expect(data.dependencies).toHaveLength(1);
      expect(getAllBeads).toHaveBeenCalledTimes(1);
    });

    it("returns filtered beads when team is specified", async () => {
      const request = new NextRequest("http://localhost/api/beads?team=team1");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.beads).toHaveLength(1);
      expect(data.beads[0].team).toBe("team1");
    });

    it("returns empty beads array for non-existent team", async () => {
      const request = new NextRequest("http://localhost/api/beads?team=nonexistent");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.beads).toHaveLength(0);
    });

    it("sets cache headers for beads response", async () => {
      const request = new NextRequest("http://localhost/api/beads");
      const response = await GET(request);

      expect(response.headers.get("Cache-Control")).toBe("private, max-age=60, stale-while-revalidate=30");
    });
  });

  describe("PATCH", () => {
    it("successfully updates a bead", async () => {
      const updatedBead = { ...mockBeads[0], title: "Updated Title" };
      vi.mocked(updateBead).mockResolvedValue({ success: true, bead: updatedBead });

      const request = new NextRequest("http://localhost/api/beads", {
        method: "PATCH",
        body: JSON.stringify({
          id: "bead-1",
          team: "team1",
          updates: { title: "Updated Title" },
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.bead.title).toBe("Updated Title");
      expect(updateBead).toHaveBeenCalledWith("team1", "bead-1", { title: "Updated Title" });
    });

    it("returns 400 for missing id", async () => {
      const request = new NextRequest("http://localhost/api/beads", {
        method: "PATCH",
        body: JSON.stringify({
          team: "team1",
          updates: { title: "Test" },
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("returns 400 for missing team", async () => {
      const request = new NextRequest("http://localhost/api/beads", {
        method: "PATCH",
        body: JSON.stringify({
          id: "bead-1",
          updates: { title: "Test" },
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("returns 400 for empty updates", async () => {
      const request = new NextRequest("http://localhost/api/beads", {
        method: "PATCH",
        body: JSON.stringify({
          id: "bead-1",
          team: "team1",
          updates: {},
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("returns 400 for invalid status value", async () => {
      const request = new NextRequest("http://localhost/api/beads", {
        method: "PATCH",
        body: JSON.stringify({
          id: "bead-1",
          team: "team1",
          updates: { status: "invalid_status" },
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("returns 400 for invalid priority value", async () => {
      const request = new NextRequest("http://localhost/api/beads", {
        method: "PATCH",
        body: JSON.stringify({
          id: "bead-1",
          team: "team1",
          updates: { priority: -1 },
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("returns 404 when team not found", async () => {
      vi.mocked(updateBead).mockResolvedValue({ success: false, error: "Team not found" });

      const request = new NextRequest("http://localhost/api/beads", {
        method: "PATCH",
        body: JSON.stringify({
          id: "bead-1",
          team: "nonexistent",
          updates: { title: "Test" },
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Team not found");
    });

    it("returns 404 when bead not found", async () => {
      vi.mocked(updateBead).mockResolvedValue({ success: false, error: "Bead not found" });

      const request = new NextRequest("http://localhost/api/beads", {
        method: "PATCH",
        body: JSON.stringify({
          id: "nonexistent",
          team: "team1",
          updates: { title: "Test" },
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Bead not found");
    });

    it("returns 400 for other update errors", async () => {
      vi.mocked(updateBead).mockResolvedValue({ success: false, error: "Some other error" });

      const request = new NextRequest("http://localhost/api/beads", {
        method: "PATCH",
        body: JSON.stringify({
          id: "bead-1",
          team: "team1",
          updates: { title: "Test" },
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Some other error");
    });

    it("returns 400 for invalid JSON", async () => {
      const request = new NextRequest("http://localhost/api/beads", {
        method: "PATCH",
        body: "invalid json",
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid JSON in request body");
    });

    it("returns 500 for unexpected errors", async () => {
      vi.mocked(updateBead).mockRejectedValue(new Error("Database connection failed"));

      const request = new NextRequest("http://localhost/api/beads", {
        method: "PATCH",
        body: JSON.stringify({
          id: "bead-1",
          team: "team1",
          updates: { title: "Test" },
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database connection failed");
    });

    it("accepts valid status values", async () => {
      const statuses = ["open", "in_progress", "closed", "blocked", "deferred"] as const;

      for (const status of statuses) {
        vi.mocked(updateBead).mockResolvedValue({
          success: true,
          bead: { ...mockBeads[0], status },
        });

        const request = new NextRequest("http://localhost/api/beads", {
          method: "PATCH",
          body: JSON.stringify({
            id: "bead-1",
            team: "team1",
            updates: { status },
          }),
        });

        const response = await PATCH(request);
        expect(response.status).toBe(200);
      }
    });

    it("accepts priority values 0-10", async () => {
      for (const priority of [0, 5, 10]) {
        vi.mocked(updateBead).mockResolvedValue({
          success: true,
          bead: { ...mockBeads[0], priority },
        });

        const request = new NextRequest("http://localhost/api/beads", {
          method: "PATCH",
          body: JSON.stringify({
            id: "bead-1",
            team: "team1",
            updates: { priority },
          }),
        });

        const response = await PATCH(request);
        expect(response.status).toBe(200);
      }
    });

    it("accepts null values for nullable fields", async () => {
      vi.mocked(updateBead).mockResolvedValue({
        success: true,
        bead: { ...mockBeads[0], assignee: null, due_at: null, estimated_minutes: null },
      });

      const request = new NextRequest("http://localhost/api/beads", {
        method: "PATCH",
        body: JSON.stringify({
          id: "bead-1",
          team: "team1",
          updates: {
            assignee: null,
            due_at: null,
            estimated_minutes: null,
          },
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bead.assignee).toBeNull();
    });
  });
});
