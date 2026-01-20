import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBeadGrouping, useGroupStatistics, useFilteredGroups } from '../useBeadGrouping';
import type { Bead } from '@/lib/types';

const mockBeads: Bead[] = [
  {
    id: '1',
    title: 'Task 1',
    description: 'Description 1',
    status: 'open',
    priority: 0,
    issue_type: 'task',
    assignee: 'alice',
    estimated_minutes: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    due_at: '2024-01-15T00:00:00Z',
    defer_until: null,
    team: 'eng',
  },
  {
    id: '2',
    title: 'Task 2',
    description: 'Description 2',
    status: 'in_progress',
    priority: 1,
    issue_type: 'feature',
    assignee: 'bob',
    estimated_minutes: null,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    due_at: '2024-01-20T00:00:00Z',
    defer_until: null,
    team: 'eng',
  },
  {
    id: '3',
    title: 'Task 3',
    description: 'Description 3',
    status: 'closed',
    priority: 2,
    issue_type: 'bug',
    assignee: 'alice',
    estimated_minutes: null,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
    due_at: '2024-01-10T00:00:00Z',
    defer_until: null,
    team: 'pm',
  },
  {
    id: '4',
    title: 'Task 4',
    description: 'Description 4',
    status: 'blocked',
    priority: 0,
    issue_type: 'bug',
    assignee: null,
    estimated_minutes: null,
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
    due_at: null,
    defer_until: null,
    team: 'eng',
  },
];

describe('useBeadGrouping', () => {
  describe('Group by none', () => {
    it('returns single group with all beads', () => {
      const { result } = renderHook(() => useBeadGrouping(mockBeads, 'none'));

      expect(result.current).toHaveLength(1);
      expect(result.current[0].groupId).toBe('all');
      expect(result.current[0].beads).toHaveLength(4);
    });

    it('calculates progress for ungrouped beads', () => {
      const { result } = renderHook(() => useBeadGrouping(mockBeads, 'none'));

      expect(result.current[0].completedCount).toBe(1);
      expect(result.current[0].progressPercent).toBe(25); // 1 out of 4
    });
  });

  describe('Group by status', () => {
    it('groups beads by status', () => {
      const { result } = renderHook(() => useBeadGrouping(mockBeads, 'status'));

      expect(result.current).toHaveLength(4); // open, in_progress, blocked, closed
      expect(result.current.map(g => g.groupLabel)).toContain('Open');
      expect(result.current.map(g => g.groupLabel)).toContain('In Progress');
      expect(result.current.map(g => g.groupLabel)).toContain('Blocked');
      expect(result.current.map(g => g.groupLabel)).toContain('Closed');
    });

    it('sorts status groups in priority order', () => {
      const { result } = renderHook(() => useBeadGrouping(mockBeads, 'status'));

      const labels = result.current.map(g => g.groupLabel);
      const blockedIndex = labels.indexOf('Blocked');
      const closedIndex = labels.indexOf('Closed');

      // Blocked should come before Closed in priority
      expect(blockedIndex).toBeLessThan(closedIndex);
    });

    it('counts beads correctly in each status group', () => {
      const { result } = renderHook(() => useBeadGrouping(mockBeads, 'status'));

      const openGroup = result.current.find(g => g.groupLabel === 'Open');
      const closedGroup = result.current.find(g => g.groupLabel === 'Closed');

      expect(openGroup?.beads).toHaveLength(1);
      expect(closedGroup?.beads).toHaveLength(1);
    });
  });

  describe('Group by priority', () => {
    it('groups beads by priority', () => {
      const { result } = renderHook(() => useBeadGrouping(mockBeads, 'priority'));

      expect(result.current.length).toBeGreaterThan(0);
      expect(result.current.map(g => g.groupLabel)).toContain('P0 - Critical');
    });

    it('sorts priority groups numerically', () => {
      const { result } = renderHook(() => useBeadGrouping(mockBeads, 'priority'));

      const priorities = result.current.map(g => g.groupValue as number);
      for (let i = 1; i < priorities.length; i++) {
        expect(priorities[i]).toBeGreaterThanOrEqual(priorities[i - 1]);
      }
    });
  });

  describe('Group by team', () => {
    it('groups beads by team', () => {
      const { result } = renderHook(() => useBeadGrouping(mockBeads, 'team'));

      expect(result.current).toHaveLength(2); // eng and pm
      expect(result.current.map(g => g.groupLabel)).toContain('eng');
      expect(result.current.map(g => g.groupLabel)).toContain('pm');
    });

    it('sorts teams alphabetically', () => {
      const { result } = renderHook(() => useBeadGrouping(mockBeads, 'team'));

      const teams = result.current.map(g => g.groupLabel);
      expect(teams[0]).toBe('eng');
      expect(teams[1]).toBe('pm');
    });
  });

  describe('Group by assignee', () => {
    it('groups beads by assignee', () => {
      const { result } = renderHook(() => useBeadGrouping(mockBeads, 'assignee'));

      expect(result.current.length).toBeGreaterThan(0);
      expect(result.current.map(g => g.groupLabel)).toContain('alice');
      expect(result.current.map(g => g.groupLabel)).toContain('bob');
    });

    it('handles null assignee', () => {
      const { result } = renderHook(() => useBeadGrouping(mockBeads, 'assignee'));

      const unassignedGroup = result.current.find(g => g.groupLabel === 'Unassigned');
      expect(unassignedGroup).toBeDefined();
      expect(unassignedGroup?.beads).toHaveLength(1);
    });
  });

  describe('Progress calculation', () => {
    it('calculates completedCount correctly', () => {
      const { result } = renderHook(() => useBeadGrouping(mockBeads, 'team'));

      const engGroup = result.current.find(g => g.groupLabel === 'eng');
      expect(engGroup?.completedCount).toBe(0); // No closed tasks in eng

      const pmGroup = result.current.find(g => g.groupLabel === 'pm');
      expect(pmGroup?.completedCount).toBe(1); // One closed task in pm
    });

    it('calculates progressPercent correctly', () => {
      const { result } = renderHook(() => useBeadGrouping(mockBeads, 'team'));

      const pmGroup = result.current.find(g => g.groupLabel === 'pm');
      expect(pmGroup?.progressPercent).toBe(100); // 1 out of 1 completed
    });

    it('handles empty groups', () => {
      const { result } = renderHook(() => useBeadGrouping([], 'none'));

      expect(result.current).toHaveLength(1);
      expect(result.current[0].progressPercent).toBe(0);
      expect(result.current[0].beads).toHaveLength(0);
    });
  });
});

describe('useGroupStatistics', () => {
  it('calculates total items', () => {
    const groups = renderHook(() => useBeadGrouping(mockBeads, 'status')).result.current;
    const { result } = renderHook(() => useGroupStatistics(groups));

    expect(result.current.totalItems).toBe(4);
  });

  it('calculates total completed', () => {
    const groups = renderHook(() => useBeadGrouping(mockBeads, 'status')).result.current;
    const { result } = renderHook(() => useGroupStatistics(groups));

    expect(result.current.totalCompleted).toBe(1);
  });

  it('calculates overall progress', () => {
    const groups = renderHook(() => useBeadGrouping(mockBeads, 'status')).result.current;
    const { result } = renderHook(() => useGroupStatistics(groups));

    expect(result.current.overallProgress).toBe(25);
  });

  it('counts groups', () => {
    const groups = renderHook(() => useBeadGrouping(mockBeads, 'status')).result.current;
    const { result } = renderHook(() => useGroupStatistics(groups));

    expect(result.current.groupCount).toBe(4);
  });

  it('calculates status counts', () => {
    const groups = renderHook(() => useBeadGrouping(mockBeads, 'team')).result.current;
    const { result } = renderHook(() => useGroupStatistics(groups));

    expect(result.current.statusCounts.open).toBe(1);
    expect(result.current.statusCounts.in_progress).toBe(1);
    expect(result.current.statusCounts.closed).toBe(1);
    expect(result.current.statusCounts.blocked).toBe(1);
  });
});

describe('useFilteredGroups', () => {
  it('filters by search query', () => {
    const groups = renderHook(() => useBeadGrouping(mockBeads, 'status')).result.current;
    const { result } = renderHook(() => useFilteredGroups(groups, 'Task 1'));

    const totalBeads = result.current.reduce((sum, g) => sum + g.beads.length, 0);
    expect(totalBeads).toBe(1);
  });

  it('filters by status', () => {
    const groups = renderHook(() => useBeadGrouping(mockBeads, 'team')).result.current;
    const { result } = renderHook(() => useFilteredGroups(groups, '', ['open', 'closed']));

    const totalBeads = result.current.reduce((sum, g) => sum + g.beads.length, 0);
    expect(totalBeads).toBe(2);
  });

  it('filters by priority', () => {
    const groups = renderHook(() => useBeadGrouping(mockBeads, 'team')).result.current;
    const { result } = renderHook(() => useFilteredGroups(groups, '', [], [0]));

    const totalBeads = result.current.reduce((sum, g) => sum + g.beads.length, 0);
    expect(totalBeads).toBe(2); // Two P0 tasks
  });

  it('combines multiple filters', () => {
    const groups = renderHook(() => useBeadGrouping(mockBeads, 'team')).result.current;
    const { result } = renderHook(() => useFilteredGroups(groups, 'Task', ['open'], [0]));

    const totalBeads = result.current.reduce((sum, g) => sum + g.beads.length, 0);
    expect(totalBeads).toBe(1);
  });

  it('removes empty groups after filtering', () => {
    const groups = renderHook(() => useBeadGrouping(mockBeads, 'team')).result.current;
    const { result } = renderHook(() => useFilteredGroups(groups, '', ['deferred']));

    expect(result.current).toHaveLength(0); // No deferred tasks
  });

  it('recalculates progress after filtering', () => {
    const groups = renderHook(() => useBeadGrouping(mockBeads, 'team')).result.current;
    const { result } = renderHook(() => useFilteredGroups(groups, '', ['closed']));

    const pmGroup = result.current.find(g => g.groupLabel === 'pm');
    expect(pmGroup?.progressPercent).toBe(100);
  });

  it('returns all groups when no filters applied', () => {
    const groups = renderHook(() => useBeadGrouping(mockBeads, 'status')).result.current;
    const { result } = renderHook(() => useFilteredGroups(groups));

    expect(result.current).toEqual(groups);
  });
});
