import { useMemo } from 'react';
import type { Bead } from '@/lib/types';
import { type GroupByOption, generateGroupId, getGroupLabel, getGroupSortOrder } from './GroupingContext';

export interface GroupedBeads {
  groupId: string;
  groupLabel: string;
  groupValue: string | number | null;
  beads: Bead[];
  completedCount: number;
  progressPercent: number;
}

/**
 * Hook to group beads based on a grouping option
 */
export function useBeadGrouping(beads: Bead[], groupBy: GroupByOption): GroupedBeads[] {
  return useMemo(() => {
    if (groupBy === 'none') {
      return [{
        groupId: 'all',
        groupLabel: 'All Items',
        groupValue: null,
        beads,
        completedCount: beads.filter(b => b.status === 'closed').length,
        progressPercent: beads.length > 0
          ? (beads.filter(b => b.status === 'closed').length / beads.length) * 100
          : 0,
      }];
    }

    // Group beads by the selected field
    const groupMap = new Map<string | number | null, Bead[]>();

    beads.forEach(bead => {
      let groupValue: string | number | null = null;

      switch (groupBy) {
        case 'status':
          groupValue = bead.status;
          break;
        case 'priority':
          groupValue = bead.priority;
          break;
        case 'team':
          groupValue = bead.team || null;
          break;
        case 'assignee':
          groupValue = bead.assignee || null;
          break;
      }

      if (!groupMap.has(groupValue)) {
        groupMap.set(groupValue, []);
      }
      groupMap.get(groupValue)!.push(bead);
    });

    // Convert map to array and sort
    const groups = Array.from(groupMap.entries()).map(([groupValue, groupBeads]) => {
      const completedCount = groupBeads.filter(b => b.status === 'closed').length;
      const progressPercent = groupBeads.length > 0
        ? (completedCount / groupBeads.length) * 100
        : 0;

      return {
        groupId: generateGroupId(groupBy, groupValue),
        groupLabel: getGroupLabel(groupBy, groupValue),
        groupValue,
        beads: groupBeads,
        completedCount,
        progressPercent,
      };
    });

    // Sort groups based on the grouping type
    const sortFn = getGroupSortOrder(groupBy);
    groups.sort((a, b) => sortFn(a.groupValue, b.groupValue));

    return groups;
  }, [beads, groupBy]);
}

/**
 * Hook to get group statistics
 */
export function useGroupStatistics(groups: GroupedBeads[]) {
  return useMemo(() => {
    const totalItems = groups.reduce((sum, g) => sum + g.beads.length, 0);
    const totalCompleted = groups.reduce((sum, g) => sum + g.completedCount, 0);
    const overallProgress = totalItems > 0 ? (totalCompleted / totalItems) * 100 : 0;

    const statusCounts = {
      open: 0,
      in_progress: 0,
      closed: 0,
      blocked: 0,
      deferred: 0,
    };

    groups.forEach(group => {
      group.beads.forEach(bead => {
        if (bead.status in statusCounts) {
          statusCounts[bead.status as keyof typeof statusCounts]++;
        }
      });
    });

    return {
      totalItems,
      totalCompleted,
      overallProgress,
      groupCount: groups.length,
      statusCounts,
    };
  }, [groups]);
}

/**
 * Hook to filter groups by search and other criteria
 */
export function useFilteredGroups(
  groups: GroupedBeads[],
  searchQuery: string = '',
  statusFilter: string[] = [],
  priorityFilter: number[] = []
): GroupedBeads[] {
  return useMemo(() => {
    if (!searchQuery && statusFilter.length === 0 && priorityFilter.length === 0) {
      return groups;
    }

    return groups.map(group => {
      const filteredBeads = group.beads.filter(bead => {
        // Search filter
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          if (!bead.title.toLowerCase().includes(searchLower)) {
            return false;
          }
        }

        // Status filter
        if (statusFilter.length > 0 && !statusFilter.includes(bead.status)) {
          return false;
        }

        // Priority filter
        if (priorityFilter.length > 0 && !priorityFilter.includes(bead.priority)) {
          return false;
        }

        return true;
      });

      const completedCount = filteredBeads.filter(b => b.status === 'closed').length;
      const progressPercent = filteredBeads.length > 0
        ? (completedCount / filteredBeads.length) * 100
        : 0;

      return {
        ...group,
        beads: filteredBeads,
        completedCount,
        progressPercent,
      };
    }).filter(group => group.beads.length > 0); // Remove empty groups
  }, [groups, searchQuery, statusFilter, priorityFilter]);
}
