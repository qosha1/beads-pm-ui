"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FilterState,
  initialFilterState,
  StatusFilter,
  PriorityFilter,
  IssueTypeFilter,
  DueDateFilter,
  FilterContextValue,
} from "../filters/FilterContext";
import type { Bead } from "@/lib/types";
import {
  isToday as isTodayFn,
  isThisWeek,
  isThisMonth,
  isBefore,
  startOfDay,
  endOfDay,
  isWithinInterval,
} from "date-fns";

/**
 * Custom hook for managing filter state with URL synchronization
 * Implements shareable filtered views via URL parameters
 */
export function useFilters(): FilterContextValue {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>(() => {
    // Initialize from URL params if available
    return parseFiltersFromURL(searchParams);
  });

  // Sync filters to URL when they change
  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.search) {
      params.set("search", filters.search);
    }

    if (filters.status.length > 0) {
      params.set("status", filters.status.join(","));
    }

    if (filters.priority.length > 0) {
      params.set("priority", filters.priority.join(","));
    }

    if (filters.issueType.length > 0) {
      params.set("type", filters.issueType.join(","));
    }

    if (filters.dueDate.preset !== "all") {
      params.set("due", filters.dueDate.preset);
    }

    if (filters.dueDate.customRange) {
      params.set("dueFrom", filters.dueDate.customRange.start.toISOString());
      params.set("dueTo", filters.dueDate.customRange.end.toISOString());
    }

    const queryString = params.toString();
    const newURL = queryString ? `?${queryString}` : window.location.pathname;

    // Only update if URL actually changed to avoid unnecessary history entries
    if (window.location.search !== `?${queryString}`) {
      window.history.replaceState({}, "", newURL);
    }
  }, [filters, router]);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const setStatus = useCallback((status: StatusFilter[]) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setPriority = useCallback((priority: PriorityFilter[]) => {
    setFilters((prev) => ({ ...prev, priority }));
  }, []);

  const setIssueType = useCallback((issueType: IssueTypeFilter[]) => {
    setFilters((prev) => ({ ...prev, issueType }));
  }, []);

  const setDueDate = useCallback((dueDate: DueDateFilter) => {
    setFilters((prev) => ({ ...prev, dueDate }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilterState);
  }, []);

  const clearFilter = useCallback((filterType: keyof FilterState) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: initialFilterState[filterType],
    }));
  }, []);

  // Count active filters (excluding search as it's always visible)
  const activeFilterCount = useMemo(() => {
    return (
      filters.status.length +
      filters.priority.length +
      filters.issueType.length +
      (filters.dueDate.preset !== "all" ? 1 : 0)
    );
  }, [filters]);

  // Apply filters to beads array
  const applyFilters = useCallback(
    (beads: Bead[]): Bead[] => {
      return beads.filter((bead) => {
        // Search filter
        if (filters.search.trim()) {
          const searchLower = filters.search.toLowerCase();
          if (!bead.title.toLowerCase().includes(searchLower)) {
            return false;
          }
        }

        // Status filter
        if (filters.status.length > 0) {
          if (!filters.status.includes(bead.status as StatusFilter)) {
            return false;
          }
        }

        // Priority filter
        if (filters.priority.length > 0) {
          if (!filters.priority.includes(bead.priority as PriorityFilter)) {
            return false;
          }
        }

        // Issue type filter
        if (filters.issueType.length > 0) {
          if (!filters.issueType.includes(bead.issue_type as IssueTypeFilter)) {
            return false;
          }
        }

        // Due date filter
        if (filters.dueDate.preset !== "all") {
          // Items without due_at are excluded from date-based filters
          if (!bead.due_at) {
            return false;
          }

          const dueDate = new Date(bead.due_at);
          const now = new Date();

          switch (filters.dueDate.preset) {
            case "overdue":
              // Overdue: due date is in the past and not closed
              if (
                !isBefore(endOfDay(dueDate), startOfDay(now)) ||
                bead.status === "closed"
              ) {
                return false;
              }
              break;
            case "today":
              if (!isTodayFn(dueDate)) {
                return false;
              }
              break;
            case "this_week":
              if (!isThisWeek(dueDate)) {
                return false;
              }
              break;
            case "this_month":
              if (!isThisMonth(dueDate)) {
                return false;
              }
              break;
          }
        }

        // Custom date range filter
        if (filters.dueDate.customRange && bead.due_at) {
          const dueDate = new Date(bead.due_at);
          if (
            !isWithinInterval(dueDate, {
              start: filters.dueDate.customRange.start,
              end: filters.dueDate.customRange.end,
            })
          ) {
            return false;
          }
        }

        return true;
      });
    },
    [filters]
  );

  return {
    filters,
    setSearch,
    setStatus,
    setPriority,
    setIssueType,
    setDueDate,
    clearFilters,
    clearFilter,
    activeFilterCount,
    applyFilters,
  };
}

/**
 * Parse filter state from URL search parameters
 */
function parseFiltersFromURL(searchParams: URLSearchParams): FilterState {
  const state: FilterState = { ...initialFilterState };

  const search = searchParams.get("search");
  if (search) {
    state.search = search;
  }

  const status = searchParams.get("status");
  if (status) {
    state.status = status.split(",").filter((s): s is StatusFilter =>
      ["open", "in_progress", "closed", "blocked", "deferred"].includes(s)
    );
  }

  const priority = searchParams.get("priority");
  if (priority) {
    state.priority = priority
      .split(",")
      .map((p) => parseInt(p, 10))
      .filter((p): p is PriorityFilter => p >= 0 && p <= 4);
  }

  const type = searchParams.get("type");
  if (type) {
    state.issueType = type.split(",").filter((t): t is IssueTypeFilter =>
      ["epic", "feature", "task", "bug"].includes(t)
    );
  }

  const due = searchParams.get("due");
  if (due && ["overdue", "today", "this_week", "this_month"].includes(due)) {
    state.dueDate.preset = due as Exclude<typeof state.dueDate.preset, "all">;
  }

  const dueFrom = searchParams.get("dueFrom");
  const dueTo = searchParams.get("dueTo");
  if (dueFrom && dueTo) {
    const startDate = new Date(dueFrom);
    const endDate = new Date(dueTo);
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      state.dueDate.customRange = { start: startDate, end: endDate };
    }
  }

  return state;
}
