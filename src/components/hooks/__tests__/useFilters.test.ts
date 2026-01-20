import { vi } from 'vitest';
import { renderHook, act } from "@testing-library/react";
import { useFilters } from "../useFilters";
import type { Bead } from "@/lib/types";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("useFilters", () => {
  const mockBeads: Bead[] = [
    {
      id: "1",
      title: "Task 1",
      description: "Description 1",
      status: "open",
      priority: 0,
      issue_type: "task",
      assignee: null,
      estimated_minutes: 60,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      due_at: "2024-01-10T00:00:00Z",
      defer_until: null,
      team: "eng",
    },
    {
      id: "2",
      title: "Feature 1",
      description: "Description 2",
      status: "in_progress",
      priority: 1,
      issue_type: "feature",
      assignee: "john",
      estimated_minutes: 120,
      created_at: "2024-01-02T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
      due_at: "2024-01-15T00:00:00Z",
      defer_until: null,
      team: "eng",
    },
    {
      id: "3",
      title: "Bug Fix",
      description: "Description 3",
      status: "closed",
      priority: 2,
      issue_type: "bug",
      assignee: "jane",
      estimated_minutes: 30,
      created_at: "2024-01-03T00:00:00Z",
      updated_at: "2024-01-03T00:00:00Z",
      due_at: "2024-01-05T00:00:00Z",
      defer_until: null,
      team: "pm",
    },
  ];

  describe("Initial State", () => {
    it("should initialize with default filter state", () => {
      const { result } = renderHook(() => useFilters());

      expect(result.current.filters).toEqual({
        search: "",
        status: [],
        priority: [],
        issueType: [],
        dueDate: { preset: "all" },
      });
    });

    it("should have activeFilterCount of 0 initially", () => {
      const { result } = renderHook(() => useFilters());

      expect(result.current.activeFilterCount).toBe(0);
    });
  });

  describe("Filter Setters", () => {
    it("should update search filter", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setSearch("test query");
      });

      expect(result.current.filters.search).toBe("test query");
    });

    it("should update status filter", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setStatus(["open", "in_progress"]);
      });

      expect(result.current.filters.status).toEqual(["open", "in_progress"]);
    });

    it("should update priority filter", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setPriority([0, 1]);
      });

      expect(result.current.filters.priority).toEqual([0, 1]);
    });

    it("should update issueType filter", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setIssueType(["task", "bug"]);
      });

      expect(result.current.filters.issueType).toEqual(["task", "bug"]);
    });

    it("should update dueDate filter", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setDueDate({ preset: "this_week" });
      });

      expect(result.current.filters.dueDate).toEqual({ preset: "this_week" });
    });
  });

  describe("Active Filter Count", () => {
    it("should count status filters", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setStatus(["open", "in_progress"]);
      });

      expect(result.current.activeFilterCount).toBe(2);
    });

    it("should count priority filters", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setPriority([0, 1, 2]);
      });

      expect(result.current.activeFilterCount).toBe(3);
    });

    it("should count due date filter when not 'all'", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setDueDate({ preset: "this_week" });
      });

      expect(result.current.activeFilterCount).toBe(1);
    });

    it("should not count search in active filter count", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setSearch("test");
      });

      expect(result.current.activeFilterCount).toBe(0);
    });

    it("should sum multiple filter types", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setStatus(["open"]);
        result.current.setPriority([0, 1]);
        result.current.setIssueType(["task"]);
        result.current.setDueDate({ preset: "this_week" });
      });

      expect(result.current.activeFilterCount).toBe(5);
    });
  });

  describe("Clear Filters", () => {
    it("should clear all filters", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setSearch("test");
        result.current.setStatus(["open"]);
        result.current.setPriority([0]);
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({
        search: "",
        status: [],
        priority: [],
        issueType: [],
        dueDate: { preset: "all" },
      });
    });

    it("should clear individual filter types", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setStatus(["open"]);
        result.current.setPriority([0]);
        result.current.clearFilter("status");
      });

      expect(result.current.filters.status).toEqual([]);
      expect(result.current.filters.priority).toEqual([0]);
    });
  });

  describe("Apply Filters", () => {
    it("should filter by search query", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setSearch("bug");
      });

      const filtered = result.current.applyFilters(mockBeads);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe("Bug Fix");
    });

    it("should filter by status", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setStatus(["open", "in_progress"]);
      });

      const filtered = result.current.applyFilters(mockBeads);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((b) => b.status)).toEqual([
        "open",
        "in_progress",
      ]);
    });

    it("should filter by priority", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setPriority([0, 1]);
      });

      const filtered = result.current.applyFilters(mockBeads);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((b) => b.priority)).toEqual([0, 1]);
    });

    it("should filter by issue type", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setIssueType(["task", "bug"]);
      });

      const filtered = result.current.applyFilters(mockBeads);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((b) => b.issue_type)).toEqual(["task", "bug"]);
    });

    it("should apply multiple filters with AND logic", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setStatus(["open"]);
        result.current.setIssueType(["task"]);
      });

      const filtered = result.current.applyFilters(mockBeads);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("1");
    });

    it("should return all beads when no filters applied", () => {
      const { result } = renderHook(() => useFilters());

      const filtered = result.current.applyFilters(mockBeads);

      expect(filtered).toHaveLength(3);
    });

    it("should return empty array when no beads match filters", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setStatus(["blocked"]);
      });

      const filtered = result.current.applyFilters(mockBeads);

      expect(filtered).toHaveLength(0);
    });

    it("should be case-insensitive for search", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setSearch("BUG");
      });

      const filtered = result.current.applyFilters(mockBeads);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe("Bug Fix");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty beads array", () => {
      const { result } = renderHook(() => useFilters());

      const filtered = result.current.applyFilters([]);

      expect(filtered).toEqual([]);
    });

    it("should handle beads without due_at for date filters", () => {
      const beadsWithoutDue: Bead[] = [
        {
          ...mockBeads[0],
          due_at: null,
        },
      ];

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setDueDate({ preset: "this_week" });
      });

      const filtered = result.current.applyFilters(beadsWithoutDue);

      expect(filtered).toHaveLength(0);
    });

    it("should trim whitespace from search query", () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setSearch("  ");
      });

      const filtered = result.current.applyFilters(mockBeads);

      // Empty/whitespace search should match all
      expect(filtered).toHaveLength(3);
    });
  });
});
