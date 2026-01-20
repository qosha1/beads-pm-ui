import { describe, it, expect } from "vitest";
import {
  parseBeadPrefix,
  HierarchyLevel,
  compareBeads,
  sortTasksByHierarchy,
  sortBeadsByHierarchy,
  getHierarchyLevel,
  canBeParentOf,
  filterHierarchicalDependencies,
  type SortableBead,
  type GanttTaskLike,
} from "../sorting";
import type { Bead, Dependency } from "../types";

// Helper to create a mock bead
function createBead(overrides: Partial<Bead> = {}): Bead {
  return {
    id: "test-id",
    title: "Test Bead",
    description: "",
    status: "open",
    priority: 2,
    issue_type: "task",
    assignee: null,
    estimated_minutes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    due_at: null,
    defer_until: null,
    team: "eng",
    ...overrides,
  };
}

// Helper to create a GanttTaskLike
interface CreateTaskOverrides extends Omit<Partial<GanttTaskLike>, "bead"> {
  bead?: Partial<Bead>;
}

function createTask(overrides: CreateTaskOverrides = {}): GanttTaskLike {
  const { bead: beadOverrides, ...taskOverrides } = overrides;
  return {
    bead: createBead(beadOverrides),
    start: new Date("2026-01-01"),
    end: new Date("2026-01-31"),
    progress: 0,
    timeProgress: 0,
    depth: 0,
    hasChildren: false,
    parentId: null,
    ...taskOverrides,
  };
}

describe("parseBeadPrefix", () => {
  describe("Multi-year patterns", () => {
    it("should parse [1YR] as MULTI_YEAR level", () => {
      const result = parseBeadPrefix("[1YR] Annual Plan");
      expect(result.raw).toBe("1YR");
      expect(result.level).toBe(HierarchyLevel.MULTI_YEAR);
      expect(result.years).toBe(1);
      expect(result.periodSortKey).toBe(-1);
    });

    it("should parse [3YR] as MULTI_YEAR level with larger spans first", () => {
      const result = parseBeadPrefix("[3YR] Three Year Plan");
      expect(result.raw).toBe("3YR");
      expect(result.level).toBe(HierarchyLevel.MULTI_YEAR);
      expect(result.years).toBe(3);
      expect(result.periodSortKey).toBe(-3); // Larger spans get more negative = sorted first
    });

    it("should parse [5YR] as MULTI_YEAR level", () => {
      const result = parseBeadPrefix("[5YR] Five Year Vision");
      expect(result.raw).toBe("5YR");
      expect(result.level).toBe(HierarchyLevel.MULTI_YEAR);
      expect(result.years).toBe(5);
      expect(result.periodSortKey).toBe(-5);
    });

    it("should handle lowercase [3yr]", () => {
      const result = parseBeadPrefix("[3yr] Lowercase");
      expect(result.level).toBe(HierarchyLevel.MULTI_YEAR);
      expect(result.years).toBe(3);
    });
  });

  describe("Half-year patterns", () => {
    it("should parse [H1] as HALF_YEAR level", () => {
      const result = parseBeadPrefix("[H1] First Half");
      expect(result.raw).toBe("H1");
      expect(result.level).toBe(HierarchyLevel.HALF_YEAR);
      expect(result.periodSortKey).toBe(1);
    });

    it("should parse [H2] as HALF_YEAR level", () => {
      const result = parseBeadPrefix("[H2] Second Half");
      expect(result.raw).toBe("H2");
      expect(result.level).toBe(HierarchyLevel.HALF_YEAR);
      expect(result.periodSortKey).toBe(2);
    });

    it("should handle lowercase [h1]", () => {
      const result = parseBeadPrefix("[h1] Lowercase");
      expect(result.level).toBe(HierarchyLevel.HALF_YEAR);
      expect(result.periodSortKey).toBe(1);
    });
  });

  describe("Quarter patterns", () => {
    it("should parse [Q1] through [Q4]", () => {
      const q1 = parseBeadPrefix("[Q1] Q1 Goals");
      const q2 = parseBeadPrefix("[Q2] Q2 Goals");
      const q3 = parseBeadPrefix("[Q3] Q3 Goals");
      const q4 = parseBeadPrefix("[Q4] Q4 Goals");

      expect(q1.level).toBe(HierarchyLevel.QUARTERLY);
      expect(q2.level).toBe(HierarchyLevel.QUARTERLY);
      expect(q3.level).toBe(HierarchyLevel.QUARTERLY);
      expect(q4.level).toBe(HierarchyLevel.QUARTERLY);

      expect(q1.periodSortKey).toBe(1);
      expect(q2.periodSortKey).toBe(2);
      expect(q3.periodSortKey).toBe(3);
      expect(q4.periodSortKey).toBe(4);
    });

    it("should handle lowercase [q1]", () => {
      const result = parseBeadPrefix("[q1] Lowercase");
      expect(result.level).toBe(HierarchyLevel.QUARTERLY);
      expect(result.periodSortKey).toBe(1);
    });
  });

  describe("Month patterns", () => {
    it("should parse all month abbreviations", () => {
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      months.forEach((month, index) => {
        const result = parseBeadPrefix(`[${month}] ${month} Tasks`);
        expect(result.level).toBe(HierarchyLevel.MONTHLY);
        expect(result.periodSortKey).toBe(index); // 0-indexed
      });
    });

    it("should handle lowercase [jan]", () => {
      const result = parseBeadPrefix("[jan] Lowercase January");
      expect(result.level).toBe(HierarchyLevel.MONTHLY);
      expect(result.periodSortKey).toBe(0);
    });
  });

  describe("Week patterns", () => {
    it("should parse [W1] as WEEKLY level", () => {
      const result = parseBeadPrefix("[W1] Week 1");
      expect(result.raw).toBe("W1");
      expect(result.level).toBe(HierarchyLevel.WEEKLY);
      expect(result.periodSortKey).toBe(1);
    });

    it("should parse [W52] as WEEKLY level", () => {
      const result = parseBeadPrefix("[W52] Week 52");
      expect(result.raw).toBe("W52");
      expect(result.level).toBe(HierarchyLevel.WEEKLY);
      expect(result.periodSortKey).toBe(52);
    });

    it("should handle lowercase [w10]", () => {
      const result = parseBeadPrefix("[w10] Lowercase Week");
      expect(result.level).toBe(HierarchyLevel.WEEKLY);
      expect(result.periodSortKey).toBe(10);
    });
  });

  describe("Invalid prefixes", () => {
    it("should return TASK level for [Q0] (invalid quarter)", () => {
      const result = parseBeadPrefix("[Q0] Invalid Quarter Zero");
      expect(result.raw).toBe("Q0");
      expect(result.level).toBe(HierarchyLevel.TASK);
      expect(result.periodSortKey).toBe(0);
    });

    it("should return TASK level for [Q5] (invalid quarter)", () => {
      const result = parseBeadPrefix("[Q5] Invalid Quarter Five");
      expect(result.raw).toBe("Q5");
      expect(result.level).toBe(HierarchyLevel.TASK);
      expect(result.periodSortKey).toBe(0);
    });

    it("should return TASK level for [H0] (invalid half)", () => {
      const result = parseBeadPrefix("[H0] Invalid Half Zero");
      expect(result.raw).toBe("H0");
      expect(result.level).toBe(HierarchyLevel.TASK);
      expect(result.periodSortKey).toBe(0);
    });

    it("should return TASK level for [H3] (invalid half)", () => {
      const result = parseBeadPrefix("[H3] Invalid Half Three");
      expect(result.raw).toBe("H3");
      expect(result.level).toBe(HierarchyLevel.TASK);
      expect(result.periodSortKey).toBe(0);
    });

    it("should still parse [W0] as WEEKLY (no validation on week range)", () => {
      // Note: The regex W\d+ allows any number, so W0 and W53 are parsed as WEEKLY
      // This is by design - the code doesn't enforce ISO week number boundaries
      const result = parseBeadPrefix("[W0] Week Zero");
      expect(result.raw).toBe("W0");
      expect(result.level).toBe(HierarchyLevel.WEEKLY);
      expect(result.periodSortKey).toBe(0);
    });

    it("should still parse [W53] as WEEKLY (no validation on week range)", () => {
      // W53 is technically valid in some years (ISO weeks)
      const result = parseBeadPrefix("[W53] Week 53");
      expect(result.raw).toBe("W53");
      expect(result.level).toBe(HierarchyLevel.WEEKLY);
      expect(result.periodSortKey).toBe(53);
    });
  });

  describe("No prefix / unknown patterns", () => {
    it("should return TASK level for no prefix", () => {
      const result = parseBeadPrefix("Plain task title");
      expect(result.raw).toBeNull();
      expect(result.level).toBe(HierarchyLevel.TASK);
      expect(result.periodSortKey).toBe(0);
    });

    it("should return TASK level for unknown prefix", () => {
      const result = parseBeadPrefix("[UNKNOWN] Unknown prefix");
      expect(result.raw).toBe("UNKNOWN");
      expect(result.level).toBe(HierarchyLevel.TASK);
      expect(result.periodSortKey).toBe(0);
    });

    it("should return TASK level for empty string", () => {
      const result = parseBeadPrefix("");
      expect(result.raw).toBeNull();
      expect(result.level).toBe(HierarchyLevel.TASK);
    });

    it("should not match brackets in middle of title", () => {
      const result = parseBeadPrefix("Title [Q1] in middle");
      expect(result.raw).toBeNull();
      expect(result.level).toBe(HierarchyLevel.TASK);
    });

    it("should not match empty brackets", () => {
      const result = parseBeadPrefix("[] Empty brackets");
      expect(result.raw).toBeNull(); // Empty brackets don't match the pattern
      expect(result.level).toBe(HierarchyLevel.TASK);
    });

    it("should not match brackets at end of title", () => {
      const result = parseBeadPrefix("Title at end [Q1]");
      expect(result.raw).toBeNull();
      expect(result.level).toBe(HierarchyLevel.TASK);
    });
  });
});

describe("compareBeads", () => {
  it("should sort by hierarchy level first (broader scope first)", () => {
    const yearBead: SortableBead = {
      bead: createBead({ title: "[1YR] Annual" }),
      prefix: parseBeadPrefix("[1YR] Annual"),
      startDate: new Date("2026-06-01"),
      createdAt: new Date("2026-01-01"),
    };
    const quarterBead: SortableBead = {
      bead: createBead({ title: "[Q1] Quarter" }),
      prefix: parseBeadPrefix("[Q1] Quarter"),
      startDate: new Date("2026-01-01"),
      createdAt: new Date("2026-01-01"),
    };

    expect(compareBeads(yearBead, quarterBead)).toBeLessThan(0);
    expect(compareBeads(quarterBead, yearBead)).toBeGreaterThan(0);
  });

  it("should sort by period sort key within same hierarchy level", () => {
    const q1: SortableBead = {
      bead: createBead({ title: "[Q1] Q1" }),
      prefix: parseBeadPrefix("[Q1] Q1"),
      startDate: new Date("2026-01-01"),
      createdAt: new Date("2026-01-01"),
    };
    const q3: SortableBead = {
      bead: createBead({ title: "[Q3] Q3" }),
      prefix: parseBeadPrefix("[Q3] Q3"),
      startDate: new Date("2026-07-01"),
      createdAt: new Date("2026-01-01"),
    };

    expect(compareBeads(q1, q3)).toBeLessThan(0);
    expect(compareBeads(q3, q1)).toBeGreaterThan(0);
  });

  it("should sort by start date when hierarchy and period are equal", () => {
    const early: SortableBead = {
      bead: createBead({ title: "[Q1] Early" }),
      prefix: parseBeadPrefix("[Q1] Early"),
      startDate: new Date("2026-01-05"),
      createdAt: new Date("2026-01-01"),
    };
    const late: SortableBead = {
      bead: createBead({ title: "[Q1] Late" }),
      prefix: parseBeadPrefix("[Q1] Late"),
      startDate: new Date("2026-01-15"),
      createdAt: new Date("2026-01-01"),
    };

    expect(compareBeads(early, late)).toBeLessThan(0);
    expect(compareBeads(late, early)).toBeGreaterThan(0);
  });

  it("should sort by created_at when all else is equal", () => {
    const older: SortableBead = {
      bead: createBead({ title: "Task A" }),
      prefix: parseBeadPrefix("Task A"),
      startDate: new Date("2026-01-01"),
      createdAt: new Date("2025-12-01"),
    };
    const newer: SortableBead = {
      bead: createBead({ title: "Task B" }),
      prefix: parseBeadPrefix("Task B"),
      startDate: new Date("2026-01-01"),
      createdAt: new Date("2026-01-15"),
    };

    expect(compareBeads(older, newer)).toBeLessThan(0);
    expect(compareBeads(newer, older)).toBeGreaterThan(0);
  });

  it("should return 0 for equal beads", () => {
    const bead: SortableBead = {
      bead: createBead({ title: "Task" }),
      prefix: parseBeadPrefix("Task"),
      startDate: new Date("2026-01-01"),
      createdAt: new Date("2026-01-01"),
    };

    expect(compareBeads(bead, bead)).toBe(0);
  });
});

describe("sortTasksByHierarchy", () => {
  it("should sort tasks with broader scope items first", () => {
    const tasks: GanttTaskLike[] = [
      createTask({ bead: { title: "[JAN] January" }, start: new Date("2026-01-01") }),
      createTask({ bead: { title: "[Q1] Quarter" }, start: new Date("2026-01-01") }),
      createTask({ bead: { title: "[1YR] Annual" }, start: new Date("2026-01-01") }),
      createTask({ bead: { title: "Plain Task" }, start: new Date("2026-01-01") }),
    ];

    const sorted = sortTasksByHierarchy(tasks);

    expect(sorted[0].bead.title).toBe("[1YR] Annual");
    expect(sorted[1].bead.title).toBe("[Q1] Quarter");
    expect(sorted[2].bead.title).toBe("[JAN] January");
    expect(sorted[3].bead.title).toBe("Plain Task");
  });

  it("should sort quarters chronologically", () => {
    const tasks: GanttTaskLike[] = [
      createTask({ bead: { title: "[Q3] Q3 Goals" }, start: new Date("2026-07-01") }),
      createTask({ bead: { title: "[Q1] Q1 Goals" }, start: new Date("2026-01-01") }),
      createTask({ bead: { title: "[Q4] Q4 Goals" }, start: new Date("2026-10-01") }),
      createTask({ bead: { title: "[Q2] Q2 Goals" }, start: new Date("2026-04-01") }),
    ];

    const sorted = sortTasksByHierarchy(tasks);

    expect(sorted[0].bead.title).toBe("[Q1] Q1 Goals");
    expect(sorted[1].bead.title).toBe("[Q2] Q2 Goals");
    expect(sorted[2].bead.title).toBe("[Q3] Q3 Goals");
    expect(sorted[3].bead.title).toBe("[Q4] Q4 Goals");
  });

  it("should sort months chronologically", () => {
    const tasks: GanttTaskLike[] = [
      createTask({ bead: { title: "[MAR] March" }, start: new Date("2026-03-01") }),
      createTask({ bead: { title: "[JAN] January" }, start: new Date("2026-01-01") }),
      createTask({ bead: { title: "[FEB] February" }, start: new Date("2026-02-01") }),
    ];

    const sorted = sortTasksByHierarchy(tasks);

    expect(sorted[0].bead.title).toBe("[JAN] January");
    expect(sorted[1].bead.title).toBe("[FEB] February");
    expect(sorted[2].bead.title).toBe("[MAR] March");
  });

  it("should support descending sort", () => {
    const tasks: GanttTaskLike[] = [
      createTask({ bead: { title: "[Q1] Q1" }, start: new Date("2026-01-01") }),
      createTask({ bead: { title: "[Q3] Q3" }, start: new Date("2026-07-01") }),
    ];

    const sorted = sortTasksByHierarchy(tasks, { descending: true });

    expect(sorted[0].bead.title).toBe("[Q3] Q3");
    expect(sorted[1].bead.title).toBe("[Q1] Q1");
  });

  it("should not modify the original array", () => {
    const tasks: GanttTaskLike[] = [
      createTask({ bead: { title: "[Q3] Q3" } }),
      createTask({ bead: { title: "[Q1] Q1" } }),
    ];
    const originalFirst = tasks[0];

    sortTasksByHierarchy(tasks);

    expect(tasks[0]).toBe(originalFirst);
  });
});

describe("sortBeadsByHierarchy", () => {
  it("should sort beads with broader scope items first", () => {
    const beads: Bead[] = [
      createBead({ id: "1", title: "[JAN] January" }),
      createBead({ id: "2", title: "[Q1] Quarter" }),
      createBead({ id: "3", title: "[1YR] Annual" }),
    ];

    const sorted = sortBeadsByHierarchy(beads);

    expect(sorted[0].title).toBe("[1YR] Annual");
    expect(sorted[1].title).toBe("[Q1] Quarter");
    expect(sorted[2].title).toBe("[JAN] January");
  });

  it("should accept custom getStartDate function", () => {
    const beads: Bead[] = [
      createBead({ id: "1", title: "Task A", due_at: "2026-03-01" }),
      createBead({ id: "2", title: "Task B", due_at: "2026-01-01" }),
    ];

    const sorted = sortBeadsByHierarchy(beads, (bead) =>
      bead.due_at ? new Date(bead.due_at) : new Date(bead.created_at)
    );

    expect(sorted[0].id).toBe("2"); // Earlier due date
    expect(sorted[1].id).toBe("1");
  });
});

describe("getHierarchyLevel", () => {
  it("should return correct hierarchy levels", () => {
    expect(getHierarchyLevel("[1YR] Annual")).toBe(HierarchyLevel.MULTI_YEAR);
    expect(getHierarchyLevel("[H1] First Half")).toBe(HierarchyLevel.HALF_YEAR);
    expect(getHierarchyLevel("[Q1] Quarter")).toBe(HierarchyLevel.QUARTERLY);
    expect(getHierarchyLevel("[JAN] January")).toBe(HierarchyLevel.MONTHLY);
    expect(getHierarchyLevel("[W1] Week")).toBe(HierarchyLevel.WEEKLY);
    expect(getHierarchyLevel("Plain task")).toBe(HierarchyLevel.TASK);
  });
});

describe("canBeParentOf", () => {
  describe("valid parent-child relationships (broader can parent narrower)", () => {
    it("should allow MULTI_YEAR to be parent of HALF_YEAR", () => {
      expect(canBeParentOf("[1YR] Annual", "[H1] First Half")).toBe(true);
      expect(canBeParentOf("[3YR] Three Year", "[H2] Second Half")).toBe(true);
    });

    it("should allow MULTI_YEAR to be parent of QUARTERLY", () => {
      expect(canBeParentOf("[1YR] Annual", "[Q1] Quarter")).toBe(true);
      expect(canBeParentOf("[5YR] Five Year", "[Q4] Q4")).toBe(true);
    });

    it("should allow MULTI_YEAR to be parent of MONTHLY", () => {
      expect(canBeParentOf("[1YR] Annual", "[JAN] January")).toBe(true);
      expect(canBeParentOf("[3YR] Strategic", "[DEC] December")).toBe(true);
    });

    it("should allow MULTI_YEAR to be parent of WEEKLY", () => {
      expect(canBeParentOf("[1YR] Annual", "[W1] Week 1")).toBe(true);
    });

    it("should allow MULTI_YEAR to be parent of TASK", () => {
      expect(canBeParentOf("[1YR] Annual", "Plain task")).toBe(true);
    });

    it("should allow HALF_YEAR to be parent of QUARTERLY", () => {
      expect(canBeParentOf("[H1] First Half", "[Q1] Quarter 1")).toBe(true);
      expect(canBeParentOf("[H2] Second Half", "[Q3] Quarter 3")).toBe(true);
    });

    it("should allow HALF_YEAR to be parent of MONTHLY", () => {
      expect(canBeParentOf("[H1] First Half", "[JAN] January")).toBe(true);
    });

    it("should allow HALF_YEAR to be parent of WEEKLY", () => {
      expect(canBeParentOf("[H1] First Half", "[W1] Week")).toBe(true);
    });

    it("should allow HALF_YEAR to be parent of TASK", () => {
      expect(canBeParentOf("[H1] First Half", "Plain task")).toBe(true);
    });

    it("should allow QUARTERLY to be parent of MONTHLY", () => {
      expect(canBeParentOf("[Q1] Quarter", "[JAN] January")).toBe(true);
      expect(canBeParentOf("[Q4] Q4", "[DEC] December")).toBe(true);
    });

    it("should allow QUARTERLY to be parent of WEEKLY", () => {
      expect(canBeParentOf("[Q1] Quarter", "[W1] Week")).toBe(true);
    });

    it("should allow QUARTERLY to be parent of TASK", () => {
      expect(canBeParentOf("[Q1] Quarter", "Plain task")).toBe(true);
    });

    it("should allow MONTHLY to be parent of WEEKLY", () => {
      expect(canBeParentOf("[JAN] January", "[W1] Week")).toBe(true);
      expect(canBeParentOf("[DEC] December", "[W52] Week")).toBe(true);
    });

    it("should allow MONTHLY to be parent of TASK", () => {
      expect(canBeParentOf("[JAN] January", "Plain task")).toBe(true);
    });

    it("should allow WEEKLY to be parent of TASK", () => {
      expect(canBeParentOf("[W1] Week", "Plain task")).toBe(true);
      expect(canBeParentOf("[W52] Week 52", "Another task")).toBe(true);
    });
  });

  describe("invalid parent-child relationships (same level)", () => {
    it("should not allow MULTI_YEAR to be parent of MULTI_YEAR", () => {
      expect(canBeParentOf("[1YR] One Year", "[3YR] Three Year")).toBe(false);
      expect(canBeParentOf("[5YR] Five Year", "[1YR] One Year")).toBe(false);
    });

    it("should not allow HALF_YEAR to be parent of HALF_YEAR", () => {
      expect(canBeParentOf("[H1] First Half", "[H2] Second Half")).toBe(false);
    });

    it("should not allow same quarter to be parent of another quarter", () => {
      expect(canBeParentOf("[Q1] Quarter 1", "[Q2] Quarter 2")).toBe(false);
      expect(canBeParentOf("[Q3] Q3", "[Q4] Q4")).toBe(false);
    });

    it("should not allow same month to be parent of another month", () => {
      expect(canBeParentOf("[JAN] January", "[FEB] February")).toBe(false);
    });

    it("should not allow same week to be parent of another week", () => {
      expect(canBeParentOf("[W1] Week 1", "[W2] Week 2")).toBe(false);
    });

    it("should not allow TASK to be parent of TASK", () => {
      expect(canBeParentOf("Plain task", "Another task")).toBe(false);
    });
  });

  describe("invalid parent-child relationships (narrower cannot parent broader)", () => {
    it("should not allow QUARTERLY to be parent of MULTI_YEAR (annual)", () => {
      expect(canBeParentOf("[Q1] Quarter", "[1YR] Annual")).toBe(false);
      expect(canBeParentOf("[Q4] Q4", "[3YR] Three Year")).toBe(false);
    });

    it("should not allow QUARTERLY to be parent of HALF_YEAR", () => {
      expect(canBeParentOf("[Q1] Quarter", "[H1] First Half")).toBe(false);
    });

    it("should not allow MONTHLY to be parent of QUARTERLY", () => {
      expect(canBeParentOf("[JAN] January", "[Q1] Quarter")).toBe(false);
    });

    it("should not allow MONTHLY to be parent of HALF_YEAR", () => {
      expect(canBeParentOf("[JAN] January", "[H1] First Half")).toBe(false);
    });

    it("should not allow MONTHLY to be parent of MULTI_YEAR", () => {
      expect(canBeParentOf("[JAN] January", "[1YR] Annual")).toBe(false);
    });

    it("should not allow WEEKLY to be parent of MONTHLY", () => {
      expect(canBeParentOf("[W1] Week", "[JAN] January")).toBe(false);
    });

    it("should not allow WEEKLY to be parent of QUARTERLY", () => {
      expect(canBeParentOf("[W1] Week", "[Q1] Quarter")).toBe(false);
    });

    it("should not allow WEEKLY to be parent of MULTI_YEAR", () => {
      expect(canBeParentOf("[W1] Week", "[1YR] Annual")).toBe(false);
    });

    it("should not allow TASK to be parent of any hierarchy level", () => {
      expect(canBeParentOf("Plain task", "[W1] Week")).toBe(false);
      expect(canBeParentOf("Plain task", "[JAN] January")).toBe(false);
      expect(canBeParentOf("Plain task", "[Q1] Quarter")).toBe(false);
      expect(canBeParentOf("Plain task", "[H1] Half")).toBe(false);
      expect(canBeParentOf("Plain task", "[1YR] Annual")).toBe(false);
    });
  });
});

describe("filterHierarchicalDependencies", () => {
  it("should filter to only hierarchical dependencies", () => {
    const beads: Bead[] = [
      createBead({ id: "yr", title: "[1YR] Annual" }),
      createBead({ id: "q1", title: "[Q1] Quarter" }),
      createBead({ id: "q2", title: "[Q2] Other Quarter" }),
      createBead({ id: "jan", title: "[JAN] January" }),
    ];
    const beadMap = new Map(beads.map((b) => [b.id, b]));

    const dependencies: Dependency[] = [
      { issue_id: "yr", depends_on_id: "q1", type: "blocks" }, // Hierarchical: YR > Q
      { issue_id: "q1", depends_on_id: "q2", type: "blocks" }, // Sequential: Q = Q
      { issue_id: "q1", depends_on_id: "jan", type: "blocks" }, // Hierarchical: Q > Month
    ];

    const filtered = filterHierarchicalDependencies(dependencies, beadMap);

    expect(filtered).toHaveLength(2);
    expect(filtered.some((d) => d.issue_id === "yr" && d.depends_on_id === "q1")).toBe(true);
    expect(filtered.some((d) => d.issue_id === "q1" && d.depends_on_id === "jan")).toBe(true);
    expect(filtered.some((d) => d.issue_id === "q1" && d.depends_on_id === "q2")).toBe(false);
  });

  it("should only include 'blocks' type dependencies", () => {
    const beads: Bead[] = [
      createBead({ id: "yr", title: "[1YR] Annual" }),
      createBead({ id: "q1", title: "[Q1] Quarter" }),
    ];
    const beadMap = new Map(beads.map((b) => [b.id, b]));

    const dependencies: Dependency[] = [
      { issue_id: "yr", depends_on_id: "q1", type: "blocks" },
      { issue_id: "yr", depends_on_id: "q1", type: "relates_to" },
    ];

    const filtered = filterHierarchicalDependencies(dependencies, beadMap);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].type).toBe("blocks");
  });

  it("should filter out dependencies where beads are not in map", () => {
    const beads: Bead[] = [createBead({ id: "yr", title: "[1YR] Annual" })];
    const beadMap = new Map(beads.map((b) => [b.id, b]));

    const dependencies: Dependency[] = [
      { issue_id: "yr", depends_on_id: "missing", type: "blocks" },
      { issue_id: "missing", depends_on_id: "yr", type: "blocks" },
    ];

    const filtered = filterHierarchicalDependencies(dependencies, beadMap);

    expect(filtered).toHaveLength(0);
  });
});

describe("HierarchyLevel enum values", () => {
  it("should have correct ordering (lower = broader scope)", () => {
    expect(HierarchyLevel.MULTI_YEAR).toBeLessThan(HierarchyLevel.HALF_YEAR);
    expect(HierarchyLevel.HALF_YEAR).toBeLessThan(HierarchyLevel.QUARTERLY);
    expect(HierarchyLevel.QUARTERLY).toBeLessThan(HierarchyLevel.MONTHLY);
    expect(HierarchyLevel.MONTHLY).toBeLessThan(HierarchyLevel.WEEKLY);
    expect(HierarchyLevel.WEEKLY).toBeLessThan(HierarchyLevel.TASK);
  });

  it("should have specific values as documented", () => {
    expect(HierarchyLevel.MULTI_YEAR).toBe(0);
    expect(HierarchyLevel.HALF_YEAR).toBe(10);
    expect(HierarchyLevel.QUARTERLY).toBe(20);
    expect(HierarchyLevel.MONTHLY).toBe(30);
    expect(HierarchyLevel.WEEKLY).toBe(40);
    expect(HierarchyLevel.TASK).toBe(50);
  });
});

describe("Edge Cases - Orphan Items", () => {
  it("should handle items whose parent is filtered out", () => {
    // Scenario: Q1 depends on 1YR, but 1YR is filtered out
    // Q1 should be treated as a root item
    const beads: Bead[] = [
      createBead({ id: "q1", title: "[Q1] Quarter 1" }),
      createBead({ id: "jan", title: "[JAN] January" }),
    ];
    const beadMap = new Map(beads.map((b) => [b.id, b]));

    const dependencies: Dependency[] = [
      { issue_id: "yr", depends_on_id: "q1", type: "blocks" }, // yr not in filtered set
      { issue_id: "q1", depends_on_id: "jan", type: "blocks" },
    ];

    const hierarchical = filterHierarchicalDependencies(dependencies, beadMap);

    // Should only include the Q1->JAN relationship since YR is not in beadMap
    expect(hierarchical).toHaveLength(1);
    expect(hierarchical[0].issue_id).toBe("q1");
    expect(hierarchical[0].depends_on_id).toBe("jan");
  });

  it("should handle child item whose parent is not in filtered set", () => {
    // Parent exists in dependencies but not in beads array
    const beads: Bead[] = [
      createBead({ id: "jan", title: "[JAN] January Task" }),
    ];
    const beadMap = new Map(beads.map((b) => [b.id, b]));

    const dependencies: Dependency[] = [
      { issue_id: "q1", depends_on_id: "jan", type: "blocks" }, // q1 not in filtered beads
    ];

    const hierarchical = filterHierarchicalDependencies(dependencies, beadMap);

    // Should filter out this dependency since parent (q1) doesn't exist in beadMap
    expect(hierarchical).toHaveLength(0);
  });

  it("should sort orphaned items at their own hierarchy level", () => {
    // Mix of items at different levels, all without parents
    const beads: Bead[] = [
      createBead({ id: "1", title: "[JAN] January", created_at: "2026-01-01" }),
      createBead({ id: "2", title: "[Q1] Quarter 1", created_at: "2026-01-01" }),
      createBead({ id: "3", title: "[FEB] February", created_at: "2026-01-01" }),
      createBead({ id: "4", title: "[Q2] Quarter 2", created_at: "2026-01-01" }),
    ];

    const sorted = sortBeadsByHierarchy(beads);

    // Should sort: Q1, Q2, JAN, FEB (quarters before months, chronological within level)
    expect(sorted[0].id).toBe("2"); // Q1
    expect(sorted[1].id).toBe("4"); // Q2
    expect(sorted[2].id).toBe("1"); // JAN
    expect(sorted[3].id).toBe("3"); // FEB
  });
});

describe("Edge Cases - Circular Dependencies", () => {
  it("should detect circular dependency in filterHierarchicalDependencies", () => {
    // Circular dependency: A blocks B, B blocks A
    // Should not cause infinite loop
    const beads: Bead[] = [
      createBead({ id: "a", title: "[Q1] Task A" }),
      createBead({ id: "b", title: "[Q1] Task B" }),
    ];
    const beadMap = new Map(beads.map((b) => [b.id, b]));

    const dependencies: Dependency[] = [
      { issue_id: "a", depends_on_id: "b", type: "blocks" },
      { issue_id: "b", depends_on_id: "a", type: "blocks" },
    ];

    // Both are same level, so neither should be treated as hierarchical
    const hierarchical = filterHierarchicalDependencies(dependencies, beadMap);
    expect(hierarchical).toHaveLength(0);
  });

  it("should handle circular dependency across levels", () => {
    // Impossible in reality but should handle gracefully:
    // Q1 blocks JAN, JAN blocks Q1
    const beads: Bead[] = [
      createBead({ id: "q1", title: "[Q1] Quarter" }),
      createBead({ id: "jan", title: "[JAN] January" }),
    ];
    const beadMap = new Map(beads.map((b) => [b.id, b]));

    const dependencies: Dependency[] = [
      { issue_id: "q1", depends_on_id: "jan", type: "blocks" }, // Valid hierarchy: Q > Month
      { issue_id: "jan", depends_on_id: "q1", type: "blocks" }, // Invalid: Month cannot parent Q
    ];

    const hierarchical = filterHierarchicalDependencies(dependencies, beadMap);

    // Should only include valid hierarchical relationship (Q1 -> JAN)
    expect(hierarchical).toHaveLength(1);
    expect(hierarchical[0].issue_id).toBe("q1");
    expect(hierarchical[0].depends_on_id).toBe("jan");
  });

  it("should handle three-way circular dependency", () => {
    // A -> B -> C -> A (same level tasks)
    const beads: Bead[] = [
      createBead({ id: "a", title: "Task A" }),
      createBead({ id: "b", title: "Task B" }),
      createBead({ id: "c", title: "Task C" }),
    ];
    const beadMap = new Map(beads.map((b) => [b.id, b]));

    const dependencies: Dependency[] = [
      { issue_id: "a", depends_on_id: "b", type: "blocks" },
      { issue_id: "b", depends_on_id: "c", type: "blocks" },
      { issue_id: "c", depends_on_id: "a", type: "blocks" },
    ];

    // All are TASK level (no prefix), so none should be hierarchical
    const hierarchical = filterHierarchicalDependencies(dependencies, beadMap);
    expect(hierarchical).toHaveLength(0);
  });
});

describe("Edge Cases - Diamond Pattern (Multiple Parents)", () => {
  it("should handle item with two potential parents at different levels", () => {
    // Scenario: JAN could be child of both Q1 and H1 (both valid hierarchically)
    const beads: Bead[] = [
      createBead({ id: "h1", title: "[H1] First Half" }),
      createBead({ id: "q1", title: "[Q1] Quarter 1" }),
      createBead({ id: "jan", title: "[JAN] January" }),
    ];
    const beadMap = new Map(beads.map((b) => [b.id, b]));

    const dependencies: Dependency[] = [
      { issue_id: "h1", depends_on_id: "jan", type: "blocks" }, // H1 -> JAN (valid)
      { issue_id: "q1", depends_on_id: "jan", type: "blocks" }, // Q1 -> JAN (valid)
    ];

    const hierarchical = filterHierarchicalDependencies(dependencies, beadMap);

    // Both relationships are valid hierarchically
    expect(hierarchical).toHaveLength(2);
    expect(hierarchical.some((d) => d.issue_id === "h1" && d.depends_on_id === "jan")).toBe(true);
    expect(hierarchical.some((d) => d.issue_id === "q1" && d.depends_on_id === "jan")).toBe(true);
  });

  it("should handle diamond pattern: H1 -> Q1 -> JAN, H1 -> JAN", () => {
    // Both paths are valid, creates a diamond
    const beads: Bead[] = [
      createBead({ id: "h1", title: "[H1] First Half" }),
      createBead({ id: "q1", title: "[Q1] Quarter 1" }),
      createBead({ id: "jan", title: "[JAN] January" }),
    ];
    const beadMap = new Map(beads.map((b) => [b.id, b]));

    const dependencies: Dependency[] = [
      { issue_id: "h1", depends_on_id: "q1", type: "blocks" },  // H1 -> Q1
      { issue_id: "q1", depends_on_id: "jan", type: "blocks" }, // Q1 -> JAN
      { issue_id: "h1", depends_on_id: "jan", type: "blocks" }, // H1 -> JAN (direct)
    ];

    const hierarchical = filterHierarchicalDependencies(dependencies, beadMap);

    // All three relationships are hierarchically valid
    expect(hierarchical).toHaveLength(3);
    expect(hierarchical.some((d) => d.issue_id === "h1" && d.depends_on_id === "q1")).toBe(true);
    expect(hierarchical.some((d) => d.issue_id === "q1" && d.depends_on_id === "jan")).toBe(true);
    expect(hierarchical.some((d) => d.issue_id === "h1" && d.depends_on_id === "jan")).toBe(true);
  });

  it("should sort items consistently in diamond pattern", () => {
    // When an item has multiple parents, sorting should still be deterministic
    const tasks: GanttTaskLike[] = [
      createTask({
        bead: { id: "h1", title: "[H1] First Half", created_at: "2026-01-01" },
        start: new Date("2026-01-01"),
      }),
      createTask({
        bead: { id: "q1", title: "[Q1] Q1", created_at: "2026-01-01" },
        start: new Date("2026-01-01"),
      }),
      createTask({
        bead: { id: "jan", title: "[JAN] January", created_at: "2026-01-01" },
        start: new Date("2026-01-01"),
      }),
    ];

    const sorted = sortTasksByHierarchy(tasks);

    // Should sort by hierarchy level: H1 (10), Q1 (20), JAN (30)
    expect(sorted[0].bead.id).toBe("h1");
    expect(sorted[1].bead.id).toBe("q1");
    expect(sorted[2].bead.id).toBe("jan");
  });
});

describe("Edge Cases - Empty Arrays", () => {
  it("should handle empty beads array", () => {
    const beads: Bead[] = [];
    const sorted = sortBeadsByHierarchy(beads);
    expect(sorted).toEqual([]);
  });

  it("should handle empty tasks array", () => {
    const tasks: GanttTaskLike[] = [];
    const sorted = sortTasksByHierarchy(tasks);
    expect(sorted).toEqual([]);
  });

  it("should handle empty dependencies array", () => {
    const beads: Bead[] = [
      createBead({ id: "1", title: "[Q1] Quarter" }),
    ];
    const beadMap = new Map(beads.map((b) => [b.id, b]));
    const dependencies: Dependency[] = [];

    const hierarchical = filterHierarchicalDependencies(dependencies, beadMap);
    expect(hierarchical).toEqual([]);
  });

  it("should handle empty beadMap", () => {
    const beadMap = new Map<string, Bead>();
    const dependencies: Dependency[] = [
      { issue_id: "a", depends_on_id: "b", type: "blocks" },
    ];

    const hierarchical = filterHierarchicalDependencies(dependencies, beadMap);
    expect(hierarchical).toEqual([]);
  });
});

describe("Edge Cases - Same Hierarchy Level Sorting", () => {
  it("should sort all Q1 items by date when at same level", () => {
    const beads: Bead[] = [
      createBead({
        id: "3",
        title: "[Q1] Late Task",
        created_at: "2026-01-15",
      }),
      createBead({
        id: "1",
        title: "[Q1] Early Task",
        created_at: "2026-01-05",
      }),
      createBead({
        id: "2",
        title: "[Q1] Mid Task",
        created_at: "2026-01-10",
      }),
    ];

    const sorted = sortBeadsByHierarchy(beads);

    // Should sort by created_at since all have same hierarchy level and period
    expect(sorted[0].id).toBe("1"); // 2026-01-05
    expect(sorted[1].id).toBe("2"); // 2026-01-10
    expect(sorted[2].id).toBe("3"); // 2026-01-15
  });

  it("should sort all tasks without prefix by created_at", () => {
    const beads: Bead[] = [
      createBead({ id: "3", title: "Task C", created_at: "2026-03-01" }),
      createBead({ id: "1", title: "Task A", created_at: "2026-01-01" }),
      createBead({ id: "2", title: "Task B", created_at: "2026-02-01" }),
    ];

    const sorted = sortBeadsByHierarchy(beads);

    expect(sorted[0].id).toBe("1"); // Earliest created_at
    expect(sorted[1].id).toBe("2");
    expect(sorted[2].id).toBe("3");
  });

  it("should use start date for sorting when provided", () => {
    const tasks: GanttTaskLike[] = [
      createTask({
        bead: { id: "3", title: "Task C", created_at: "2026-01-01" },
        start: new Date("2026-03-01"),
      }),
      createTask({
        bead: { id: "1", title: "Task A", created_at: "2026-01-01" },
        start: new Date("2026-01-01"),
      }),
      createTask({
        bead: { id: "2", title: "Task B", created_at: "2026-01-01" },
        start: new Date("2026-02-01"),
      }),
    ];

    const sorted = sortTasksByHierarchy(tasks);

    // Should sort by start date, not created_at
    expect(sorted[0].bead.id).toBe("1"); // 2026-01-01
    expect(sorted[1].bead.id).toBe("2"); // 2026-02-01
    expect(sorted[2].bead.id).toBe("3"); // 2026-03-01
  });

  it("should maintain stable sort for identical items", () => {
    const beads: Bead[] = [
      createBead({ id: "1", title: "Task", created_at: "2026-01-01" }),
      createBead({ id: "2", title: "Task", created_at: "2026-01-01" }),
      createBead({ id: "3", title: "Task", created_at: "2026-01-01" }),
    ];

    const sorted1 = sortBeadsByHierarchy(beads);
    const sorted2 = sortBeadsByHierarchy(beads);

    // Should produce same order consistently
    expect(sorted1.map((b) => b.id)).toEqual(sorted2.map((b) => b.id));
  });
});

describe("Edge Cases - Filtering Maintains Sort Order", () => {
  it("should maintain hierarchy order after status filtering", () => {
    // Create beads with different statuses at different hierarchy levels
    const beads: Bead[] = [
      createBead({ id: "yr", title: "[1YR] Annual", status: "open" }),
      createBead({ id: "q1", title: "[Q1] Q1", status: "closed" }),
      createBead({ id: "q2", title: "[Q2] Q2", status: "open" }),
      createBead({ id: "jan", title: "[JAN] Jan", status: "closed" }),
      createBead({ id: "feb", title: "[FEB] Feb", status: "open" }),
    ];

    // Filter to only "open" status
    const filtered = beads.filter((b) => b.status === "open");
    const sorted = sortBeadsByHierarchy(filtered);

    // Should maintain hierarchy order: [1YR], [Q2], [FEB]
    expect(sorted[0].id).toBe("yr");  // MULTI_YEAR level
    expect(sorted[1].id).toBe("q2");  // QUARTERLY level
    expect(sorted[2].id).toBe("feb"); // MONTHLY level
  });

  it("should handle case where filtering removes all parents", () => {
    const allBeads: Bead[] = [
      createBead({ id: "yr", title: "[1YR] Annual", status: "closed" }),
      createBead({ id: "q1", title: "[Q1] Q1", status: "closed" }),
      createBead({ id: "jan", title: "[JAN] Jan", status: "open" }),
      createBead({ id: "task", title: "Task", status: "open" }),
    ];

    const beadMap = new Map(allBeads.map((b) => [b.id, b]));

    const dependencies: Dependency[] = [
      { issue_id: "yr", depends_on_id: "q1", type: "blocks" },
      { issue_id: "q1", depends_on_id: "jan", type: "blocks" },
      { issue_id: "jan", depends_on_id: "task", type: "blocks" },
    ];

    // Filter to only "open" beads
    const filtered = allBeads.filter((b) => b.status === "open");
    const filteredMap = new Map(filtered.map((b) => [b.id, b]));

    const hierarchical = filterHierarchicalDependencies(dependencies, filteredMap);

    // Only jan->task relationship should remain
    expect(hierarchical).toHaveLength(1);
    expect(hierarchical[0].issue_id).toBe("jan");
    expect(hierarchical[0].depends_on_id).toBe("task");
  });
});

describe("Edge Cases - Multi-year Sorting", () => {
  it("should sort multi-year items with larger spans first", () => {
    const beads: Bead[] = [
      createBead({ id: "1", title: "[1YR] One Year", created_at: "2026-01-01" }),
      createBead({ id: "3", title: "[3YR] Three Year", created_at: "2026-01-01" }),
      createBead({ id: "5", title: "[5YR] Five Year", created_at: "2026-01-01" }),
    ];

    const sorted = sortBeadsByHierarchy(beads);

    // Larger spans should come first: 5YR, 3YR, 1YR
    expect(sorted[0].id).toBe("5"); // [5YR]
    expect(sorted[1].id).toBe("3"); // [3YR]
    expect(sorted[2].id).toBe("1"); // [1YR]
  });

  it("should parse multi-year period sort keys correctly", () => {
    const yr1 = parseBeadPrefix("[1YR] One Year");
    const yr3 = parseBeadPrefix("[3YR] Three Year");
    const yr5 = parseBeadPrefix("[5YR] Five Year");

    // More negative = larger span = sorted first
    expect(yr5.periodSortKey).toBeLessThan(yr3.periodSortKey);
    expect(yr3.periodSortKey).toBeLessThan(yr1.periodSortKey);
    expect(yr1.periodSortKey).toBe(-1);
    expect(yr3.periodSortKey).toBe(-3);
    expect(yr5.periodSortKey).toBe(-5);
  });
});

describe("Edge Cases - Mixed Levels and Edge Prefixes", () => {
  it("should handle mix of all hierarchy levels", () => {
    const beads: Bead[] = [
      createBead({ id: "task", title: "Plain Task", created_at: "2026-01-01" }),
      createBead({ id: "week", title: "[W1] Week 1", created_at: "2026-01-01" }),
      createBead({ id: "month", title: "[JAN] January", created_at: "2026-01-01" }),
      createBead({ id: "quarter", title: "[Q1] Quarter 1", created_at: "2026-01-01" }),
      createBead({ id: "half", title: "[H1] Half 1", created_at: "2026-01-01" }),
      createBead({ id: "year", title: "[1YR] Annual", created_at: "2026-01-01" }),
    ];

    const sorted = sortBeadsByHierarchy(beads);

    // Should sort from broadest to narrowest
    expect(sorted[0].id).toBe("year");    // MULTI_YEAR (0)
    expect(sorted[1].id).toBe("half");    // HALF_YEAR (10)
    expect(sorted[2].id).toBe("quarter"); // QUARTERLY (20)
    expect(sorted[3].id).toBe("month");   // MONTHLY (30)
    expect(sorted[4].id).toBe("week");    // WEEKLY (40)
    expect(sorted[5].id).toBe("task");    // TASK (50)
  });

  it("should handle unknown prefixes as TASK level", () => {
    const beads: Bead[] = [
      createBead({ id: "1", title: "[EPIC] Epic Task", created_at: "2026-01-01" }),
      createBead({ id: "2", title: "[SPRINT] Sprint Task", created_at: "2026-01-01" }),
      createBead({ id: "3", title: "Plain Task", created_at: "2026-01-01" }),
    ];

    const sorted = sortBeadsByHierarchy(beads);

    // All should be treated as TASK level, sorted by created_at
    const levels = sorted.map((b) => parseBeadPrefix(b.title).level);
    expect(levels.every((l) => l === HierarchyLevel.TASK)).toBe(true);
  });

  it("should handle week 52 and boundary weeks correctly", () => {
    const beads: Bead[] = [
      createBead({ id: "w1", title: "[W1] Week 1", created_at: "2026-01-01" }),
      createBead({ id: "w26", title: "[W26] Week 26", created_at: "2026-01-01" }),
      createBead({ id: "w52", title: "[W52] Week 52", created_at: "2026-01-01" }),
    ];

    const sorted = sortBeadsByHierarchy(beads);

    // Should sort chronologically by week number
    expect(sorted[0].id).toBe("w1");
    expect(sorted[1].id).toBe("w26");
    expect(sorted[2].id).toBe("w52");
  });
});
