import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import {
  GroupingProvider,
  useGrouping,
  generateGroupId,
  getGroupLabel,
  getGroupSortOrder,
  type GroupByOption,
} from '../GroupingContext';

describe('GroupingContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('GroupingProvider', () => {
    it('provides default grouping state', () => {
      const { result } = renderHook(() => useGrouping(), {
        wrapper: GroupingProvider,
      });

      expect(result.current.state.groupBy).toBe('none');
      expect(result.current.state.collapsedGroups.size).toBe(0);
      expect(result.current.state.groupOrder).toEqual([]);
    });

    it('persists grouping state to localStorage', () => {
      const { result } = renderHook(() => useGrouping(), {
        wrapper: GroupingProvider,
      });

      act(() => {
        result.current.setGroupBy('status');
      });

      const stored = localStorage.getItem('gantt-grouping-state');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.groupBy).toBe('status');
    });

    it('loads persisted state from localStorage', () => {
      const initialState = {
        groupBy: 'priority',
        collapsedGroups: ['priority-1', 'priority-2'],
        groupOrder: ['priority-0', 'priority-1', 'priority-2'],
      };
      localStorage.setItem('gantt-grouping-state', JSON.stringify(initialState));

      const { result } = renderHook(() => useGrouping(), {
        wrapper: GroupingProvider,
      });

      expect(result.current.state.groupBy).toBe('priority');
      expect(result.current.state.collapsedGroups.size).toBe(2);
      expect(result.current.state.groupOrder).toEqual(initialState.groupOrder);
    });

    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useGrouping());
      }).toThrow('useGrouping must be used within a GroupingProvider');

      spy.mockRestore();
    });
  });

  describe('setGroupBy', () => {
    it('updates groupBy option', () => {
      const { result } = renderHook(() => useGrouping(), {
        wrapper: GroupingProvider,
      });

      act(() => {
        result.current.setGroupBy('team');
      });

      expect(result.current.state.groupBy).toBe('team');
    });

    it('clears collapsed groups when changing groupBy', () => {
      const { result } = renderHook(() => useGrouping(), {
        wrapper: GroupingProvider,
      });

      act(() => {
        result.current.setGroupBy('status');
        result.current.toggleGroupCollapse('status-open');
      });

      expect(result.current.state.collapsedGroups.size).toBe(1);

      act(() => {
        result.current.setGroupBy('priority');
      });

      expect(result.current.state.collapsedGroups.size).toBe(0);
    });
  });

  describe('toggleGroupCollapse', () => {
    it('collapses a group', () => {
      const { result } = renderHook(() => useGrouping(), {
        wrapper: GroupingProvider,
      });

      act(() => {
        result.current.toggleGroupCollapse('status-open');
      });

      expect(result.current.isGroupCollapsed('status-open')).toBe(true);
    });

    it('expands a collapsed group', () => {
      const { result } = renderHook(() => useGrouping(), {
        wrapper: GroupingProvider,
      });

      act(() => {
        result.current.toggleGroupCollapse('status-open');
        result.current.toggleGroupCollapse('status-open');
      });

      expect(result.current.isGroupCollapsed('status-open')).toBe(false);
    });

    it('handles multiple groups independently', () => {
      const { result } = renderHook(() => useGrouping(), {
        wrapper: GroupingProvider,
      });

      act(() => {
        result.current.toggleGroupCollapse('status-open');
        result.current.toggleGroupCollapse('status-closed');
      });

      expect(result.current.isGroupCollapsed('status-open')).toBe(true);
      expect(result.current.isGroupCollapsed('status-closed')).toBe(true);
      expect(result.current.state.collapsedGroups.size).toBe(2);
    });
  });

  describe('expandAllGroups', () => {
    it('expands all collapsed groups', () => {
      const { result } = renderHook(() => useGrouping(), {
        wrapper: GroupingProvider,
      });

      act(() => {
        result.current.toggleGroupCollapse('status-open');
        result.current.toggleGroupCollapse('status-closed');
        result.current.expandAllGroups();
      });

      expect(result.current.state.collapsedGroups.size).toBe(0);
    });
  });

  describe('resetGrouping', () => {
    it('resets to default state', () => {
      const { result } = renderHook(() => useGrouping(), {
        wrapper: GroupingProvider,
      });

      act(() => {
        result.current.setGroupBy('priority');
        result.current.toggleGroupCollapse('priority-0');
        result.current.resetGrouping();
      });

      expect(result.current.state.groupBy).toBe('none');
      expect(result.current.state.collapsedGroups.size).toBe(0);
      expect(result.current.state.groupOrder).toEqual([]);
    });
  });
});

describe('Utility functions', () => {
  describe('generateGroupId', () => {
    it('generates ID from groupBy and value', () => {
      expect(generateGroupId('status', 'open')).toBe('status-open');
      expect(generateGroupId('priority', 1)).toBe('priority-1');
      expect(generateGroupId('team', 'eng')).toBe('team-eng');
    });

    it('handles null values', () => {
      expect(generateGroupId('assignee', null)).toBe('assignee-unassigned');
      expect(generateGroupId('team', null)).toBe('team-unassigned');
    });

    it('normalizes values with spaces', () => {
      expect(generateGroupId('status', 'in progress')).toBe('status-in-progress');
    });
  });

  describe('getGroupLabel', () => {
    it('returns formatted label for status', () => {
      expect(getGroupLabel('status', 'open')).toBe('Open');
      expect(getGroupLabel('status', 'in_progress')).toBe('In Progress');
      expect(getGroupLabel('status', 'closed')).toBe('Closed');
    });

    it('returns formatted label for priority', () => {
      expect(getGroupLabel('priority', 0)).toBe('P0 - Critical');
      expect(getGroupLabel('priority', 1)).toBe('P1 - High');
      expect(getGroupLabel('priority', 4)).toBe('P4 - None');
    });

    it('returns string value for team and assignee', () => {
      expect(getGroupLabel('team', 'eng')).toBe('eng');
      expect(getGroupLabel('assignee', 'alice')).toBe('alice');
    });

    it('handles null values with appropriate labels', () => {
      expect(getGroupLabel('assignee', null)).toBe('Unassigned');
      expect(getGroupLabel('team', null)).toBe('No Team');
      expect(getGroupLabel('status', null)).toBe('No Status');
      expect(getGroupLabel('priority', null)).toBe('No Priority');
    });
  });

  describe('getGroupSortOrder', () => {
    it('sorts status groups in priority order', () => {
      const sortFn = getGroupSortOrder('status');
      const statuses = ['closed', 'open', 'blocked', 'in_progress', 'deferred'];
      const sorted = [...statuses].sort(sortFn);

      expect(sorted).toEqual(['blocked', 'in_progress', 'open', 'deferred', 'closed']);
    });

    it('sorts priority groups numerically', () => {
      const sortFn = getGroupSortOrder('priority');
      const priorities = [4, 2, 0, 3, 1];
      const sorted = [...priorities].sort(sortFn);

      expect(sorted).toEqual([0, 1, 2, 3, 4]);
    });

    it('sorts team groups alphabetically', () => {
      const sortFn = getGroupSortOrder('team');
      const teams = ['pm', 'eng', 'gtm', 'fin'];
      const sorted = [...teams].sort(sortFn);

      expect(sorted).toEqual(['eng', 'fin', 'gtm', 'pm']);
    });

    it('sorts assignee groups alphabetically', () => {
      const sortFn = getGroupSortOrder('assignee');
      const assignees = ['carol', 'alice', 'bob'];
      const sorted = [...assignees].sort(sortFn);

      expect(sorted).toEqual(['alice', 'bob', 'carol']);
    });

    it('places null values at the end', () => {
      const sortFn = getGroupSortOrder('assignee');
      const assignees: (string | null)[] = ['bob', null, 'alice'];
      const sorted = [...assignees].sort(sortFn);

      expect(sorted).toEqual(['alice', 'bob', null]);
    });
  });
});
