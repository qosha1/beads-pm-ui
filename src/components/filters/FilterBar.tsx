"use client";

import { useMemo, useCallback, useState } from "react";
import { FilterDropdown, FilterOption } from "./FilterDropdown";
import { FilterChip } from "./FilterChip";
import { QuickFilters, QuickFilterPreset } from "./QuickFilters";
import {
  StatusFilter,
  PriorityFilter,
  IssueTypeFilter,
  DueDateFilter,
} from "./FilterContext";
import type { Bead } from "@/lib/types";

export interface Team {
  id: string;
  name: string;
}

export interface FilterBarProps {
  beads: Bead[];
  teams?: Team[];
  selectedTeam: string | null;
  onTeamChange: (teamId: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: StatusFilter[];
  onStatusChange: (status: StatusFilter[]) => void;
  priorityFilter: PriorityFilter[];
  onPriorityChange: (priority: PriorityFilter[]) => void;
  issueTypeFilter: IssueTypeFilter[];
  onIssueTypeChange: (types: IssueTypeFilter[]) => void;
  dueDateFilter: DueDateFilter;
  onDueDateChange: (dueDate: DueDateFilter) => void;
  onClearAllFilters: () => void;
  onClearFilter: (filterType: string) => void;
}

/**
 * FilterBar - Main horizontal filter control panel
 * Implements complete wireframe spec with filter chips and quick filters
 */
export function FilterBar({
  beads,
  teams = [],
  selectedTeam,
  onTeamChange,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  issueTypeFilter,
  onIssueTypeChange,
  dueDateFilter,
  onDueDateChange,
  onClearAllFilters,
  onClearFilter,
}: FilterBarProps) {
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Calculate counts for each filter option
  const statusOptions: FilterOption[] = useMemo(() => {
    const statusCounts = new Map<string, number>();
    beads.forEach((bead) => {
      statusCounts.set(bead.status, (statusCounts.get(bead.status) || 0) + 1);
    });

    return [
      {
        value: "open",
        label: "Open",
        count: statusCounts.get("open") || 0,
        icon: <span className="status-dot status-open" />,
      },
      {
        value: "in_progress",
        label: "In Progress",
        count: statusCounts.get("in_progress") || 0,
        icon: <span className="status-dot status-in-progress" />,
      },
      {
        value: "closed",
        label: "Closed",
        count: statusCounts.get("closed") || 0,
        icon: <span className="status-dot status-closed" />,
      },
      {
        value: "blocked",
        label: "Blocked",
        count: statusCounts.get("blocked") || 0,
        icon: <span className="status-dot status-blocked" />,
      },
      {
        value: "deferred",
        label: "Deferred",
        count: statusCounts.get("deferred") || 0,
        icon: <span className="status-dot status-deferred" />,
      },
    ];
  }, [beads]);

  const priorityOptions: FilterOption[] = useMemo(() => {
    const priorityCounts = new Map<number, number>();
    beads.forEach((bead) => {
      priorityCounts.set(
        bead.priority,
        (priorityCounts.get(bead.priority) || 0) + 1
      );
    });

    return [
      {
        value: "0",
        label: "P0 - Critical",
        count: priorityCounts.get(0) || 0,
        icon: <span className="priority-dot priority-0" />,
      },
      {
        value: "1",
        label: "P1 - High",
        count: priorityCounts.get(1) || 0,
        icon: <span className="priority-dot priority-1" />,
      },
      {
        value: "2",
        label: "P2 - Medium",
        count: priorityCounts.get(2) || 0,
        icon: <span className="priority-dot priority-2" />,
      },
      {
        value: "3",
        label: "P3 - Low",
        count: priorityCounts.get(3) || 0,
        icon: <span className="priority-dot priority-3" />,
      },
      {
        value: "4",
        label: "P4 - None",
        count: priorityCounts.get(4) || 0,
        icon: <span className="priority-dot priority-4" />,
      },
    ];
  }, [beads]);

  const issueTypeOptions: FilterOption[] = useMemo(() => {
    const typeCounts = new Map<string, number>();
    beads.forEach((bead) => {
      typeCounts.set(
        bead.issue_type,
        (typeCounts.get(bead.issue_type) || 0) + 1
      );
    });

    return [
      {
        value: "epic",
        label: "Epic",
        count: typeCounts.get("epic") || 0,
        icon: <span className="type-dot type-epic" />,
      },
      {
        value: "feature",
        label: "Feature",
        count: typeCounts.get("feature") || 0,
        icon: <span className="type-dot type-feature" />,
      },
      {
        value: "task",
        label: "Task",
        count: typeCounts.get("task") || 0,
        icon: <span className="type-dot type-task" />,
      },
      {
        value: "bug",
        label: "Bug",
        count: typeCounts.get("bug") || 0,
        icon: <span className="type-dot type-bug" />,
      },
    ];
  }, [beads]);

  const dueDateOptions: FilterOption[] = [
    { value: "all", label: "Any Date" },
    { value: "overdue", label: "Overdue" },
    { value: "today", label: "Due Today" },
    { value: "this_week", label: "Due This Week" },
    { value: "this_month", label: "Due This Month" },
  ];

  // Build team options from the teams prop
  const teamOptions: FilterOption[] = useMemo(() => {
    const teamCounts = new Map<string, number>();
    beads.forEach((bead) => {
      teamCounts.set(bead.team, (teamCounts.get(bead.team) || 0) + 1);
    });

    return [
      { value: "all", label: "All Teams" },
      ...teams.map((team) => ({
        value: team.id,
        label: team.name,
        count: teamCounts.get(team.id) || 0,
        icon: <span className="team-dot" />,
      })),
    ];
  }, [beads, teams]);

  const handleApplyPreset = useCallback(
    (preset: QuickFilterPreset) => {
      if (activePresetId === preset.id) {
        // Deactivate preset - clear all filters
        setActivePresetId(null);
        onClearAllFilters();
      } else {
        // Apply preset filters - clear existing filters first, then apply preset
        setActivePresetId(preset.id);

        // Clear all filters to avoid accumulation
        onStatusChange([]);
        onPriorityChange([]);
        onDueDateChange({ preset: "all" });

        // Then apply the preset's specific filters
        if (preset.filters.status) {
          onStatusChange(preset.filters.status);
        }
        if (preset.filters.priority) {
          onPriorityChange(preset.filters.priority);
        }
        if (preset.filters.dueDate) {
          onDueDateChange(preset.filters.dueDate);
        }
      }
    },
    [
      activePresetId,
      onStatusChange,
      onPriorityChange,
      onDueDateChange,
      onClearAllFilters,
    ]
  );

  const hasActiveFilters =
    statusFilter.length > 0 ||
    priorityFilter.length > 0 ||
    issueTypeFilter.length > 0 ||
    dueDateFilter.preset !== "all" ||
    selectedTeam !== null;

  // Format filter chip values
  const getStatusChipValue = () => {
    if (statusFilter.length === 1) {
      return statusOptions.find((opt) => opt.value === statusFilter[0])?.label || statusFilter[0];
    }
    if (statusFilter.length <= 3) {
      return statusFilter
        .map((s) => statusOptions.find((opt) => opt.value === s)?.label || s)
        .join(", ");
    }
    return `${statusFilter.length} selected`;
  };

  const getPriorityChipValue = () => {
    if (priorityFilter.length === 1) {
      return `P${priorityFilter[0]}`;
    }
    if (priorityFilter.length <= 3) {
      return priorityFilter.map((p) => `P${p}`).join(", ");
    }
    return `${priorityFilter.length} selected`;
  };

  const getIssueTypeChipValue = () => {
    if (issueTypeFilter.length === 1) {
      return issueTypeOptions.find((opt) => opt.value === issueTypeFilter[0])?.label || issueTypeFilter[0];
    }
    if (issueTypeFilter.length <= 3) {
      return issueTypeFilter
        .map((t) => issueTypeOptions.find((opt) => opt.value === t)?.label || t)
        .join(", ");
    }
    return `${issueTypeFilter.length} selected`;
  };

  const getDueDateChipValue = () => {
    const option = dueDateOptions.find((opt) => opt.value === dueDateFilter.preset);
    return option?.label || dueDateFilter.preset;
  };

  const getTeamChipValue = () => {
    if (!selectedTeam) return "";
    const team = teams.find((t) => t.id === selectedTeam);
    return team?.name || selectedTeam;
  };

  return (
    <div className="filter-bar-container">
      {/* Main filter bar */}
      <div className="filter-bar" role="toolbar" aria-label="Task filters">
        <div className="filter-bar-left">
          {/* Search input */}
          <input
            type="search"
            className="filter-search"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search tasks"
          />

          {/* Filter dropdowns */}
          <div className="filter-dropdowns">
            <FilterDropdown
              label="Status"
              options={statusOptions}
              selectedValues={statusFilter}
              onChange={(values) =>
                onStatusChange(values as StatusFilter[])
              }
              multiSelect
            />

            <FilterDropdown
              label="Priority"
              options={priorityOptions}
              selectedValues={priorityFilter.map(String)}
              onChange={(values) =>
                onPriorityChange(values.map(Number) as PriorityFilter[])
              }
              multiSelect
            />

            <FilterDropdown
              label="Type"
              options={issueTypeOptions}
              selectedValues={issueTypeFilter}
              onChange={(values) =>
                onIssueTypeChange(values as IssueTypeFilter[])
              }
              multiSelect
            />

            <FilterDropdown
              label="Due Date"
              options={dueDateOptions}
              selectedValues={[dueDateFilter.preset]}
              onChange={(values) =>
                onDueDateChange({
                  preset: values[0] as DueDateFilter["preset"],
                })
              }
              multiSelect={false}
            />

            {teams.length > 0 && (
              <FilterDropdown
                label="Team"
                options={teamOptions}
                selectedValues={[selectedTeam || "all"]}
                onChange={(values) => {
                  const value = values[0];
                  onTeamChange(value === "all" ? null : value);
                }}
                multiSelect={false}
              />
            )}
          </div>
        </div>

        <div className="filter-bar-right">
          {hasActiveFilters && (
            <button
              className="filter-clear-all"
              onClick={onClearAllFilters}
              aria-label="Clear all filters"
              type="button"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Active filters chips row */}
      {hasActiveFilters && (
        <div
          className="active-filters-row"
          role="region"
          aria-label="Active filters"
          aria-live="polite"
        >
          <span className="active-filters-label">Active Filters:</span>
          <div className="active-filters-chips">
            {statusFilter.length > 0 && (
              <FilterChip
                label="Status"
                value={getStatusChipValue()}
                onRemove={() => onClearFilter("status")}
              />
            )}
            {priorityFilter.length > 0 && (
              <FilterChip
                label="Priority"
                value={getPriorityChipValue()}
                onRemove={() => onClearFilter("priority")}
              />
            )}
            {issueTypeFilter.length > 0 && (
              <FilterChip
                label="Type"
                value={getIssueTypeChipValue()}
                onRemove={() => onClearFilter("issueType")}
              />
            )}
            {dueDateFilter.preset !== "all" && (
              <FilterChip
                label="Due"
                value={getDueDateChipValue()}
                onRemove={() => onClearFilter("dueDate")}
              />
            )}
            {selectedTeam !== null && (
              <FilterChip
                label="Team"
                value={getTeamChipValue()}
                onRemove={() => onClearFilter("team")}
              />
            )}
          </div>
        </div>
      )}

      {/* Quick filters */}
      <QuickFilters
        onApplyPreset={handleApplyPreset}
        activePresetId={activePresetId}
      />
    </div>
  );
}
