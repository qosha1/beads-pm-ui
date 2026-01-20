"use client";

import { createContext, useContext, ReactNode } from "react";
import type { Bead } from "@/lib/types";

export type StatusFilter = "open" | "in_progress" | "closed" | "blocked" | "deferred";
export type PriorityFilter = 0 | 1 | 2 | 3 | 4;
export type IssueTypeFilter = "epic" | "feature" | "task" | "bug";

export type DueDatePreset = "all" | "overdue" | "today" | "this_week" | "this_month";

export interface DueDateFilter {
  preset: DueDatePreset;
  customRange?: { start: Date; end: Date };
}

export interface FilterState {
  search: string;
  status: StatusFilter[];
  priority: PriorityFilter[];
  issueType: IssueTypeFilter[];
  dueDate: DueDateFilter;
}

export interface FilterContextValue {
  filters: FilterState;
  setSearch: (search: string) => void;
  setStatus: (status: StatusFilter[]) => void;
  setPriority: (priority: PriorityFilter[]) => void;
  setIssueType: (issueType: IssueTypeFilter[]) => void;
  setDueDate: (dueDate: DueDateFilter) => void;
  clearFilters: () => void;
  clearFilter: (filterType: keyof FilterState) => void;
  activeFilterCount: number;
  applyFilters: (beads: Bead[]) => Bead[];
}

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

export const initialFilterState: FilterState = {
  search: "",
  status: [],
  priority: [],
  issueType: [],
  dueDate: { preset: "all" },
};

export function useFilterContext() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilterContext must be used within FilterProvider");
  }
  return context;
}

export default FilterContext;
