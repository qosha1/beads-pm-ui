"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  addDays,
  differenceInDays,
  format,
  isWeekend,
  isToday,
  startOfDay,
  endOfDay,
  startOfMonth,
  getMonth,
  startOfWeek,
  getWeek,
} from "date-fns";
import type { Bead, Dependency } from "@/lib/types";
import { EditModal } from "./EditModal";
import { parseDateRangeFromTitle } from "@/lib/dates";
import { sortTasksByHierarchy, parseBeadPrefix, HierarchyLevel } from "@/lib/sorting";
import { FilterBar } from "./filters/FilterBar";
import { useFilters } from "./hooks/useFilters";
import type {
  StatusFilter,
  PriorityFilter,
  IssueTypeFilter,
} from "./filters/FilterContext";
import {
  calculateHealthStatus,
  calculateExpectedProgress,
  getHealthColor,
  type HealthStatus,
} from "@/lib/progress";
import { HealthLegend } from "./shared/HealthLegend";

/**
 * Hierarchy levels for time-based prefixes in titles.
 * Higher numbers = broader scope (parent level).
 * Used to distinguish hierarchical containment from sequential dependencies.
 *
 * Hierarchy: 1YR > H1/H2 > Q1-Q4 > Months > Weeks > no prefix
 */
function getHierarchyLevel(title: string): number {
  const match = title.match(/^\[([^\]]+)\]/);
  if (!match) return 0; // No prefix = leaf level

  const tag = match[1].toUpperCase();

  // Multi-year: [3YR], [1YR], [5YR] - highest level
  if (/^\d+YR$/.test(tag)) {
    const years = parseInt(tag);
    return 100 + years; // 1YR=101, 3YR=103, etc.
  }

  // Half year: [H1], [H2]
  if (/^H[12]$/.test(tag)) return 50;

  // Quarters: [Q1], [Q2], [Q3], [Q4]
  if (/^Q[1-4]$/.test(tag)) return 40;

  // Months: [JAN], [FEB], etc.
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  if (MONTHS.includes(tag)) return 30;

  // Weeks: [W1], [W2], etc.
  if (/^W\d+$/.test(tag)) return 20;

  // Unknown prefix - treat as low level
  return 10;
}

interface Team {
  id: string;
  name: string;
}

interface GanttChartProps {
  beads: Bead[];
  dependencies: Dependency[];
  teams?: Team[];
  selectedTeam: string | null;
  onTeamChange: (teamId: string | null) => void;
  onUpdate: (id: string, team: string, updates: Record<string, unknown>) => Promise<void>;
}

interface GanttTask {
  bead: Bead;
  start: Date;
  end: Date;
  progress: number;  // Status-based progress (0/50/100)
  timeProgress: number;  // Time-elapsed progress (0-100)
  depth: number;
  hasChildren: boolean;
  parentId: string | null;
  healthStatus: HealthStatus;  // Calculated health status
}

const ROW_HEIGHT = 36;
const ZOOM_LEVELS = [8, 12, 16, 24, 32, 48];
const DEFAULT_ZOOM_INDEX = 3;
const INDENT_WIDTH = 20;
const COLLAPSE_STORAGE_KEY = "gantt-collapsed-tasks";

interface DragState {
  taskId: string;
  type: "move" | "resize-start" | "resize-end";
  startX: number;
  originalStart: Date;
  originalEnd: Date;
  currentStart: Date;
  currentEnd: Date;
}

export function GanttChart({ beads, dependencies, teams = [], selectedTeam, onTeamChange, onUpdate }: GanttChartProps) {
  const [editingBead, setEditingBead] = useState<Bead | null>(null);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  // Use the filter hook for URL-synced filter state
  const filterContext = useFilters();

  // Load collapsed state from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(COLLAPSE_STORAGE_KEY);
      if (stored) {
        setCollapsed(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      console.warn("Failed to load collapsed state:", e);
    }
  }, []);

  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(0);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dayWidth = ZOOM_LEVELS[zoomIndex];
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const headerTimelineRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Persist collapsed state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(Array.from(collapsed)));
      } catch (e) {
        console.warn("Failed to save collapsed state:", e);
      }
    }
  }, [collapsed]);

  const zoomIn = () => setZoomIndex((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1));
  const zoomOut = () => setZoomIndex((i) => Math.max(i - 1, 0));

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Apply filters using the filter context
  const filteredBeads = useMemo(() => {
    return filterContext.applyFilters(beads);
  }, [beads, filterContext]);

  // Memo 1: Build hierarchy maps from dependencies
  // Distinguishes between hierarchical containment vs sequential blocking:
  // - Hierarchical: [1YR] contains [Q1] (different levels) -> parent-child
  // - Sequential: [Q1] task blocks [Q1] other task (same level) -> just a dependency, not hierarchy
  const { childrenMap, parentMap, beadMap } = useMemo(() => {
    const childrenMap = new Map<string, string[]>(); // parent -> children (hierarchical only)
    const parentMap = new Map<string, string>(); // child -> parent (hierarchical only)
    const beadMap = new Map(filteredBeads.map((b) => [b.id, b]));

    for (const dep of dependencies) {
      if (dep.type === "blocks") {
        // In beads: issue_id depends on depends_on_id (issue contains depends_on)
        // So issue_id is the PARENT, depends_on_id is the CHILD
        const potentialParentId = dep.issue_id;
        const potentialChildId = dep.depends_on_id;

        const parentBead = beadMap.get(potentialParentId);
        const childBead = beadMap.get(potentialChildId);

        // Skip if either bead is not in our filtered set
        if (!parentBead || !childBead) continue;

        const parentLevel = getHierarchyLevel(parentBead.title);
        const childLevel = getHierarchyLevel(childBead.title);

        // Only treat as hierarchical parent-child if:
        // 1. Parent has a HIGHER hierarchy level than child (e.g., [1YR] > [Q1])
        // 2. This represents containment, not just sequential blocking
        //
        // Same level or inverted = sequential dependency, not hierarchy
        if (parentLevel > childLevel) {
          const children = childrenMap.get(potentialParentId) || [];
          children.push(potentialChildId);
          childrenMap.set(potentialParentId, children);
          parentMap.set(potentialChildId, potentialParentId);
        } else if (parentLevel > 0 && childLevel > 0 && parentLevel < childLevel) {
          // Warn about potentially inverted relationships
          // (where declared parent has lower level than declared child)
          console.warn(
            `Inverted hierarchy detected: "${parentBead.title}" (level ${parentLevel}) ` +
            `declared as parent of "${childBead.title}" (level ${childLevel}). ` +
            `Treating as sequential dependency.`
          );
        }
        // If same level (e.g., both [Q1]), it's a sequential dependency - no tree relationship
      }
    }

    return { childrenMap, parentMap, beadMap };
  }, [filteredBeads, dependencies]);

  // Memo 2: Parse dates for all beads
  // Priority: 1) title date patterns (Q1, H1, JAN, etc.), 2) due_at field, 3) created_at + estimate
  const beadDates = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const dates = new Map<string, { start: Date; end: Date }>();

    for (const bead of filteredBeads) {
      // First try parsing time-period patterns from title (Q1, H1, JAN, W1, etc.)
      // These define a date RANGE, not just an end date
      const parsedRange = parseDateRangeFromTitle(bead.title, currentYear);
      if (parsedRange) {
        dates.set(bead.id, { start: parsedRange.start, end: parsedRange.end });
        continue;
      }

      // Then try due_at field (from DB or labels) for tasks without time-period prefixes
      if (bead.due_at) {
        const dueDate = new Date(bead.due_at);
        if (!isNaN(dueDate.getTime())) {
          const start = startOfDay(new Date(bead.created_at));
          dates.set(bead.id, { start, end: endOfDay(dueDate) });
          continue;
        }
      }

      // Fallback to created_at + estimate
      const start = startOfDay(new Date(bead.created_at));
      const estimatedDays = bead.estimated_minutes
        ? Math.ceil(bead.estimated_minutes / 480)
        : 14;
      dates.set(bead.id, { start, end: endOfDay(addDays(start, estimatedDays)) });
    }

    return dates;
  }, [filteredBeads]);

  // Memo 3: Build flattened task tree with depth
  const tasks = useMemo(() => {
    // Find root nodes (items with no parent, or whose parent is filtered out)
    const roots: string[] = [];
    for (const bead of filteredBeads) {
      const parentId = parentMap.get(bead.id);
      // Treat as root if no parent OR parent is not in filtered beads
      if (!parentId || !beadMap.has(parentId)) {
        roots.push(bead.id);
      }
    }

    // Hierarchy-aware sort function
    // Sort order: hierarchy_weight ASC -> period_sort_key ASC -> start_date ASC
    const sortByHierarchy = (ids: string[]) => {
      return ids.sort((a, b) => {
        const beadA = beadMap.get(a);
        const beadB = beadMap.get(b);
        if (!beadA || !beadB) return 0;

        const prefixA = parseBeadPrefix(beadA.title);
        const prefixB = parseBeadPrefix(beadB.title);

        // 1. Compare by hierarchy level (lower = broader scope = first)
        if (prefixA.level !== prefixB.level) {
          return prefixA.level - prefixB.level;
        }

        // 2. Compare by period sort key (chronological within same level)
        if (prefixA.periodSortKey !== prefixB.periodSortKey) {
          return prefixA.periodSortKey - prefixB.periodSortKey;
        }

        // 3. Compare by start date
        const dateA = beadDates.get(a)?.start || new Date();
        const dateB = beadDates.get(b)?.start || new Date();
        const dateDiff = dateA.getTime() - dateB.getTime();
        if (dateDiff !== 0) {
          return dateDiff;
        }

        // 4. Compare by created_at as final tiebreaker
        return new Date(beadA.created_at).getTime() - new Date(beadB.created_at).getTime();
      });
    };

    const taskList: GanttTask[] = [];
    const visited = new Set<string>();

    const traverse = (id: string, depth: number) => {
      // Prevent duplicate entries (a bead could be child of multiple parents)
      if (visited.has(id)) return;
      visited.add(id);

      const bead = beadMap.get(id);
      if (!bead) return;

      const dates = beadDates.get(id)!;
      const children = childrenMap.get(id) || [];
      const hasChildren = children.length > 0;

      // Status-based progress
      const progress =
        bead.status === "closed"
          ? 100
          : bead.status === "in_progress"
          ? 50
          : 0;

      // Time-elapsed progress (how much of the duration has passed)
      const now = new Date();
      const taskStart = startOfDay(dates.start);
      const taskEnd = endOfDay(dates.end);
      const totalDuration = taskEnd.getTime() - taskStart.getTime();
      const elapsed = now.getTime() - taskStart.getTime();
      const timeProgress = totalDuration > 0
        ? Math.max(0, Math.min(100, (elapsed / totalDuration) * 100))
        : 0;

      // Calculate expected progress and health status
      const expectedProgress = calculateExpectedProgress(taskStart, taskEnd, now);
      const hasBlockers = bead.status === 'blocked';
      const healthStatusResult = calculateHealthStatus(progress, expectedProgress, hasBlockers);

      taskList.push({
        bead,
        start: taskStart,
        end: taskEnd,
        progress,
        timeProgress,
        depth,
        hasChildren,
        parentId: parentMap.get(id) || null,
        healthStatus: healthStatusResult.status,
      });

      // Recursively add children (sorted by start date)
      if (hasChildren && !collapsed.has(id)) {
        const sortedChildren = sortByHierarchy(children);
        for (const childId of sortedChildren) {
          traverse(childId, depth + 1);
        }
      }
    };

    // Start with sorted roots
    const sortedRoots = sortByHierarchy(roots);
    for (const rootId of sortedRoots) {
      traverse(rootId, 0);
    }

    return taskList;
  }, [filteredBeads, beadDates, beadMap, childrenMap, parentMap, collapsed]);

  // Memo 4: Calculate date range from tasks
  const { startDate, days } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    let minDate = new Date(currentYear, 0, 1);
    let maxDate = new Date(currentYear, 11, 31);

    for (const task of tasks) {
      if (task.start < minDate) minDate = startOfDay(task.start);
      if (task.end > maxDate) maxDate = endOfDay(task.end);
    }

    minDate = startOfMonth(minDate);
    maxDate = endOfDay(addDays(maxDate, 30));

    const dayCount = differenceInDays(maxDate, minDate) + 1;
    const daysArr: Date[] = [];
    for (let i = 0; i < dayCount; i++) {
      daysArr.push(addDays(minDate, i));
    }

    return { startDate: minDate, days: daysArr };
  }, [tasks]);

  // Memo 5: Group days by month
  const months = useMemo(() => {
    const monthsArr: { month: Date; days: number; label: string }[] = [];
    let currentMonth = -1;
    let monthDays = 0;

    for (const day of days) {
      const m = getMonth(day);
      if (m !== currentMonth) {
        if (currentMonth !== -1) {
          monthsArr.push({
            month: addDays(day, -1),
            days: monthDays,
            label: format(addDays(day, -1), "MMM yyyy"),
          });
        }
        currentMonth = m;
        monthDays = 1;
      } else {
        monthDays++;
      }
    }
    if (monthDays > 0 && days.length > 0) {
      monthsArr.push({
        month: days[days.length - 1],
        days: monthDays,
        label: format(days[days.length - 1], "MMM yyyy"),
      });
    }

    return monthsArr;
  }, [days]);

  // Memo 6: Calculate time header units based on zoom level
  // Note: isToday checks only run after mount to avoid hydration mismatch
  const timeHeaderUnits = useMemo(() => {
    // Determine display mode based on dayWidth
    // dayWidth >= 16: show individual days
    // dayWidth >= 12: show every 2nd day
    // dayWidth >= 8: show weeks
    // dayWidth < 8: show weeks only (no day numbers)

    if (dayWidth >= 16) {
      // Show individual days
      return {
        mode: "days" as const,
        units: days.map((day, i) => ({
          date: day,
          width: dayWidth,
          label: day.getDate() === 1 || i === 0 ? format(day, "d") : String(day.getDate()),
          isWeekend: isWeekend(day),
          isToday: mounted && isToday(day),
        })),
      };
    } else if (dayWidth >= 12) {
      // Show every other day or week starts
      return {
        mode: "sparse-days" as const,
        units: days.map((day, i) => ({
          date: day,
          width: dayWidth,
          label: (day.getDay() === 1 || day.getDate() === 1 || i === 0)
            ? String(day.getDate())
            : "",
          isWeekend: isWeekend(day),
          isToday: mounted && isToday(day),
        })),
      };
    } else {
      // Group into weeks
      const weeks: { startDate: Date; endDate: Date; days: number; label: string; hasToday: boolean }[] = [];
      let currentWeek = -1;
      let weekDays = 0;
      let weekStart: Date | null = null;
      let weekHasToday = false;

      for (const day of days) {
        const week = getWeek(day);
        if (week !== currentWeek) {
          if (currentWeek !== -1 && weekStart) {
            weeks.push({
              startDate: weekStart,
              endDate: addDays(day, -1),
              days: weekDays,
              label: format(weekStart, "MMM d"),
              hasToday: mounted && weekHasToday,
            });
          }
          currentWeek = week;
          weekDays = 1;
          weekStart = day;
          weekHasToday = mounted && isToday(day);
        } else {
          weekDays++;
          if (mounted && isToday(day)) weekHasToday = true;
        }
      }
      if (weekDays > 0 && weekStart) {
        weeks.push({
          startDate: weekStart,
          endDate: days[days.length - 1],
          days: weekDays,
          label: format(weekStart, "MMM d"),
          hasToday: mounted && weekHasToday,
        });
      }

      return {
        mode: "weeks" as const,
        units: weeks.map(w => ({
          ...w,
          width: w.days * dayWidth,
        })),
      };
    }
  }, [days, dayWidth, mounted]);

  // Scroll to today on mount or zoom change
  useEffect(() => {
    if (bodyScrollRef.current) {
      const today = new Date();
      const daysFromStart = differenceInDays(today, startDate);
      const scrollTo = Math.max(0, daysFromStart * dayWidth - 200);
      bodyScrollRef.current.scrollLeft = scrollTo;
    }
  }, [startDate, dayWidth]);

  // Sync horizontal scroll between header and body
  const handleBodyScroll = () => {
    if (bodyScrollRef.current && headerTimelineRef.current) {
      headerTimelineRef.current.scrollLeft = bodyScrollRef.current.scrollLeft;
    }
  };

  // Get bar color based on health status
  const getHealthBarColor = (healthStatus: HealthStatus): string => {
    const colors: Record<HealthStatus, string> = {
      on_track: '#22c55e',
      at_risk: '#eab308',
      blocked: '#ef4444',
      not_started: '#9ca3af',
    };
    return colors[healthStatus];
  };

  const getBarPosition = (task: GanttTask, rowIndex: number, useDragDates = false) => {
    const dates = useDragDates ? getDragAdjustedDates(task) : { start: task.start, end: task.end };
    const startOffset = differenceInDays(dates.start, startDate);
    const duration = differenceInDays(dates.end, dates.start) + 1;

    // Center bar vertically based on depth (smaller bars for deeper items)
    const heights = [22, 20, 18, 16];
    const barHeight = heights[Math.min(task.depth, 3)];
    const topOffset = (ROW_HEIGHT - barHeight) / 2;

    return {
      left: startOffset * dayWidth,
      width: Math.max(duration * dayWidth - 2, 16),
      top: rowIndex * ROW_HEIGHT + topOffset,
      height: barHeight,
    };
  };

  // Generate dependency arrow paths
  const dependencyPaths = useMemo(() => {
    const paths: Array<{ path: string; parentId: string; childId: string }> = [];

    // Create a map of task ID to row index and position
    const taskIndexMap = new Map<string, number>();
    tasks.forEach((task, index) => {
      taskIndexMap.set(task.bead.id, index);
    });

    // Draw arrows for dependencies where both parent and child are visible
    for (const dep of dependencies) {
      if (dep.type === "blocks") {
        const parentIdx = taskIndexMap.get(dep.issue_id);
        const childIdx = taskIndexMap.get(dep.depends_on_id);

        if (parentIdx !== undefined && childIdx !== undefined) {
          const parentTask = tasks[parentIdx];
          const childTask = tasks[childIdx];
          const parentPos = getBarPosition(parentTask, parentIdx);
          const childPos = getBarPosition(childTask, childIdx);

          // Draw curved arrow from end of child bar to end of parent bar
          // This shows the child task "connecting to" its containing parent epic
          const x1 = childPos.left + childPos.width;  // END of child
          const y1 = childPos.top + childPos.height / 2;
          const x2 = parentPos.left + parentPos.width;  // END of parent
          const y2 = parentPos.top + parentPos.height / 2;

          // Control points for bezier curve
          const midX = (x1 + x2) / 2;
          const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

          paths.push({
            path,
            parentId: dep.issue_id,
            childId: dep.depends_on_id,
          });
        }
      }
    }

    return paths;
  }, [tasks, dependencies, dayWidth, startDate]);

  const handleSave = async (updates: Record<string, unknown>) => {
    if (!editingBead) return;
    await onUpdate(editingBead.id, editingBead.team, updates);
    setEditingBead(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = Math.min(rowIndex + 1, tasks.length - 1);
      setFocusedRowIndex(nextIndex);
      rowRefs.current.get(nextIndex)?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = Math.max(rowIndex - 1, 0);
      setFocusedRowIndex(prevIndex);
      rowRefs.current.get(prevIndex)?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setEditingBead(tasks[rowIndex].bead);
    }
  };

  // Drag handlers for date changes
  const handleDragStart = (
    e: React.MouseEvent,
    task: GanttTask,
    type: "move" | "resize-start" | "resize-end"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({
      taskId: task.bead.id,
      type,
      startX: e.clientX,
      originalStart: task.start,
      originalEnd: task.end,
      currentStart: task.start,
      currentEnd: task.end,
    });
  };

  // Handle mouse move during drag
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startX;
      const deltaDays = Math.round(deltaX / dayWidth);

      if (deltaDays === 0 && dragState.currentStart.getTime() === dragState.originalStart.getTime()) {
        return;
      }

      let newStart = dragState.originalStart;
      let newEnd = dragState.originalEnd;

      if (dragState.type === "move") {
        newStart = addDays(dragState.originalStart, deltaDays);
        newEnd = addDays(dragState.originalEnd, deltaDays);
      } else if (dragState.type === "resize-start") {
        newStart = addDays(dragState.originalStart, deltaDays);
        // Ensure start doesn't go past end
        if (newStart >= newEnd) {
          newStart = addDays(newEnd, -1);
        }
      } else if (dragState.type === "resize-end") {
        newEnd = addDays(dragState.originalEnd, deltaDays);
        // Ensure end doesn't go before start
        if (newEnd <= newStart) {
          newEnd = addDays(newStart, 1);
        }
      }

      setDragState((prev) =>
        prev
          ? { ...prev, currentStart: newStart, currentEnd: newEnd }
          : null
      );
    };

    const handleMouseUp = async () => {
      if (dragState) {
        const task = tasks.find((t) => t.bead.id === dragState.taskId);
        if (task) {
          const startChanged =
            dragState.currentStart.getTime() !== dragState.originalStart.getTime();
          const endChanged =
            dragState.currentEnd.getTime() !== dragState.originalEnd.getTime();

          if (startChanged || endChanged) {
            // Update the title with new date range
            const newTitle = updateTitleWithDates(
              task.bead.title,
              dragState.currentStart,
              dragState.currentEnd
            );
            if (newTitle !== task.bead.title) {
              await onUpdate(task.bead.id, task.bead.team, { title: newTitle });
            }
          }
        }
      }
      setDragState(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, dayWidth, tasks, onUpdate]);

  // Helper to update title with new dates
  const updateTitleWithDates = (title: string, start: Date, end: Date): string => {
    // Remove existing date range pattern like [Jan 15-20] or [Jan 15 - Feb 3]
    const dateRangePattern = /\[[A-Za-z]{3}\s+\d{1,2}(?:\s*-\s*(?:[A-Za-z]{3}\s+)?\d{1,2})?\]\s*/;
    const cleanTitle = title.replace(dateRangePattern, "");

    // Format new date range
    const startMonth = format(start, "MMM");
    const endMonth = format(end, "MMM");
    const startDay = format(start, "d");
    const endDay = format(end, "d");

    let dateRange: string;
    if (startMonth === endMonth) {
      dateRange = `[${startMonth} ${startDay}-${endDay}]`;
    } else {
      dateRange = `[${startMonth} ${startDay} - ${endMonth} ${endDay}]`;
    }

    return `${dateRange} ${cleanTitle}`;
  };

  // Get drag-adjusted position for a task
  const getDragAdjustedDates = (task: GanttTask): { start: Date; end: Date } => {
    if (dragState && dragState.taskId === task.bead.id) {
      return { start: dragState.currentStart, end: dragState.currentEnd };
    }
    return { start: task.start, end: task.end };
  };

  const timelineWidth = days.length * dayWidth;
  const bodyHeight = tasks.length * ROW_HEIGHT;

  return (
    <>
      <div className="gantt-wrapper">
        {/* Advanced filter bar */}
        <FilterBar
          beads={beads}
          teams={teams}
          selectedTeam={selectedTeam}
          onTeamChange={onTeamChange}
          searchQuery={filterContext.filters.search}
          onSearchChange={filterContext.setSearch}
          statusFilter={filterContext.filters.status}
          onStatusChange={filterContext.setStatus}
          priorityFilter={filterContext.filters.priority}
          onPriorityChange={filterContext.setPriority}
          issueTypeFilter={filterContext.filters.issueType}
          onIssueTypeChange={filterContext.setIssueType}
          dueDateFilter={filterContext.filters.dueDate}
          onDueDateChange={filterContext.setDueDate}
          onClearAllFilters={() => {
            filterContext.clearFilters();
            onTeamChange(null);
          }}
          onClearFilter={(filterType) => {
            switch (filterType) {
              case "status":
                filterContext.setStatus([]);
                break;
              case "priority":
                filterContext.setPriority([]);
                break;
              case "issueType":
                filterContext.setIssueType([]);
                break;
              case "dueDate":
                filterContext.setDueDate({ preset: "all" });
                break;
              case "team":
                onTeamChange(null);
                break;
            }
          }}
        />

        {/* Fixed header row */}
        <div className="gantt-header-row">
          <div className="gantt-info-header">
            <span style={{ flex: 1 }}>Task</span>
            <span style={{ width: 36 }}>P</span>
            <span style={{ width: 70 }}>Status</span>
            <span style={{ width: 40 }}>Team</span>
            <div className="zoom-controls">
              <input
                type="range"
                min="0"
                max={ZOOM_LEVELS.length - 1}
                value={zoomIndex}
                onChange={(e) => setZoomIndex(parseInt(e.target.value))}
                className="zoom-slider"
                aria-label={`Zoom level: ${dayWidth}px per day`}
                title={`Zoom: ${dayWidth}px/day`}
              />
              <span className="zoom-label" aria-live="polite">
                {dayWidth}px/day
              </span>
            </div>
          </div>
          <div className="gantt-timeline-header" ref={headerTimelineRef}>
            <div style={{ width: timelineWidth }}>
              <div className="gantt-month-header" style={{ width: timelineWidth }}>
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="gantt-month"
                    style={{ width: m.days * dayWidth }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
              <div className="gantt-day-header" style={{ width: timelineWidth }}>
                {timeHeaderUnits.mode === "weeks" ? (
                  // Week view
                  timeHeaderUnits.units.map((unit, i) => (
                    <div
                      key={i}
                      className={`gantt-week ${unit.hasToday ? "has-today" : ""}`}
                      style={{ width: unit.width }}
                      title={`Week of ${unit.label}`}
                    >
                      {unit.width > 40 ? unit.label : ""}
                    </div>
                  ))
                ) : (
                  // Day view (full or sparse)
                  timeHeaderUnits.units.map((unit, i) => (
                    <div
                      key={i}
                      className={`gantt-day ${unit.isWeekend ? "weekend" : ""} ${
                        unit.isToday ? "today" : ""
                      }`}
                      style={{ width: unit.width }}
                    >
                      {unit.label}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="gantt-body-scroll" ref={bodyScrollRef} onScroll={handleBodyScroll}>
          {/* Left info column */}
          <div className="gantt-info-column">
            {tasks.map((task, rowIndex) => (
              <div
                key={task.bead.id}
                className="gantt-info-row"
                tabIndex={0}
                ref={(el) => {
                  if (el) {
                    rowRefs.current.set(rowIndex, el);
                  } else {
                    rowRefs.current.delete(rowIndex);
                  }
                }}
                onKeyDown={(e) => handleKeyDown(e, rowIndex)}
                role="row"
                aria-label={`Task ${task.bead.title}, Priority ${task.bead.priority}, Status ${task.bead.status}`}
              >
                <div
                  className="gantt-row-indent"
                  style={{ width: task.depth * INDENT_WIDTH, flexShrink: 0 }}
                />
                {task.hasChildren ? (
                  <button
                    className="gantt-collapse-btn"
                    onClick={() => toggleCollapse(task.bead.id)}
                    aria-label={collapsed.has(task.bead.id) ? "Expand" : "Collapse"}
                  >
                    {collapsed.has(task.bead.id) ? "▶" : "▼"}
                  </button>
                ) : (
                  <span className="gantt-collapse-spacer" />
                )}
                <span
                  className="gantt-row-title"
                  onClick={() => setEditingBead(task.bead)}
                  title={task.bead.title}
                >
                  {task.bead.title}
                </span>
                <span className={`priority-badge priority-${task.bead.priority}`}>
                  {task.bead.priority}
                </span>
                <span className={`status-badge status-${task.bead.status}`}>
                  {task.bead.status.replace("_", " ")}
                </span>
                <span className="team-badge">{task.bead.team}</span>
              </div>
            ))}
          </div>

          {/* Right timeline */}
          <div className="gantt-timeline-body" style={{ width: timelineWidth, height: bodyHeight }}>
            {/* Grid lines */}
            {days.map((day, i) => (
              <div
                key={i}
                className={`gantt-grid-line ${isWeekend(day) ? "weekend" : ""} ${
                  mounted && isToday(day) ? "today" : ""
                }`}
                style={{
                  left: i * dayWidth,
                  width: dayWidth,
                  height: bodyHeight,
                }}
              />
            ))}

            {/* Row separators */}
            {tasks.map((_, i) => (
              <div
                key={i}
                className="gantt-row-line"
                style={{ top: (i + 1) * ROW_HEIGHT - 1 }}
              />
            ))}

            {/* Dependency arrows (SVG) */}
            <svg
              className="gantt-deps-svg"
              style={{ width: timelineWidth, height: bodyHeight }}
              aria-hidden="true"
            >
              {dependencyPaths.map((dep, i) => (
                <path
                  key={`${dep.parentId}-${dep.childId}-${i}`}
                  d={dep.path}
                  className="gantt-dep-line"
                  markerEnd="url(#arrowhead)"
                />
              ))}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="8"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <polygon points="0 0, 10 3, 0 6" fill="#666" />
                </marker>
              </defs>
            </svg>

            {/* Task bars */}
            {tasks.map((task, rowIndex) => {
              const isDragging = dragState?.taskId === task.bead.id;
              const pos = getBarPosition(task, rowIndex, true);
              const dates = getDragAdjustedDates(task);
              const healthColor = getHealthBarColor(task.healthStatus);
              return (
                <div
                  key={task.bead.id}
                  className={`gantt-bar ${task.bead.issue_type} depth-${Math.min(task.depth, 3)} ${isDragging ? "dragging" : ""} health-${task.healthStatus}`}
                  style={{
                    left: pos.left,
                    width: pos.width,
                    top: pos.top,
                    cursor: dragState ? (dragState.type === "move" ? "grabbing" : "ew-resize") : "grab",
                    backgroundColor: healthColor,
                    opacity: task.bead.status === 'closed' ? 0.7 : 0.85,
                  }}
                  tabIndex={0}
                  onClick={() => !dragState && setEditingBead(task.bead)}
                  onMouseDown={(e) => handleDragStart(e, task, "move")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setEditingBead(task.bead);
                    }
                  }}
                  role="button"
                  aria-label={`${task.bead.title}, ${format(dates.start, "MMM d, yyyy")} to ${format(dates.end, "MMM d, yyyy")}, Health: ${task.healthStatus.replace('_', ' ')}`}
                  title={`${task.bead.title}\n${format(dates.start, "MMM d, yyyy")} - ${format(dates.end, "MMM d, yyyy")}\nHealth: ${task.healthStatus.replace('_', ' ')}`}
                >
                  {/* Left resize handle */}
                  <div
                    className="gantt-bar-handle gantt-bar-handle-left"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleDragStart(e, task, "resize-start");
                    }}
                    aria-label="Resize start date"
                  />
                  {/* Time elapsed indicator (planned) */}
                  {task.timeProgress > 0 && task.timeProgress < 100 && (
                    <div
                      className="gantt-bar-time-marker"
                      style={{ left: `${task.timeProgress}%` }}
                      title={`${Math.round(task.timeProgress)}% of time elapsed`}
                    />
                  )}
                  {/* Status-based progress (actual) */}
                  {task.progress > 0 && (
                    <div
                      className={`gantt-bar-progress ${
                        task.progress < task.timeProgress - 10 ? "behind" :
                        task.progress > task.timeProgress + 10 ? "ahead" : ""
                      }`}
                      style={{ width: `${task.progress}%` }}
                    />
                  )}
                  <span className="gantt-bar-label">
                    {pos.width > 80 ? task.bead.title.replace(/^\[[^\]]+\]\s*/, "") : ""}
                  </span>
                  {/* Schedule indicator */}
                  {task.bead.status !== "closed" && task.timeProgress > 0 && pos.width > 50 && (
                    <span className={`gantt-bar-schedule-indicator ${
                      task.progress < task.timeProgress - 10 ? "behind" :
                      task.progress > task.timeProgress + 10 ? "ahead" : "on-track"
                    }`}>
                      {task.progress < task.timeProgress - 10 ? "⚠" :
                       task.progress > task.timeProgress + 10 ? "✓" : ""}
                    </span>
                  )}
                  {/* Right resize handle */}
                  <div
                    className="gantt-bar-handle gantt-bar-handle-right"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleDragStart(e, task, "resize-end");
                    }}
                    aria-label="Resize end date"
                  />
                  {/* Drag tooltip */}
                  {isDragging && (
                    <div className="gantt-drag-tooltip">
                      {format(dates.start, "MMM d")} - {format(dates.end, "MMM d")}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Today line - only render after mount to avoid hydration mismatch */}
            {mounted && (() => {
              const todayOffset = differenceInDays(new Date(), startDate);
              if (todayOffset >= 0 && todayOffset < days.length) {
                return (
                  <div
                    className="gantt-today-line"
                    style={{ left: todayOffset * dayWidth + dayWidth / 2 }}
                  />
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>

      <div className="legend">
        <div className="legend-section">
          <div className="legend-title" style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Issue Types
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div className="legend-item">
              <div className="legend-color" style={{ background: "#7c3aed" }} />
              <span>Epic</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: "#2563eb" }} />
              <span>Feature</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: "#059669" }} />
              <span>Task</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: "#dc2626" }} />
              <span>Bug</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: "#3b82f6", width: 2, height: 12 }} />
              <span>Today</span>
            </div>
          </div>
        </div>
        <div className="legend-section" style={{ marginLeft: 'auto' }}>
          <div className="legend-title" style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Health Status
          </div>
          <HealthLegend compact={true} />
        </div>
      </div>

      {editingBead && (
        <EditModal
          bead={editingBead}
          onClose={() => setEditingBead(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
