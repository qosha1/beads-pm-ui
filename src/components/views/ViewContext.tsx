"use client";

import { createContext, useContext, useReducer, useCallback, ReactNode, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

// View type union
export type ViewType = 'board' | 'list' | 'timeline';

// Status values from Bead type
export type BeadStatus = 'open' | 'in_progress' | 'closed' | 'blocked' | 'deferred';

// Shared filter state - affects all views
export interface FilterState {
  searchQuery: string;
  statusFilter: BeadStatus[];      // Empty array = show all
  priorityFilter: number[];        // Empty array = show all (0-4)
  teamFilter: string | null;       // null = show all teams
  assigneeFilter: string | null;   // null = show all assignees
}

// View-specific state interfaces
export interface BoardViewState {
  collapsedColumns: Set<string>;
  columnOrder: string[];           // Column IDs for custom ordering
}

export interface ListViewState {
  sortColumn: 'title' | 'status' | 'priority' | 'due_at' | 'assignee' | 'team';
  sortDirection: 'asc' | 'desc';
  selectedIds: Set<string>;        // Transient, not persisted
}

export interface TimelineViewState {
  collapsedIds: Set<string>;
  zoomIndex: number;               // 0-5, maps to ZOOM_LEVELS
  scrollPosition: number;          // Transient
}

// Combined view state
export interface ViewSpecificState {
  board: BoardViewState;
  list: ListViewState;
  timeline: TimelineViewState;
}

// Full context state
export interface ViewState {
  activeView: ViewType;
  filters: FilterState;
  viewState: ViewSpecificState;
  isTransitioning: boolean;        // For animation coordination
}

// Action types for reducer
type ViewAction =
  | { type: 'SET_VIEW'; payload: ViewType }
  | { type: 'SET_FILTER'; payload: Partial<FilterState> }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SET_BOARD_STATE'; payload: Partial<BoardViewState> }
  | { type: 'SET_LIST_STATE'; payload: Partial<ListViewState> }
  | { type: 'SET_TIMELINE_STATE'; payload: Partial<TimelineViewState> }
  | { type: 'SET_TRANSITIONING'; payload: boolean };

// Context value interface
export interface ViewContextValue {
  state: ViewState;
  dispatch: React.Dispatch<ViewAction>;

  // Convenience methods
  setActiveView: (view: ViewType) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;

  // Computed values
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

const STORAGE_KEYS = {
  activeView: 'gantt-active-view',
  searchQuery: 'gantt-search-query',
  statusFilter: 'gantt-status-filter',
  boardColumnOrder: 'gantt-board-columns',
  boardCollapsedColumns: 'gantt-board-collapsed',
  listSortColumn: 'gantt-list-sort-col',
  listSortDirection: 'gantt-list-sort-dir',
  timelineCollapsed: 'gantt-collapsed-tasks',
  timelineZoomIndex: 'gantt-zoom-index',
} as const;

const DEFAULT_STATE: ViewState = {
  activeView: 'timeline',
  filters: {
    searchQuery: '',
    statusFilter: [],
    priorityFilter: [],
    teamFilter: null,
    assigneeFilter: null,
  },
  viewState: {
    board: {
      collapsedColumns: new Set(),
      columnOrder: ['open', 'in_progress', 'closed', 'blocked', 'deferred'],
    },
    list: {
      sortColumn: 'priority',
      sortDirection: 'asc',
      selectedIds: new Set(),
    },
    timeline: {
      collapsedIds: new Set(),
      zoomIndex: 3,
      scrollPosition: 0,
    },
  },
  isTransitioning: false,
};

function viewReducer(state: ViewState, action: ViewAction): ViewState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, activeView: action.payload, isTransitioning: true };

    case 'SET_FILTER':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      };

    case 'CLEAR_FILTERS':
      return {
        ...state,
        filters: DEFAULT_STATE.filters
      };

    case 'SET_BOARD_STATE':
      return {
        ...state,
        viewState: {
          ...state.viewState,
          board: { ...state.viewState.board, ...action.payload },
        },
      };

    case 'SET_LIST_STATE':
      return {
        ...state,
        viewState: {
          ...state.viewState,
          list: { ...state.viewState.list, ...action.payload },
        },
      };

    case 'SET_TIMELINE_STATE':
      return {
        ...state,
        viewState: {
          ...state.viewState,
          timeline: { ...state.viewState.timeline, ...action.payload },
        },
      };

    case 'SET_TRANSITIONING':
      return { ...state, isTransitioning: action.payload };

    default:
      return state;
  }
}

const ViewContext = createContext<ViewContextValue | null>(null);

interface ViewProviderProps {
  children: ReactNode;
  initialView?: ViewType;
}

export function ViewProvider({ children, initialView }: ViewProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state from URL params, then localStorage, then defaults
  const getInitialState = (): ViewState => {
    const urlView = searchParams.get('view') as ViewType | null;
    const urlStatus = searchParams.get('status');
    const urlSearch = searchParams.get('search');

    // Start with deep copy of defaults to avoid mutating the global DEFAULT_STATE
    let state: ViewState = {
      ...DEFAULT_STATE,
      filters: { ...DEFAULT_STATE.filters },
      viewState: {
        board: {
          ...DEFAULT_STATE.viewState.board,
          collapsedColumns: new Set(DEFAULT_STATE.viewState.board.collapsedColumns),
        },
        list: {
          ...DEFAULT_STATE.viewState.list,
          selectedIds: new Set(DEFAULT_STATE.viewState.list.selectedIds),
        },
        timeline: {
          ...DEFAULT_STATE.viewState.timeline,
          collapsedIds: new Set(DEFAULT_STATE.viewState.timeline.collapsedIds),
        },
      },
    };

    // Apply localStorage (if client-side)
    if (typeof window !== 'undefined') {
      try {
        const storedView = localStorage.getItem(STORAGE_KEYS.activeView);
        if (storedView && ['board', 'list', 'timeline'].includes(storedView)) {
          state.activeView = storedView as ViewType;
        }

        const storedSearch = localStorage.getItem(STORAGE_KEYS.searchQuery);
        if (storedSearch) {
          state.filters.searchQuery = storedSearch;
        }

        const storedZoom = localStorage.getItem(STORAGE_KEYS.timelineZoomIndex);
        if (storedZoom) {
          state.viewState.timeline.zoomIndex = parseInt(storedZoom, 10);
        }

        const storedCollapsed = localStorage.getItem(STORAGE_KEYS.timelineCollapsed);
        if (storedCollapsed) {
          state.viewState.timeline.collapsedIds = new Set(JSON.parse(storedCollapsed));
        }
      } catch (e) {
        console.warn('Failed to load persisted state:', e);
      }
    }

    // URL params override localStorage (highest priority)
    if (urlView && ['board', 'list', 'timeline'].includes(urlView)) {
      state.activeView = urlView;
    }
    if (urlSearch) {
      state.filters.searchQuery = decodeURIComponent(urlSearch);
    }
    if (urlStatus) {
      state.filters.statusFilter = urlStatus.split(',') as BeadStatus[];
    }

    // Initial view prop overrides URL if provided (for testing/embedding)
    if (initialView) {
      state.activeView = initialView;
    }

    return state;
  };

  const [state, dispatch] = useReducer(viewReducer, undefined as any, getInitialState);

  // Sync state changes to URL and localStorage
  const setActiveView = useCallback((view: ViewType) => {
    dispatch({ type: 'SET_VIEW', payload: view });

    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.activeView, view);
    }

    // Clear transitioning flag after animation
    setTimeout(() => {
      dispatch({ type: 'SET_TRANSITIONING', payload: false });
    }, 200);
  }, [router, pathname, searchParams]);

  const setFilters = useCallback((filters: Partial<FilterState>) => {
    dispatch({ type: 'SET_FILTER', payload: filters });

    // Update URL for key filters
    const params = new URLSearchParams(searchParams.toString());
    if (filters.searchQuery !== undefined) {
      if (filters.searchQuery) {
        params.set('search', encodeURIComponent(filters.searchQuery));
      } else {
        params.delete('search');
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.searchQuery, filters.searchQuery);
      }
    }
    if (filters.statusFilter !== undefined) {
      if (filters.statusFilter.length > 0) {
        params.set('status', filters.statusFilter.join(','));
      } else {
        params.delete('status');
      }
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' });

    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    params.delete('status');
    params.delete('priority');
    params.delete('team');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });

    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.searchQuery);
    }
  }, [router, pathname, searchParams]);

  // Computed values
  const hasActiveFilters =
    state.filters.searchQuery !== '' ||
    state.filters.statusFilter.length > 0 ||
    state.filters.priorityFilter.length > 0 ||
    state.filters.teamFilter !== null ||
    state.filters.assigneeFilter !== null;

  const activeFilterCount = [
    state.filters.searchQuery ? 1 : 0,
    state.filters.statusFilter.length > 0 ? 1 : 0,
    state.filters.priorityFilter.length > 0 ? 1 : 0,
    state.filters.teamFilter ? 1 : 0,
    state.filters.assigneeFilter ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const value: ViewContextValue = {
    state,
    dispatch,
    setActiveView,
    setFilters,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
  };

  return (
    <ViewContext.Provider value={value}>
      {children}
    </ViewContext.Provider>
  );
}

// Custom hook for consuming context
export function useViewContext(): ViewContextValue {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error('useViewContext must be used within a ViewProvider');
  }
  return context;
}

// Selective hooks for specific state slices
export function useActiveView(): [ViewType, (view: ViewType) => void] {
  const { state, setActiveView } = useViewContext();
  return [state.activeView, setActiveView];
}

export function useFilters(): [FilterState, (filters: Partial<FilterState>) => void] {
  const { state, setFilters } = useViewContext();
  return [state.filters, setFilters];
}

export function useBoardState() {
  const { state, dispatch } = useViewContext();
  const setBoardState = useCallback(
    (updates: Partial<BoardViewState>) => {
      dispatch({ type: 'SET_BOARD_STATE', payload: updates });
    },
    [dispatch]
  );
  return [state.viewState.board, setBoardState] as const;
}

export function useListState() {
  const { state, dispatch } = useViewContext();
  const setListState = useCallback(
    (updates: Partial<ListViewState>) => {
      dispatch({ type: 'SET_LIST_STATE', payload: updates });
    },
    [dispatch]
  );
  return [state.viewState.list, setListState] as const;
}

export function useTimelineState() {
  const { state, dispatch } = useViewContext();
  const setTimelineState = useCallback(
    (updates: Partial<TimelineViewState>) => {
      dispatch({ type: 'SET_TIMELINE_STATE', payload: updates });
    },
    [dispatch]
  );
  return [state.viewState.timeline, setTimelineState] as const;
}
