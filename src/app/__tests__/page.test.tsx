import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dashboard from "../page";

// Mock GanttChart to simplify testing
vi.mock("@/components/GanttChart", () => ({
  GanttChart: ({ beads, onUpdate }: { beads: unknown[]; onUpdate: (id: string, team: string, updates: Record<string, unknown>) => void }) => (
    <div data-testid="gantt-chart">
      <span data-testid="bead-count">{(beads as unknown[]).length} beads</span>
      <button onClick={() => onUpdate("id-1", "team-1", { status: "closed" })}>
        Update Bead
      </button>
    </div>
  ),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockTeams = [
  { id: "team-1", name: "Engineering" },
  { id: "team-2", name: "Design" },
];

const mockBeadsResponse = {
  beads: [
    {
      id: "bead-1",
      title: "Task 1",
      description: "Test",
      status: "open",
      priority: 1,
      issue_type: "task",
      assignee: "user1",
      estimated_minutes: 60,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      due_at: null,
      defer_until: null,
      team: "team-1",
    },
    {
      id: "bead-2",
      title: "Task 2",
      description: "Test",
      status: "in_progress",
      priority: 2,
      issue_type: "feature",
      assignee: "user2",
      estimated_minutes: 120,
      created_at: "2025-01-02T00:00:00Z",
      updated_at: "2025-01-02T00:00:00Z",
      due_at: null,
      defer_until: null,
      team: "team-2",
    },
  ],
  dependencies: [],
};

describe("Dashboard Page", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function setupMocks(options: { teamsError?: boolean; beadsError?: boolean } = {}) {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("team=_teams")) {
        if (options.teamsError) {
          return Promise.reject(new Error("Failed to fetch teams"));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTeams),
        });
      }
      if (options.beadsError) {
        return Promise.reject(new Error("Failed to fetch beads"));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockBeadsResponse),
      });
    });
  }

  describe("Initial Load", () => {
    it("shows loading state initially", async () => {
      setupMocks();
      render(<Dashboard />);
      expect(screen.getByText("Loading beads...")).toBeInTheDocument();
    });

    it("renders header with title", async () => {
      setupMocks();
      render(<Dashboard />);
      expect(screen.getByText("Beads Dashboard")).toBeInTheDocument();
    });

    it("loads and displays teams in tabs", async () => {
      setupMocks();
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText("Engineering")).toBeInTheDocument();
        expect(screen.getByText("Design")).toBeInTheDocument();
      });
    });

    it("renders All Teams tab as active by default", async () => {
      setupMocks();
      render(<Dashboard />);

      const allTeamsTab = screen.getByRole("button", { name: "All Teams" });
      expect(allTeamsTab).toHaveClass("active");
    });

    it("renders GanttChart after loading", async () => {
      setupMocks();
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId("gantt-chart")).toBeInTheDocument();
      });
    });

    it("passes beads to GanttChart", async () => {
      setupMocks();
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId("bead-count")).toHaveTextContent("2 beads");
      });
    });
  });

  describe("Team Selection", () => {
    it("switches active team tab on click", async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText("Engineering")).toBeInTheDocument();
      });

      const engineeringTab = screen.getByRole("button", { name: "Engineering" });
      await user.click(engineeringTab);

      expect(engineeringTab).toHaveClass("active");
      expect(screen.getByRole("button", { name: "All Teams" })).not.toHaveClass("active");
    });

    it("fetches team-specific beads when team is selected", async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText("Engineering")).toBeInTheDocument();
      });

      mockFetch.mockClear();
      const engineeringTab = screen.getByRole("button", { name: "Engineering" });
      await user.click(engineeringTab);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/beads?team=team-1", undefined);
      });
    });

    it("fetches all beads when All Teams is selected", async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText("Engineering")).toBeInTheDocument();
      });

      // First select a specific team
      await user.click(screen.getByRole("button", { name: "Engineering" }));

      mockFetch.mockClear();
      // Then go back to All Teams
      await user.click(screen.getByRole("button", { name: "All Teams" }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/beads", undefined);
      });
    });
  });

  describe("Error Handling", () => {
    // Use fake timers to speed up retry delays
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows error banner when teams fetch fails", async () => {
      setupMocks({ teamsError: true });
      render(<Dashboard />);

      // Fast-forward through retry delays and flush microtasks
      await act(async () => {
        await vi.advanceTimersByTimeAsync(7000);
      });

      expect(screen.getByText(/Failed to load teams/)).toBeInTheDocument();
    });

    it("shows error banner when beads fetch fails", async () => {
      setupMocks({ beadsError: true });
      render(<Dashboard />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(7000);
      });

      expect(screen.getByText(/Failed to load beads/)).toBeInTheDocument();
    });

    it("shows retry button in error banner", async () => {
      setupMocks({ beadsError: true });
      render(<Dashboard />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(7000);
      });

      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });

    // Skip: userEvent and fake timers have timing conflicts
    it.skip("dismisses error when dismiss button is clicked", async () => {
      setupMocks({ beadsError: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<Dashboard />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(7000);
      });

      expect(screen.getByText(/Failed to load beads/)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(screen.queryByText(/Failed to load beads/)).not.toBeInTheDocument();
    });

    // Skip: userEvent and fake timers have timing conflicts
    it.skip("retries fetch when retry button is clicked", async () => {
      setupMocks({ beadsError: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<Dashboard />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(7000);
      });

      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();

      // Now setup successful mock
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("team=_teams")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTeams),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBeadsResponse),
        });
      });

      await user.click(screen.getByRole("button", { name: "Retry" }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(screen.queryByText(/Failed to load beads/)).not.toBeInTheDocument();
      expect(screen.getByTestId("gantt-chart")).toBeInTheDocument();
    });
  });

  describe("Update Flow", () => {
    it("calls API when update is triggered", async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId("gantt-chart")).toBeInTheDocument();
      });

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              bead: { ...mockBeadsResponse.beads[0], status: "closed" },
            }),
        })
      );

      await user.click(screen.getByRole("button", { name: "Update Bead" }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/beads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: "id-1",
            team: "team-1",
            updates: { status: "closed" },
          }),
        });
      });
    });

    it("shows success toast on successful update", async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId("gantt-chart")).toBeInTheDocument();
      });

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              bead: { ...mockBeadsResponse.beads[0], status: "closed" },
            }),
        })
      );

      await user.click(screen.getByRole("button", { name: "Update Bead" }));

      await waitFor(() => {
        expect(screen.getByText("Task updated successfully")).toBeInTheDocument();
      });
    });

    it("shows error toast on failed update", async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId("gantt-chart")).toBeInTheDocument();
      });

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Update failed" }),
        })
      );

      await user.click(screen.getByRole("button", { name: "Update Bead" }));

      await waitFor(() => {
        expect(screen.getAllByText(/Update failed/).length).toBeGreaterThan(0);
      });
    });

    it("shows error on network failure", async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId("gantt-chart")).toBeInTheDocument();
      });

      mockFetch.mockImplementation(() =>
        Promise.reject(new Error("Network error"))
      );

      await user.click(screen.getByRole("button", { name: "Update Bead" }));

      await waitFor(() => {
        expect(screen.getAllByText(/Network error/).length).toBeGreaterThan(0);
      });
    });
  });
});
