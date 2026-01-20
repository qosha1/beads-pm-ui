"use client";

import { useCallback } from "react";
import type {
  StatusFilter,
  PriorityFilter,
  DueDateFilter,
} from "./FilterContext";

export interface QuickFilterPreset {
  id: string;
  label: string;
  icon?: string;
  filters: {
    status?: StatusFilter[];
    priority?: PriorityFilter[];
    dueDate?: DueDateFilter;
  };
}

export interface QuickFiltersProps {
  onApplyPreset: (preset: QuickFilterPreset) => void;
  activePresetId?: string | null;
}

const QUICK_FILTER_PRESETS: QuickFilterPreset[] = [
  {
    id: "overdue",
    label: "Overdue",
    icon: "⚠",
    filters: {
      dueDate: { preset: "overdue" },
    },
  },
  {
    id: "due-today",
    label: "Due Today",
    icon: "📅",
    filters: {
      dueDate: { preset: "today" },
    },
  },
  {
    id: "this-week",
    label: "This Week",
    icon: "🗓",
    filters: {
      dueDate: { preset: "this_week" },
    },
  },
  {
    id: "in-progress",
    label: "In Progress",
    icon: "▶",
    filters: {
      status: ["in_progress"],
    },
  },
  {
    id: "blocked",
    label: "Blocked",
    icon: "🚫",
    filters: {
      status: ["blocked"],
    },
  },
  {
    id: "high-priority",
    label: "High Priority",
    icon: "🔴",
    filters: {
      priority: [0, 1],
    },
  },
];

/**
 * QuickFilters - One-click preset filter buttons
 * Implements wireframe spec for quick access to common filter combinations
 */
export function QuickFilters({
  onApplyPreset,
  activePresetId,
}: QuickFiltersProps) {
  const handlePresetClick = useCallback(
    (preset: QuickFilterPreset) => {
      onApplyPreset(preset);
    },
    [onApplyPreset]
  );

  return (
    <div className="quick-filters" role="toolbar" aria-label="Quick filters">
      <span className="quick-filters-label">Quick Filters:</span>
      <div className="quick-filters-buttons">
        {QUICK_FILTER_PRESETS.map((preset) => (
          <button
            key={preset.id}
            className={`quick-filter-btn ${
              activePresetId === preset.id ? "active" : ""
            }`}
            onClick={() => handlePresetClick(preset)}
            aria-pressed={activePresetId === preset.id}
            aria-label={preset.label}
            type="button"
          >
            {preset.icon && (
              <span className="quick-filter-icon" aria-hidden="true">
                {preset.icon}
              </span>
            )}
            <span>{preset.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
