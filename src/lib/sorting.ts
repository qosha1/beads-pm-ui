/**
 * Hierarchy-aware sorting for beads/tasks.
 *
 * Implements multi-level sorting that respects the time-based hierarchy:
 * MULTI_YEAR > HALF_YEAR > QUARTERLY > MONTHLY > WEEKLY > TASK
 *
 * Sort order: hierarchy_weight ASC -> period_sort_key ASC -> start_date ASC -> created_at ASC
 */

import type { Bead, Dependency } from "./types";

/**
 * Hierarchy levels for time-based prefixes.
 * Lower numbers = broader scope (sorted first).
 */
export enum HierarchyLevel {
  MULTI_YEAR = 0,
  HALF_YEAR = 10,
  QUARTERLY = 20,
  MONTHLY = 30,
  WEEKLY = 40,
  TASK = 50,
}

/**
 * Month name to number mapping (0-indexed)
 */
const MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

/**
 * Parsed prefix information from a bead title.
 */
export interface ParsedPrefix {
  /** The raw prefix string (e.g., "Q1", "JAN", "3YR") */
  raw: string | null;
  /** The hierarchy level */
  level: HierarchyLevel;
  /** Numeric sort key for ordering within the same hierarchy level */
  periodSortKey: number;
  /** Number of years for multi-year items (e.g., 3 for [3YR]) */
  years?: number;
}

/**
 * Extended bead info with sorting metadata.
 */
export interface SortableBead {
  bead: Bead;
  prefix: ParsedPrefix;
  startDate: Date;
  createdAt: Date;
}

/**
 * Configuration for sorting behavior.
 */
export interface SortConfig {
  /** Whether to sort descending (default: false = ascending) */
  descending?: boolean;
  /** Reference year for date calculations (default: current year) */
  referenceYear?: number;
}

/**
 * Parses the prefix from a bead title and extracts hierarchy information.
 *
 * Supported formats:
 * - [nYR]: Multi-year plans (e.g., [1YR], [3YR], [5YR])
 * - [H1], [H2]: Half-year periods
 * - [Q1], [Q2], [Q3], [Q4]: Quarters
 * - [JAN], [FEB], ..., [DEC]: Monthly
 * - [W1], [W2], ..., [W52]: Weekly
 *
 * @param title The bead title to parse
 * @returns Parsed prefix information
 */
export function parseBeadPrefix(title: string): ParsedPrefix {
  const match = title.match(/^\[([^\]]+)\]/);

  if (!match) {
    return {
      raw: null,
      level: HierarchyLevel.TASK,
      periodSortKey: 0,
    };
  }

  const tag = match[1].toUpperCase();

  // Multi-year: [3YR], [1YR], [5YR] - highest level (sorted first)
  // Period sort key: negative years so larger spans sort first
  const yearMatch = tag.match(/^(\d+)YR$/);
  if (yearMatch) {
    const years = parseInt(yearMatch[1], 10);
    return {
      raw: tag,
      level: HierarchyLevel.MULTI_YEAR,
      periodSortKey: -years, // Larger spans first (3YR before 1YR)
      years,
    };
  }

  // Half year: [H1], [H2]
  // Period sort key: 1 or 2
  const halfMatch = tag.match(/^H([12])$/);
  if (halfMatch) {
    return {
      raw: tag,
      level: HierarchyLevel.HALF_YEAR,
      periodSortKey: parseInt(halfMatch[1], 10),
    };
  }

  // Quarters: [Q1], [Q2], [Q3], [Q4]
  // Period sort key: 1-4
  const quarterMatch = tag.match(/^Q([1-4])$/);
  if (quarterMatch) {
    return {
      raw: tag,
      level: HierarchyLevel.QUARTERLY,
      periodSortKey: parseInt(quarterMatch[1], 10),
    };
  }

  // Months: [JAN], [FEB], etc.
  // Period sort key: 0-11 (month index)
  if (tag in MONTHS) {
    return {
      raw: tag,
      level: HierarchyLevel.MONTHLY,
      periodSortKey: MONTHS[tag],
    };
  }

  // Weeks: [W1], [W2], etc.
  // Period sort key: week number (1-52)
  const weekMatch = tag.match(/^W(\d+)$/);
  if (weekMatch) {
    return {
      raw: tag,
      level: HierarchyLevel.WEEKLY,
      periodSortKey: parseInt(weekMatch[1], 10),
    };
  }

  // Unknown prefix - treat as task level
  return {
    raw: tag,
    level: HierarchyLevel.TASK,
    periodSortKey: 0,
  };
}

/**
 * Compares two sortable beads using the hierarchy-aware sort order.
 *
 * Sort order (all ascending):
 * 1. hierarchy_weight (broader scope first)
 * 2. period_sort_key (chronological within level)
 * 3. start_date
 * 4. created_at
 *
 * @param a First sortable bead
 * @param b Second sortable bead
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export function compareBeads(a: SortableBead, b: SortableBead): number {
  // 1. Compare by hierarchy level (lower = broader scope = first)
  if (a.prefix.level !== b.prefix.level) {
    return a.prefix.level - b.prefix.level;
  }

  // 2. Compare by period sort key (chronological within same level)
  if (a.prefix.periodSortKey !== b.prefix.periodSortKey) {
    return a.prefix.periodSortKey - b.prefix.periodSortKey;
  }

  // 3. Compare by start date
  const startDiff = a.startDate.getTime() - b.startDate.getTime();
  if (startDiff !== 0) {
    return startDiff;
  }

  // 4. Compare by created_at (oldest first)
  return a.createdAt.getTime() - b.createdAt.getTime();
}

/**
 * GanttTask-like interface for compatibility with existing code.
 * Matches the local GanttTask interface in GanttChart.tsx.
 */
export interface GanttTaskLike {
  bead: Bead;
  start: Date;
  end: Date;
  progress: number;
  timeProgress: number;
  depth: number;
  hasChildren: boolean;
  parentId: string | null;
}

/**
 * Sorts an array of GanttTask-like objects using hierarchy-aware sorting.
 * This function can be used to sort tasks at the same depth level.
 *
 * @param tasks Array of tasks to sort
 * @param config Optional sorting configuration
 * @returns New sorted array (original not modified)
 */
export function sortTasksByHierarchy<T extends GanttTaskLike>(
  tasks: T[],
  config: SortConfig = {}
): T[] {
  const { descending = false } = config;

  // Create sortable versions with parsed prefixes
  const sortable: Array<{ task: T; sortInfo: SortableBead }> = tasks.map((task) => ({
    task,
    sortInfo: {
      bead: task.bead,
      prefix: parseBeadPrefix(task.bead.title),
      startDate: task.start,
      createdAt: new Date(task.bead.created_at),
    },
  }));

  // Sort using compareBeads
  sortable.sort((a, b) => {
    const cmp = compareBeads(a.sortInfo, b.sortInfo);
    return descending ? -cmp : cmp;
  });

  // Extract sorted tasks
  return sortable.map((s) => s.task);
}

/**
 * Sorts an array of Bead objects using hierarchy-aware sorting.
 * Uses created_at as start date fallback.
 *
 * @param beads Array of beads to sort
 * @param getStartDate Optional function to get start date for a bead
 * @param config Optional sorting configuration
 * @returns New sorted array (original not modified)
 */
export function sortBeadsByHierarchy(
  beads: Bead[],
  getStartDate?: (bead: Bead) => Date,
  config: SortConfig = {}
): Bead[] {
  const { descending = false } = config;

  // Create sortable versions
  const sortable: Array<{ bead: Bead; sortInfo: SortableBead }> = beads.map((bead) => ({
    bead,
    sortInfo: {
      bead,
      prefix: parseBeadPrefix(bead.title),
      startDate: getStartDate ? getStartDate(bead) : new Date(bead.created_at),
      createdAt: new Date(bead.created_at),
    },
  }));

  // Sort using compareBeads
  sortable.sort((a, b) => {
    const cmp = compareBeads(a.sortInfo, b.sortInfo);
    return descending ? -cmp : cmp;
  });

  // Extract sorted beads
  return sortable.map((s) => s.bead);
}

/**
 * Gets the hierarchy level for a bead title.
 * Convenience function that wraps parseBeadPrefix.
 *
 * @param title The bead title
 * @returns The hierarchy level enum value
 */
export function getHierarchyLevel(title: string): HierarchyLevel {
  return parseBeadPrefix(title).level;
}

/**
 * Checks if a bead at one hierarchy level can be a parent of another.
 * Parents must have a broader scope (lower hierarchy level value).
 *
 * @param parentTitle Title of the potential parent
 * @param childTitle Title of the potential child
 * @returns True if parent can contain child based on hierarchy
 */
export function canBeParentOf(parentTitle: string, childTitle: string): boolean {
  const parentLevel = getHierarchyLevel(parentTitle);
  const childLevel = getHierarchyLevel(childTitle);
  return parentLevel < childLevel;
}

/**
 * Filters dependencies to only include hierarchical (parent-child) relationships.
 * Sequential dependencies (same level blocking) are excluded.
 *
 * @param dependencies Array of all dependencies
 * @param beadMap Map of bead ID to Bead object
 * @returns Dependencies that represent hierarchical containment
 */
export function filterHierarchicalDependencies(
  dependencies: Dependency[],
  beadMap: Map<string, Bead>
): Dependency[] {
  return dependencies.filter((dep) => {
    if (dep.type !== "blocks") return false;

    const parentBead = beadMap.get(dep.issue_id);
    const childBead = beadMap.get(dep.depends_on_id);

    if (!parentBead || !childBead) return false;

    return canBeParentOf(parentBead.title, childBead.title);
  });
}
