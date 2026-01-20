"use client";

import { createContext, useContext, useReducer, useCallback, ReactNode, useEffect } from 'react';
import type { BeadStatus } from '@/components/views/ViewContext';

// Grouping type union
export type GroupByOption = 'none' | 'status' | 'priority' | 'team' | 'assignee';

// Grouping state interface
export interface GroupingState {
  groupBy: GroupByOption;
  collapsedGroups: Set<string>;
  groupOrder: string[];  // Custom ordering of groups
}

// Action types for reducer
type GroupingAction =
  | { type: 'SET_GROUP_BY'; payload: GroupByOption }
  | { type: 'TOGGLE_GROUP_COLLAPSE'; payload: string }
  | { type: 'COLLAPSE_ALL_GROUPS' }
  | { type: 'EXPAND_ALL_GROUPS' }
  | { type: 'SET_GROUP_ORDER'; payload: string[] }
  | { type: 'RESET_GROUPING' };

// Context value interface
export interface GroupingContextValue {
  state: GroupingState;
  dispatch: React.Dispatch<GroupingAction>;

  // Convenience methods
  setGroupBy: (groupBy: GroupByOption) => void;
  toggleGroupCollapse: (groupId: string) => void;
  collapseAllGroups: () => void;
  expandAllGroups: () => void;
  setGroupOrder: (order: string[]) => void;
  resetGrouping: () => void;
  isGroupCollapsed: (groupId: string) => boolean;
}

const STORAGE_KEY = 'gantt-grouping-state';

const DEFAULT_STATE: GroupingState = {
  groupBy: 'none',
  collapsedGroups: new Set(),
  groupOrder: [],
};

function groupingReducer(state: GroupingState, action: GroupingAction): GroupingState {
  switch (action.type) {
    case 'SET_GROUP_BY':
      return {
        ...state,
        groupBy: action.payload,
        // Clear collapsed groups when changing grouping
        collapsedGroups: new Set(),
      };

    case 'TOGGLE_GROUP_COLLAPSE': {
      const newCollapsed = new Set(state.collapsedGroups);
      if (newCollapsed.has(action.payload)) {
        newCollapsed.delete(action.payload);
      } else {
        newCollapsed.add(action.payload);
      }
      return {
        ...state,
        collapsedGroups: newCollapsed,
      };
    }

    case 'COLLAPSE_ALL_GROUPS':
      // We need to know which groups exist, but for now we can't collapse "all"
      // without knowing them. This is handled by the caller passing group IDs
      return state;

    case 'EXPAND_ALL_GROUPS':
      return {
        ...state,
        collapsedGroups: new Set(),
      };

    case 'SET_GROUP_ORDER':
      return {
        ...state,
        groupOrder: action.payload,
      };

    case 'RESET_GROUPING':
      return DEFAULT_STATE;

    default:
      return state;
  }
}

const GroupingContext = createContext<GroupingContextValue | null>(null);

interface GroupingProviderProps {
  children: ReactNode;
}

export function GroupingProvider({ children }: GroupingProviderProps) {
  // Initialize state from localStorage
  const getInitialState = (): GroupingState => {
    if (typeof window === 'undefined') {
      return DEFAULT_STATE;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          groupBy: parsed.groupBy || DEFAULT_STATE.groupBy,
          collapsedGroups: new Set(parsed.collapsedGroups || []),
          groupOrder: parsed.groupOrder || DEFAULT_STATE.groupOrder,
        };
      }
    } catch (e) {
      console.warn('Failed to load grouping state:', e);
    }

    return DEFAULT_STATE;
  };

  const [state, dispatch] = useReducer(groupingReducer, undefined as any, getInitialState);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const toStore = {
        groupBy: state.groupBy,
        collapsedGroups: Array.from(state.collapsedGroups),
        groupOrder: state.groupOrder,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (e) {
      console.warn('Failed to save grouping state:', e);
    }
  }, [state]);

  const setGroupBy = useCallback((groupBy: GroupByOption) => {
    dispatch({ type: 'SET_GROUP_BY', payload: groupBy });
  }, []);

  const toggleGroupCollapse = useCallback((groupId: string) => {
    dispatch({ type: 'TOGGLE_GROUP_COLLAPSE', payload: groupId });
  }, []);

  const collapseAllGroups = useCallback(() => {
    dispatch({ type: 'COLLAPSE_ALL_GROUPS' });
  }, []);

  const expandAllGroups = useCallback(() => {
    dispatch({ type: 'EXPAND_ALL_GROUPS' });
  }, []);

  const setGroupOrder = useCallback((order: string[]) => {
    dispatch({ type: 'SET_GROUP_ORDER', payload: order });
  }, []);

  const resetGrouping = useCallback(() => {
    dispatch({ type: 'RESET_GROUPING' });
  }, []);

  const isGroupCollapsed = useCallback(
    (groupId: string) => state.collapsedGroups.has(groupId),
    [state.collapsedGroups]
  );

  const value: GroupingContextValue = {
    state,
    dispatch,
    setGroupBy,
    toggleGroupCollapse,
    collapseAllGroups,
    expandAllGroups,
    setGroupOrder,
    resetGrouping,
    isGroupCollapsed,
  };

  return (
    <GroupingContext.Provider value={value}>
      {children}
    </GroupingContext.Provider>
  );
}

// Custom hook for consuming context
export function useGrouping(): GroupingContextValue {
  const context = useContext(GroupingContext);
  if (!context) {
    throw new Error('useGrouping must be used within a GroupingProvider');
  }
  return context;
}

// Utility function to generate group ID from value
export function generateGroupId(groupBy: GroupByOption, value: string | number | null): string {
  if (value === null || value === undefined) {
    return `${groupBy}-unassigned`;
  }
  return `${groupBy}-${String(value).toLowerCase().replace(/\s+/g, '-')}`;
}

// Utility function to get display label for group
export function getGroupLabel(groupBy: GroupByOption, value: string | number | null): string {
  if (value === null || value === undefined) {
    switch (groupBy) {
      case 'assignee':
        return 'Unassigned';
      case 'team':
        return 'No Team';
      case 'status':
        return 'No Status';
      case 'priority':
        return 'No Priority';
      default:
        return 'Ungrouped';
    }
  }

  if (groupBy === 'status') {
    const statusLabels: Record<string, string> = {
      open: 'Open',
      in_progress: 'In Progress',
      closed: 'Closed',
      blocked: 'Blocked',
      deferred: 'Deferred',
    };
    return statusLabels[String(value)] || String(value);
  }

  if (groupBy === 'priority') {
    const priorityLabels: Record<number, string> = {
      0: 'P0 - Critical',
      1: 'P1 - High',
      2: 'P2 - Medium',
      3: 'P3 - Low',
      4: 'P4 - None',
    };
    return priorityLabels[Number(value)] || `P${value}`;
  }

  return String(value);
}

// Utility function to sort groups
export function getGroupSortOrder(groupBy: GroupByOption): (a: string | number | null, b: string | number | null) => number {
  if (groupBy === 'status') {
    const statusOrder: Record<string, number> = {
      blocked: 0,
      in_progress: 1,
      open: 2,
      deferred: 3,
      closed: 4,
    };
    return (a, b) => {
      const aOrder = statusOrder[String(a)] ?? 999;
      const bOrder = statusOrder[String(b)] ?? 999;
      return aOrder - bOrder;
    };
  }

  if (groupBy === 'priority') {
    return (a, b) => {
      const aVal = a === null ? 999 : Number(a);
      const bVal = b === null ? 999 : Number(b);
      return aVal - bVal;
    };
  }

  // Alphabetical for team and assignee
  return (a, b) => {
    const aStr = a === null ? 'zzz' : String(a);
    const bStr = b === null ? 'zzz' : String(b);
    return aStr.localeCompare(bStr);
  };
}
