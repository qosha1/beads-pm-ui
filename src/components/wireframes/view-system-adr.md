# Architecture Decision Record: Multi-View System

## ADR-001: Multi-View System Architecture

| Field | Value |
|-------|-------|
| Status | Proposed |
| Date | 2026-01-08 |
| Deciders | Engineering Team |
| Related | [multi-view-prd.md](./multi-view-prd.md), [view-layouts.md](./view-layouts.md) |

---

## Context

The CEO Dashboard currently implements a monolithic `GanttChart.tsx` component (~1090 lines) that serves as the primary visualization for task data. While functional, this architecture presents several challenges:

1. **Single View Limitation**: Users can only view data as a timeline/Gantt chart. Different workflows (daily standups, sprint planning, quick status updates) benefit from different visualizations.

2. **Code Maintainability**: The monolithic component handles too many concerns: data transformation, date calculations, drag/drop, rendering, state management, and hierarchy processing.

3. **Feature Velocity**: Adding new features (Board view, List view) to the existing component would exponentially increase complexity.

4. **Performance**: Re-renders affect the entire component even when only a subset of functionality needs to update.

5. **Testing**: The tightly coupled code makes unit testing difficult without extensive mocking.

### Current Architecture Pain Points

```
GanttChart.tsx (1090 lines)
  - Date parsing and transformation
  - Hierarchy building from dependencies
  - Filter state management
  - Drag state management
  - Collapse state management
  - Zoom state management
  - Scroll synchronization
  - Bar position calculations
  - Dependency path rendering
  - Keyboard navigation
  - Row rendering
  - Timeline rendering
```

### Business Requirements

Per the PRD (`multi-view-prd.md`), the system must support:
- Three view types: Board, List, Timeline
- Shared filter/search state across views
- View-specific state (sort, collapsed items, zoom)
- URL-based deep linking
- Sub-100ms view switching
- Consistent edit behavior across views

---

## Decision

Implement a **View Context + Composition** architecture using React Context for shared state and a component composition pattern for view-specific implementations.

### Summary

1. **ViewContext** manages shared state (activeView, filters, search) and provides view-switching API
2. **View Components** are lazy-loaded, self-contained modules with their own state
3. **Shared Components** are extracted for reuse (TaskCard, StatusBadge, etc.)
4. **Custom Hooks** encapsulate data transformation, filtering, and drag/drop logic
5. **URL Sync** via Next.js App Router `useSearchParams` for deep linking

---

## 2. ViewContext for State Management

### Context Structure

The ViewContext provides a centralized state management layer for state that must be shared across all views, while allowing each view to maintain its own local state.

```typescript
// src/components/views/ViewContext.tsx

import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

// View type union
type ViewType = 'board' | 'list' | 'timeline';

// Status values from Bead type
type BeadStatus = 'open' | 'in_progress' | 'closed' | 'blocked' | 'deferred';

// Shared filter state - affects all views
interface FilterState {
  searchQuery: string;
  statusFilter: BeadStatus[];      // Empty array = show all
  priorityFilter: number[];        // Empty array = show all (0-4)
  teamFilter: string | null;       // null = show all teams
  assigneeFilter: string | null;   // null = show all assignees
}

// View-specific state interfaces
interface BoardViewState {
  collapsedColumns: Set<string>;
  columnOrder: string[];           // Column IDs for custom ordering
}

interface ListViewState {
  sortColumn: 'title' | 'status' | 'priority' | 'due_at' | 'assignee' | 'team';
  sortDirection: 'asc' | 'desc';
  selectedIds: Set<string>;        // Transient, not persisted
}

interface TimelineViewState {
  collapsedIds: Set<string>;
  zoomIndex: number;               // 0-5, maps to ZOOM_LEVELS
  scrollPosition: number;          // Transient
}

// Combined view state
interface ViewSpecificState {
  board: BoardViewState;
  list: ListViewState;
  timeline: TimelineViewState;
}

// Full context state
interface ViewState {
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
interface ViewContextValue {
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
```

### Provider Implementation

```typescript
// src/components/views/ViewContext.tsx (continued)

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

    // Start with defaults
    let state = { ...DEFAULT_STATE };

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

  const [state, dispatch] = useReducer(viewReducer, undefined, getInitialState);

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
      localStorage.setItem(STORAGE_KEYS.searchQuery, filters.searchQuery);
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
```

### State Managed by ViewContext

| State | Scope | Persisted | URL Sync |
|-------|-------|-----------|----------|
| `activeView` | Global | localStorage | Yes (`?view=`) |
| `searchQuery` | Global | localStorage | Yes (`?search=`) |
| `statusFilter` | Global | No | Yes (`?status=`) |
| `priorityFilter` | Global | No | Yes (future) |
| `teamFilter` | Global | No | Yes (`?team=`) |
| `board.collapsedColumns` | Board only | localStorage | No |
| `board.columnOrder` | Board only | localStorage | No |
| `list.sortColumn` | List only | localStorage | No |
| `list.sortDirection` | List only | localStorage | No |
| `list.selectedIds` | List only | No (transient) | No |
| `timeline.collapsedIds` | Timeline only | localStorage | No |
| `timeline.zoomIndex` | Timeline only | localStorage | No |

---

## 3. View Components Structure

### Directory Layout

```
src/components/
  views/
    index.ts                    # Re-exports
    ViewContext.tsx             # Context provider and hooks
    ViewContainer.tsx           # Main container with view switching
    ViewSwitcher.tsx            # Tab bar component
    BoardView/
      index.ts
      BoardView.tsx             # Main board component
      BoardColumn.tsx           # Single column
      BoardCard.tsx             # Card within column
      useBoardDragDrop.ts       # Board-specific drag logic
    ListView/
      index.ts
      ListView.tsx              # Main list component
      ListHeader.tsx            # Sortable column headers
      ListRow.tsx               # Single row
      ListBulkActions.tsx       # Footer with bulk actions
      useListSort.ts            # Sorting logic
      useListSelection.ts       # Selection logic
    TimelineView/
      index.ts
      TimelineView.tsx          # Extracted from GanttChart.tsx
      TimelineHeader.tsx        # Date headers (months, days)
      TimelineBar.tsx           # Task bar component
      TimelineRow.tsx           # Row with info + bar
      DependencyLines.tsx       # SVG dependency rendering
      useTimelineDrag.ts        # Drag to move/resize
      useTimelineZoom.ts        # Zoom handling
  shared/
    index.ts
    TaskCard.tsx                # Shared card (used by Board, List mobile)
    StatusBadge.tsx             # Status indicator
    PriorityBadge.tsx           # Priority indicator (0-4)
    TeamBadge.tsx               # Team code badge
    DueDateBadge.tsx            # Due date with overdue styling
    FilterBar.tsx               # Search + filter dropdowns
    EmptyState.tsx              # No results messaging
    SkeletonLoader.tsx          # Loading states
  hooks/
    index.ts
    useViewState.ts             # Persistence + URL sync
    useTaskFiltering.ts         # Filter application
    useTaskSorting.ts           # Sort utilities
    useDragAndDrop.ts           # Shared drag logic
    useKeyboardNavigation.ts    # Keyboard shortcuts
    useFocusManagement.ts       # Focus trap, restoration
```

### ViewContainer - Main Orchestrator

```typescript
// src/components/views/ViewContainer.tsx

"use client";

import { Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ViewProvider, useViewContext } from './ViewContext';
import { ViewSwitcher } from './ViewSwitcher';
import { FilterBar } from '../shared/FilterBar';
import { SkeletonLoader } from '../shared/SkeletonLoader';
import type { Bead, Dependency } from '@/lib/types';

// Lazy load view components for bundle splitting
const BoardView = lazy(() => import('./BoardView'));
const ListView = lazy(() => import('./ListView'));
const TimelineView = lazy(() => import('./TimelineView'));

interface ViewContainerProps {
  beads: Bead[];
  dependencies: Dependency[];
  onUpdate: (id: string, team: string, updates: Record<string, unknown>) => Promise<void>;
}

function ViewContent({ beads, dependencies, onUpdate }: ViewContainerProps) {
  const { state } = useViewContext();

  const viewComponents = {
    board: <BoardView beads={beads} dependencies={dependencies} onUpdate={onUpdate} />,
    list: <ListView beads={beads} dependencies={dependencies} onUpdate={onUpdate} />,
    timeline: <TimelineView beads={beads} dependencies={dependencies} onUpdate={onUpdate} />,
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state.activeView}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="view-content"
      >
        <Suspense fallback={<SkeletonLoader view={state.activeView} />}>
          {viewComponents[state.activeView]}
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export function ViewContainer(props: ViewContainerProps) {
  return (
    <ViewProvider>
      <div className="view-container">
        <div className="view-controls">
          <FilterBar />
          <ViewSwitcher />
        </div>
        <ViewContent {...props} />
      </div>
    </ViewProvider>
  );
}
```

---

## 4. Shared Data Layer

### Data Transformation

Views consume the same `Bead[]` data but need different shapes. A shared data layer handles transformation.

```typescript
// src/lib/viewData.ts

import type { Bead, Dependency, GanttTask } from './types';
import { parseDateRangeFromTitle } from './dates';
import { parseBeadPrefix, HierarchyLevel } from './sorting';
import { startOfDay, endOfDay, addDays } from 'date-fns';

// Board view needs beads grouped by status
export interface BoardColumnData {
  id: string;
  status: Bead['status'];
  title: string;
  items: Bead[];
  count: number;
}

export function transformBeadsToColumns(beads: Bead[]): BoardColumnData[] {
  const columns: Record<Bead['status'], Bead[]> = {
    open: [],
    in_progress: [],
    closed: [],
    blocked: [],
    deferred: [],
  };

  for (const bead of beads) {
    columns[bead.status].push(bead);
  }

  // Sort within columns by priority then due date
  const sortItems = (items: Bead[]) =>
    items.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.due_at && b.due_at) return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      if (a.due_at) return -1;
      if (b.due_at) return 1;
      return 0;
    });

  return [
    { id: 'open', status: 'open', title: 'Open', items: sortItems(columns.open), count: columns.open.length },
    { id: 'in_progress', status: 'in_progress', title: 'In Progress', items: sortItems(columns.in_progress), count: columns.in_progress.length },
    { id: 'closed', status: 'closed', title: 'Done', items: sortItems(columns.closed), count: columns.closed.length },
    { id: 'blocked', status: 'blocked', title: 'Blocked', items: sortItems(columns.blocked), count: columns.blocked.length },
    { id: 'deferred', status: 'deferred', title: 'Deferred', items: sortItems(columns.deferred), count: columns.deferred.length },
  ];
}

// List view needs flat array with sort support
export interface ListRowData {
  bead: Bead;
  isOverdue: boolean;
  dueStatus: 'overdue' | 'today' | 'soon' | 'future' | 'none';
}

export function transformBeadsToRows(beads: Bead[]): ListRowData[] {
  const now = new Date();
  const threeDaysOut = addDays(now, 3);

  return beads.map(bead => {
    let isOverdue = false;
    let dueStatus: ListRowData['dueStatus'] = 'none';

    if (bead.due_at && bead.status !== 'closed') {
      const dueDate = new Date(bead.due_at);
      if (dueDate < now) {
        isOverdue = true;
        dueStatus = 'overdue';
      } else if (dueDate.toDateString() === now.toDateString()) {
        dueStatus = 'today';
      } else if (dueDate < threeDaysOut) {
        dueStatus = 'soon';
      } else {
        dueStatus = 'future';
      }
    }

    return { bead, isOverdue, dueStatus };
  });
}

// Timeline view needs hierarchical GanttTask array
export interface TimelineTaskData {
  bead: Bead;
  start: Date;
  end: Date;
  progress: number;
  timeProgress: number;
  depth: number;
  hasChildren: boolean;
  parentId: string | null;
}

export function transformBeadsToTimeline(
  beads: Bead[],
  dependencies: Dependency[],
  collapsedIds: Set<string>
): TimelineTaskData[] {
  const currentYear = new Date().getFullYear();
  const beadMap = new Map(beads.map(b => [b.id, b]));

  // Build parent-child relationships from dependencies
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();

  for (const dep of dependencies) {
    if (dep.type === 'blocks') {
      const parentBead = beadMap.get(dep.issue_id);
      const childBead = beadMap.get(dep.depends_on_id);

      if (!parentBead || !childBead) continue;

      const parentLevel = getHierarchyLevel(parentBead.title);
      const childLevel = getHierarchyLevel(childBead.title);

      if (parentLevel > childLevel) {
        const children = childrenMap.get(dep.issue_id) || [];
        children.push(dep.depends_on_id);
        childrenMap.set(dep.issue_id, children);
        parentMap.set(dep.depends_on_id, dep.issue_id);
      }
    }
  }

  // Parse dates for all beads
  const beadDates = new Map<string, { start: Date; end: Date }>();
  for (const bead of beads) {
    const parsedRange = parseDateRangeFromTitle(bead.title, currentYear);
    if (parsedRange) {
      beadDates.set(bead.id, { start: parsedRange.start, end: parsedRange.end });
      continue;
    }

    if (bead.due_at) {
      const dueDate = new Date(bead.due_at);
      if (!isNaN(dueDate.getTime())) {
        const start = startOfDay(new Date(bead.created_at));
        beadDates.set(bead.id, { start, end: endOfDay(dueDate) });
        continue;
      }
    }

    const start = startOfDay(new Date(bead.created_at));
    const estimatedDays = bead.estimated_minutes ? Math.ceil(bead.estimated_minutes / 480) : 14;
    beadDates.set(bead.id, { start, end: endOfDay(addDays(start, estimatedDays)) });
  }

  // Build flattened task list with depth
  const tasks: TimelineTaskData[] = [];
  const visited = new Set<string>();

  const traverse = (id: string, depth: number) => {
    if (visited.has(id)) return;
    visited.add(id);

    const bead = beadMap.get(id);
    if (!bead) return;

    const dates = beadDates.get(id)!;
    const children = childrenMap.get(id) || [];
    const hasChildren = children.length > 0;

    const progress = bead.status === 'closed' ? 100 : bead.status === 'in_progress' ? 50 : 0;

    const now = new Date();
    const totalDuration = dates.end.getTime() - dates.start.getTime();
    const elapsed = now.getTime() - dates.start.getTime();
    const timeProgress = totalDuration > 0
      ? Math.max(0, Math.min(100, (elapsed / totalDuration) * 100))
      : 0;

    tasks.push({
      bead,
      start: dates.start,
      end: dates.end,
      progress,
      timeProgress,
      depth,
      hasChildren,
      parentId: parentMap.get(id) || null,
    });

    if (hasChildren && !collapsedIds.has(id)) {
      for (const childId of children) {
        traverse(childId, depth + 1);
      }
    }
  };

  // Find root nodes
  const roots = beads
    .filter(b => !parentMap.has(b.id) || !beadMap.has(parentMap.get(b.id)!))
    .map(b => b.id);

  for (const rootId of roots) {
    traverse(rootId, 0);
  }

  return tasks;
}

// Helper function (duplicated from GanttChart for extraction)
function getHierarchyLevel(title: string): number {
  const match = title.match(/^\[([^\]]+)\]/);
  if (!match) return 0;

  const tag = match[1].toUpperCase();

  if (/^\d+YR$/.test(tag)) {
    const years = parseInt(tag);
    return 100 + years;
  }
  if (/^H[12]$/.test(tag)) return 50;
  if (/^Q[1-4]$/.test(tag)) return 40;

  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  if (MONTHS.includes(tag)) return 30;

  if (/^W\d+$/.test(tag)) return 20;

  return 10;
}
```

### useTasks Hook

```typescript
// src/components/hooks/useTasks.ts

import { useMemo } from 'react';
import { useFilters } from '../views/ViewContext';
import type { Bead, Dependency } from '@/lib/types';

interface UseTasksOptions {
  beads: Bead[];
  dependencies: Dependency[];
}

interface UseTasksResult {
  filteredBeads: Bead[];
  totalCount: number;
  filteredCount: number;
  isFiltered: boolean;
}

export function useTasks({ beads, dependencies }: UseTasksOptions): UseTasksResult {
  const [filters] = useFilters();

  const filteredBeads = useMemo(() => {
    let result = beads;

    // Search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(bead =>
        bead.title.toLowerCase().includes(query) ||
        bead.description?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filters.statusFilter.length > 0) {
      result = result.filter(bead =>
        filters.statusFilter.includes(bead.status)
      );
    }

    // Priority filter
    if (filters.priorityFilter.length > 0) {
      result = result.filter(bead =>
        filters.priorityFilter.includes(bead.priority)
      );
    }

    // Team filter
    if (filters.teamFilter) {
      result = result.filter(bead => bead.team === filters.teamFilter);
    }

    // Assignee filter
    if (filters.assigneeFilter) {
      result = result.filter(bead => bead.assignee === filters.assigneeFilter);
    }

    return result;
  }, [beads, filters]);

  return {
    filteredBeads,
    totalCount: beads.length,
    filteredCount: filteredBeads.length,
    isFiltered: filteredBeads.length !== beads.length,
  };
}
```

### Filtering Utilities

```typescript
// src/components/hooks/useTaskFiltering.ts

import { useMemo, useCallback } from 'react';
import type { Bead } from '@/lib/types';

type FilterFn = (bead: Bead) => boolean;

interface FilterConfig {
  search?: string;
  status?: Bead['status'][];
  priority?: number[];
  team?: string;
  assignee?: string;
  dateRange?: { start: Date; end: Date };
}

export function createFilterPipeline(config: FilterConfig): FilterFn[] {
  const filters: FilterFn[] = [];

  if (config.search?.trim()) {
    const query = config.search.toLowerCase();
    filters.push((bead) =>
      bead.title.toLowerCase().includes(query) ||
      bead.description?.toLowerCase().includes(query) || false
    );
  }

  if (config.status?.length) {
    filters.push((bead) => config.status!.includes(bead.status));
  }

  if (config.priority?.length) {
    filters.push((bead) => config.priority!.includes(bead.priority));
  }

  if (config.team) {
    filters.push((bead) => bead.team === config.team);
  }

  if (config.assignee) {
    filters.push((bead) => bead.assignee === config.assignee);
  }

  if (config.dateRange) {
    const { start, end } = config.dateRange;
    filters.push((bead) => {
      if (!bead.due_at) return false;
      const dueDate = new Date(bead.due_at);
      return dueDate >= start && dueDate <= end;
    });
  }

  return filters;
}

export function applyFilters(beads: Bead[], filters: FilterFn[]): Bead[] {
  if (filters.length === 0) return beads;

  return beads.filter((bead) =>
    filters.every((filter) => filter(bead))
  );
}
```

### Memoization Strategy

```typescript
// Memoization points in the data flow:

// 1. Raw beads -> Filtered beads (useTasks hook)
//    - Memoized via useMemo with [beads, filters] dependencies
//    - Re-computes only when data or filters change

// 2. Filtered beads -> View-specific format (per-view hooks)
//    - BoardView: useMemo for column grouping
//    - ListView: useMemo for row transformation + sort
//    - TimelineView: useMemo for hierarchy + date calculations

// 3. Component-level memoization
//    - React.memo on list items (TaskCard, ListRow, TimelineBar)
//    - useCallback for event handlers passed to children
//    - useMemo for computed styles/positions

// Example: ListView with memoization
function ListView({ beads, dependencies, onUpdate }: ViewProps) {
  const { filteredBeads } = useTasks({ beads, dependencies });
  const [listState, setListState] = useListState();

  // Memoize row transformation
  const rows = useMemo(() =>
    transformBeadsToRows(filteredBeads),
    [filteredBeads]
  );

  // Memoize sorted rows
  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const aVal = a.bead[listState.sortColumn];
      const bVal = b.bead[listState.sortColumn];
      const direction = listState.sortDirection === 'asc' ? 1 : -1;

      if (aVal < bVal) return -1 * direction;
      if (aVal > bVal) return 1 * direction;
      return 0;
    });
    return sorted;
  }, [rows, listState.sortColumn, listState.sortDirection]);

  // Memoize row click handler
  const handleRowClick = useCallback((id: string) => {
    setListState({
      selectedIds: new Set([id])
    });
  }, [setListState]);

  return (
    <div className="list-view">
      <ListHeader
        sortColumn={listState.sortColumn}
        sortDirection={listState.sortDirection}
        onSort={(col) => {/* ... */}}
      />
      {sortedRows.map((row) => (
        <ListRow
          key={row.bead.id}
          row={row}
          isSelected={listState.selectedIds.has(row.bead.id)}
          onClick={handleRowClick}
        />
      ))}
    </div>
  );
}

// Memoized row component
const ListRow = React.memo(function ListRow({
  row,
  isSelected,
  onClick
}: ListRowProps) {
  return (
    <div
      className={`list-row ${isSelected ? 'selected' : ''}`}
      onClick={() => onClick(row.bead.id)}
    >
      {/* ... */}
    </div>
  );
});
```

---

## 5. URL Routing with Next.js App Router

### URL Structure

```
/dashboard?view=board&status=open,in_progress&search=api&team=eng&task=abc123
```

| Parameter | Description | Valid Values |
|-----------|-------------|--------------|
| `view` | Active view type | `board`, `list`, `timeline` |
| `status` | Status filter (comma-separated) | `open`, `in_progress`, `closed`, `blocked`, `deferred` |
| `search` | Search query (URL encoded) | Any string |
| `team` | Team filter | Team code (e.g., `eng`, `pm`) |
| `priority` | Priority filter (comma-separated) | `0`, `1`, `2`, `3`, `4` |
| `task` | Task to focus/open | Task ID |

### useSearchParams Integration

```typescript
// src/components/hooks/useViewState.ts

"use client";

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

type ViewType = 'board' | 'list' | 'timeline';

interface ViewStateConfig {
  defaultView?: ViewType;
  persistKey?: string;
}

export function useViewState(config: ViewStateConfig = {}) {
  const { defaultView = 'timeline', persistKey = 'gantt-active-view' } = config;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get initial view from URL, then localStorage, then default
  const getInitialView = (): ViewType => {
    const urlView = searchParams.get('view');
    if (urlView && ['board', 'list', 'timeline'].includes(urlView)) {
      return urlView as ViewType;
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(persistKey);
      if (stored && ['board', 'list', 'timeline'].includes(stored)) {
        return stored as ViewType;
      }
    }

    return defaultView;
  };

  const [activeView, setActiveViewState] = useState<ViewType>(getInitialView);

  // Sync URL changes to state (for browser back/forward)
  useEffect(() => {
    const urlView = searchParams.get('view');
    if (urlView && ['board', 'list', 'timeline'].includes(urlView)) {
      setActiveViewState(urlView as ViewType);
    }
  }, [searchParams]);

  // Set view with URL and localStorage sync
  const setActiveView = useCallback((view: ViewType) => {
    setActiveViewState(view);

    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(persistKey, view);
    }
  }, [router, pathname, searchParams, persistKey]);

  return {
    activeView,
    setActiveView,
    isBoard: activeView === 'board',
    isList: activeView === 'list',
    isTimeline: activeView === 'timeline',
  };
}

// URL filter sync hook
export function useURLFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const getFiltersFromURL = useCallback(() => {
    return {
      search: searchParams.get('search') || '',
      status: searchParams.get('status')?.split(',').filter(Boolean) || [],
      priority: searchParams.get('priority')?.split(',').map(Number).filter(n => !isNaN(n)) || [],
      team: searchParams.get('team') || null,
      task: searchParams.get('task') || null,
    };
  }, [searchParams]);

  const setURLFilter = useCallback((key: string, value: string | string[] | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      params.delete(key);
    } else if (Array.isArray(value)) {
      params.set(key, value.join(','));
    } else {
      params.set(key, value);
    }

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  const clearURLFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    params.delete('status');
    params.delete('priority');
    params.delete('team');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  return {
    filters: getFiltersFromURL(),
    setFilter: setURLFilter,
    clearFilters: clearURLFilters,
  };
}
```

### Deep Linking Support

```typescript
// Example: Shareable URL generation
function generateShareableURL(config: {
  view?: ViewType;
  filters?: Partial<FilterState>;
  taskId?: string;
}): string {
  const params = new URLSearchParams();

  if (config.view) {
    params.set('view', config.view);
  }

  if (config.filters?.searchQuery) {
    params.set('search', encodeURIComponent(config.filters.searchQuery));
  }

  if (config.filters?.statusFilter?.length) {
    params.set('status', config.filters.statusFilter.join(','));
  }

  if (config.taskId) {
    params.set('task', config.taskId);
  }

  return `${window.location.origin}/dashboard?${params.toString()}`;
}

// Example: Handle incoming deep link
function useDeepLinkHandler() {
  const searchParams = useSearchParams();
  const { setActiveView, setFilters } = useViewContext();
  const [editingBead, setEditingBead] = useState<Bead | null>(null);

  useEffect(() => {
    const taskId = searchParams.get('task');
    if (taskId) {
      // Fetch and open task in edit modal
      const bead = findBeadById(taskId);
      if (bead) {
        setEditingBead(bead);
      }
    }
  }, [searchParams]);

  return { editingBead, setEditingBead };
}
```

---

## 6. Component Composition Patterns

### Compound Component Pattern

Used for views that have multiple interconnected parts sharing implicit state.

```typescript
// src/components/views/ListView/ListView.tsx

import { createContext, useContext, ReactNode } from 'react';

// Internal context for compound components
interface ListViewContextValue {
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  selectedIds: Set<string>;
  onSort: (column: string) => void;
  onSelect: (id: string, multi?: boolean) => void;
  onSelectAll: () => void;
}

const ListViewContext = createContext<ListViewContextValue | null>(null);

function useListViewContext() {
  const context = useContext(ListViewContext);
  if (!context) {
    throw new Error('ListView compound components must be used within ListView');
  }
  return context;
}

// Main component provides context
interface ListViewProps {
  children: ReactNode;
  beads: Bead[];
  // ...
}

function ListView({ children, beads }: ListViewProps) {
  const [state, setState] = useListState();

  const contextValue: ListViewContextValue = {
    sortColumn: state.sortColumn,
    sortDirection: state.sortDirection,
    selectedIds: state.selectedIds,
    onSort: (column) => {/* ... */},
    onSelect: (id, multi) => {/* ... */},
    onSelectAll: () => {/* ... */},
  };

  return (
    <ListViewContext.Provider value={contextValue}>
      <div className="list-view">
        {children}
      </div>
    </ListViewContext.Provider>
  );
}

// Compound components
function Header({ columns }: { columns: ColumnDef[] }) {
  const { sortColumn, sortDirection, onSort, onSelectAll } = useListViewContext();

  return (
    <div className="list-header">
      <div className="list-header-checkbox">
        <input type="checkbox" onChange={onSelectAll} />
      </div>
      {columns.map((col) => (
        <div
          key={col.id}
          className={`list-header-cell ${sortColumn === col.id ? 'sorted' : ''}`}
          onClick={() => onSort(col.id)}
        >
          {col.label}
          {sortColumn === col.id && (
            <span className="sort-indicator">
              {sortDirection === 'asc' ? '^' : 'v'}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function Row({ bead }: { bead: Bead }) {
  const { selectedIds, onSelect } = useListViewContext();
  const isSelected = selectedIds.has(bead.id);

  return (
    <div
      className={`list-row ${isSelected ? 'selected' : ''}`}
      onClick={(e) => onSelect(bead.id, e.metaKey || e.ctrlKey)}
    >
      {/* ... */}
    </div>
  );
}

function BulkActions() {
  const { selectedIds } = useListViewContext();

  if (selectedIds.size === 0) return null;

  return (
    <div className="bulk-actions">
      <span>{selectedIds.size} selected</span>
      <button>Mark Done</button>
      <button>Change Priority</button>
    </div>
  );
}

// Attach compound components
ListView.Header = Header;
ListView.Row = Row;
ListView.BulkActions = BulkActions;

export { ListView };

// Usage
function MyListView() {
  return (
    <ListView beads={beads}>
      <ListView.Header columns={columns} />
      {rows.map((row) => (
        <ListView.Row key={row.bead.id} bead={row.bead} />
      ))}
      <ListView.BulkActions />
    </ListView>
  );
}
```

### Render Props for Shared Logic

Used when views need custom rendering with shared behavior.

```typescript
// src/components/shared/DraggableItem.tsx

interface DraggableRenderProps {
  isDragging: boolean;
  dragRef: React.RefObject<HTMLElement>;
  dragHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
  };
}

interface DraggableItemProps<T> {
  item: T;
  onDragStart?: (item: T) => void;
  onDragEnd?: (item: T, position: { x: number; y: number }) => void;
  children: (props: DraggableRenderProps) => ReactNode;
}

function DraggableItem<T>({
  item,
  onDragStart,
  onDragEnd,
  children
}: DraggableItemProps<T>) {
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    onDragStart?.(item);
    // ... drag logic
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Long press detection
    // ... touch drag logic
  };

  return children({
    isDragging,
    dragRef,
    dragHandleProps: {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
    },
  });
}

// Usage in BoardCard
function BoardCard({ bead, onStatusChange }) {
  return (
    <DraggableItem
      item={bead}
      onDragEnd={(item, pos) => {
        const newStatus = getColumnAtPosition(pos);
        if (newStatus) onStatusChange(item.id, newStatus);
      }}
    >
      {({ isDragging, dragRef, dragHandleProps }) => (
        <div
          ref={dragRef}
          className={`board-card ${isDragging ? 'dragging' : ''}`}
          {...dragHandleProps}
        >
          <h3>{bead.title}</h3>
          <StatusBadge status={bead.status} />
        </div>
      )}
    </DraggableItem>
  );
}
```

### Slot Pattern for View Customization

```typescript
// src/components/views/ViewLayout.tsx

interface ViewLayoutSlots {
  header?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
  toolbar?: ReactNode;
}

interface ViewLayoutProps extends ViewLayoutSlots {
  children: ReactNode;
  className?: string;
}

function ViewLayout({
  children,
  header,
  sidebar,
  footer,
  toolbar,
  className = ''
}: ViewLayoutProps) {
  return (
    <div className={`view-layout ${className}`}>
      {header && <div className="view-header">{header}</div>}
      <div className="view-body">
        {sidebar && <aside className="view-sidebar">{sidebar}</aside>}
        <main className="view-main">
          {toolbar && <div className="view-toolbar">{toolbar}</div>}
          {children}
        </main>
      </div>
      {footer && <div className="view-footer">{footer}</div>}
    </div>
  );
}

// Usage
function BoardView({ beads }) {
  return (
    <ViewLayout
      toolbar={<FilterBar />}
      footer={<Legend />}
    >
      <div className="board-columns">
        {columns.map((col) => (
          <BoardColumn key={col.id} column={col} />
        ))}
      </div>
    </ViewLayout>
  );
}
```

---

## 7. Performance Strategy

### Virtualization for Large Lists

```typescript
// src/components/views/ListView/VirtualizedList.tsx

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface VirtualizedListProps {
  items: ListRowData[];
  renderRow: (row: ListRowData, index: number) => ReactNode;
  rowHeight?: number;
  overscan?: number;
}

export function VirtualizedList({
  items,
  renderRow,
  rowHeight = 44,
  overscan = 5
}: VirtualizedListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="list-scroll-container"
      style={{ height: '100%', overflow: 'auto' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const item = items[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderRow(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Virtualization thresholds per view
const VIRTUALIZATION_THRESHOLDS = {
  board: 50,      // Items per column before virtualizing
  list: 100,      // Total rows before virtualizing
  timeline: 200,  // Total tasks before virtualizing
};
```

### Memoization Points

```typescript
// Key memoization locations:

// 1. Filtered data (prevents re-filtering on every render)
const filteredBeads = useMemo(() =>
  applyFilters(beads, filters),
  [beads, filters]
);

// 2. Transformed data (prevents re-transformation)
const columns = useMemo(() =>
  transformBeadsToColumns(filteredBeads),
  [filteredBeads]
);

// 3. Component-level memoization
const MemoizedCard = React.memo(BoardCard, (prev, next) => {
  return (
    prev.bead.id === next.bead.id &&
    prev.bead.status === next.bead.status &&
    prev.bead.title === next.bead.title &&
    prev.isDragging === next.isDragging
  );
});

// 4. Event handlers
const handleCardClick = useCallback((id: string) => {
  setEditingBead(beads.find(b => b.id === id) || null);
}, [beads]);

// 5. Computed styles
const barStyle = useMemo(() => ({
  left: `${startOffset * dayWidth}px`,
  width: `${duration * dayWidth}px`,
  top: `${rowIndex * ROW_HEIGHT}px`,
}), [startOffset, duration, dayWidth, rowIndex]);
```

### Lazy Loading Strategy

```typescript
// src/components/views/index.ts

import { lazy, Suspense } from 'react';

// Lazy load view components
export const BoardView = lazy(() =>
  import('./BoardView').then(mod => ({ default: mod.BoardView }))
);

export const ListView = lazy(() =>
  import('./ListView').then(mod => ({ default: mod.ListView }))
);

export const TimelineView = lazy(() =>
  import('./TimelineView').then(mod => ({ default: mod.TimelineView }))
);

// Usage with Suspense
function ViewContent({ activeView, ...props }) {
  return (
    <Suspense fallback={<SkeletonLoader view={activeView} />}>
      {activeView === 'board' && <BoardView {...props} />}
      {activeView === 'list' && <ListView {...props} />}
      {activeView === 'timeline' && <TimelineView {...props} />}
    </Suspense>
  );
}
```

### Bundle Splitting

```typescript
// next.config.js bundle configuration

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      '@tanstack/react-virtual',
      'date-fns',
      'framer-motion',
    ],
  },
};

// Expected bundle splits:
// - Main bundle: Core React, ViewContext, shared utilities
// - BoardView chunk: Board-specific components and drag/drop
// - ListView chunk: List components, sorting, selection
// - TimelineView chunk: Timeline components, date calculations, SVG rendering
```

### Performance Targets

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| View switch | < 100ms | Time from click to content visible |
| Initial load (100 tasks) | < 500ms | Time to interactive |
| Initial load (500 tasks) | < 1000ms | Time to interactive |
| Filter application | < 50ms | Time from input to results |
| Scroll FPS | 60 FPS | Chrome DevTools Performance |
| Memory (1000 tasks) | < 50MB | Chrome Memory profiler |

---

## 8. Alternatives Considered

### Why Not Redux/Zustand?

**Considered**: Global state management with Redux or Zustand

**Decision**: Use React Context

**Rationale**:

1. **Scope of State**: The shared state is limited to view selection and filters. This doesn't warrant the boilerplate of Redux or an external library.

2. **Component Tree Depth**: The view components are relatively shallow. Context re-renders are manageable with proper memoization.

3. **Server Components**: Next.js App Router encourages server components. Client state should be minimal and localized. Redux adds friction to this model.

4. **Bundle Size**: Context is built-in. Redux adds ~7KB gzipped, Zustand adds ~3KB. For limited state, this overhead isn't justified.

5. **Team Familiarity**: Context patterns are well-understood. Introducing a new state library increases cognitive load.

**When to Reconsider**: If we add real-time collaboration, optimistic updates with complex rollback, or undo/redo functionality, Zustand's middleware would be valuable.

### Why Not Separate Routes Per View?

**Considered**: `/dashboard/board`, `/dashboard/list`, `/dashboard/timeline`

**Decision**: Single route with query parameter (`/dashboard?view=board`)

**Rationale**:

1. **Shared Data**: All views consume the same data. Separate routes would require data re-fetching or complex caching on navigation.

2. **Transition Animation**: Query parameter changes don't trigger full page transitions, enabling smooth view switching animations.

3. **Filter Persistence**: With a single route, filters naturally persist in the URL across view switches.

4. **Mental Model**: Users think of views as "different ways to see the same data", not "different pages". The URL structure should reflect this.

5. **Pre-rendering**: Next.js can pre-render the page shell once. View switching is purely client-side.

**Trade-offs**:
- Cannot use `generateStaticParams` for view-specific static generation
- Deep linking requires parsing query strings instead of path segments
- Slightly more complex URL handling code

### Why Not a Single Unified Component?

**Considered**: Enhance `GanttChart.tsx` to render all three views

**Decision**: Extract views into separate components

**Rationale**:

1. **Separation of Concerns**: Each view has distinct rendering logic, state, and interactions. A unified component would be 2000+ lines.

2. **Bundle Size**: Users who only use Timeline view shouldn't download Board and List code.

3. **Testing**: Isolated components are easier to unit test.

4. **Team Velocity**: Multiple developers can work on different views in parallel.

5. **Maintenance**: Bug fixes in one view don't risk regressions in others.

**Trade-offs**:
- More files to navigate
- Some code duplication (mitigated by shared components/hooks)
- Coordination needed for shared state changes

---

## 9. Consequences

### Positive

1. **Maintainable Codebase**: Clear separation between views, shared components, and state management.

2. **Improved Performance**: Lazy loading and virtualization enable handling 1000+ tasks without degradation.

3. **Better UX**: Sub-100ms view switching provides responsive feel. URL-based deep linking enables sharing.

4. **Testability**: Isolated components and hooks are easily unit-tested. ViewContext can be mocked for integration tests.

5. **Extensibility**: Adding a fourth view (e.g., Calendar) follows the same patterns without affecting existing views.

6. **Developer Experience**: Clear patterns for state management, data transformation, and component composition.

### Negative

1. **Increased Complexity**: More files, more patterns to learn. New developers need onboarding.

2. **Migration Effort**: Extracting `TimelineView` from `GanttChart.tsx` requires careful refactoring to avoid regressions.

3. **Context Re-renders**: Global filter changes re-render all views. Must ensure proper memoization.

4. **Testing Overhead**: More components means more tests to write and maintain.

5. **Bundle Size**: Despite code splitting, the total bundle will be larger than the current single-view implementation.

### Migration Path

The migration from current implementation preserves backward compatibility:

**Phase 1: Foundation (Week 1)**
- Create `ViewContext` and hooks
- Build `ViewSwitcher` component
- Set up file structure for new components
- Current `GanttChart.tsx` continues to work unchanged

**Phase 2: TimelineView Extraction (Week 1-2)**
- Create `TimelineView.tsx` by copying current `GanttChart.tsx`
- Refactor to use `ViewContext` for filters
- Extract shared components (`StatusBadge`, `PriorityBadge`)
- Keep `GanttChart.tsx` as wrapper for backward compatibility

**Phase 3: BoardView (Week 2-3)**
- Implement `BoardView` components
- Add drag-and-drop with status update
- Integrate with `ViewContext`

**Phase 4: ListView (Week 3-4)**
- Implement `ListView` components
- Add sorting, selection, bulk actions
- Integrate with `ViewContext`

**Phase 5: Polish (Week 4-5)**
- Add virtualization where needed
- Performance optimization
- Accessibility audit
- Testing
- Documentation

---

## 10. Implementation Plan

### Phase 1: Foundation (3-5 days)

**Deliverables:**
1. ViewContext with state management
2. ViewSwitcher tab component
3. URL sync with Next.js App Router
4. File structure setup

**Files Created:**
```
src/components/
  views/
    ViewContext.tsx
    ViewContainer.tsx
    ViewSwitcher.tsx
    index.ts
  hooks/
    useViewState.ts
    useTaskFiltering.ts
    index.ts
```

**Success Criteria:**
- View tabs render and switch state
- URL updates on view change
- State persists to localStorage
- No regressions in current `GanttChart.tsx`

### Phase 2: TimelineView Extraction (3-5 days)

**Deliverables:**
1. TimelineView extracted from GanttChart
2. Shared components extracted
3. Timeline-specific hooks

**Files Created:**
```
src/components/
  views/
    TimelineView/
      TimelineView.tsx
      TimelineHeader.tsx
      TimelineBar.tsx
      TimelineRow.tsx
      DependencyLines.tsx
      useTimelineDrag.ts
      useTimelineZoom.ts
      index.ts
  shared/
    StatusBadge.tsx
    PriorityBadge.tsx
    TeamBadge.tsx
    index.ts
```

**Success Criteria:**
- TimelineView renders identically to current GanttChart
- All existing functionality preserved
- Uses ViewContext for filters
- GanttChart.tsx becomes thin wrapper (deprecation path)

### Phase 3: BoardView (5-7 days)

**Deliverables:**
1. BoardView with columns
2. Drag-and-drop between columns
3. Card quick-edit

**Files Created:**
```
src/components/
  views/
    BoardView/
      BoardView.tsx
      BoardColumn.tsx
      BoardCard.tsx
      useBoardDragDrop.ts
      index.ts
  shared/
    TaskCard.tsx
    DraggableItem.tsx
```

**Success Criteria:**
- Columns render by status
- Cards display task info correctly
- Drag between columns updates status
- Mobile responsive (single column + swipe)

### Phase 4: ListView (5-7 days)

**Deliverables:**
1. ListView with sortable columns
2. Row selection (single, multi, range)
3. Bulk actions

**Files Created:**
```
src/components/
  views/
    ListView/
      ListView.tsx
      ListHeader.tsx
      ListRow.tsx
      ListBulkActions.tsx
      useListSort.ts
      useListSelection.ts
      index.ts
```

**Success Criteria:**
- Table renders all columns
- Sorting works on all sortable columns
- Selection works (click, Ctrl+click, Shift+click)
- Bulk actions update selected items
- Mobile responsive (card layout)

### Phase 5: Polish and Optimization (5-7 days)

**Deliverables:**
1. Virtualization for large datasets
2. Performance optimization
3. Accessibility compliance
4. Comprehensive tests
5. Documentation

**Tasks:**
- Add `@tanstack/react-virtual` for list/timeline
- Profile and optimize re-renders
- WCAG 2.1 AA audit and fixes
- Unit tests for hooks and utilities
- Integration tests for views
- Update component documentation

**Success Criteria:**
- 1000 tasks render without frame drops
- View switch < 100ms
- Filter application < 50ms
- Keyboard navigation works in all views
- Screen reader announcements correct
- Test coverage > 80%

---

## Appendix A: Type Definitions

```typescript
// src/lib/types.ts additions

export type ViewType = 'board' | 'list' | 'timeline';

export interface ViewState {
  activeView: ViewType;
  filters: FilterState;
  viewState: ViewSpecificState;
  isTransitioning: boolean;
}

export interface FilterState {
  searchQuery: string;
  statusFilter: Bead['status'][];
  priorityFilter: number[];
  teamFilter: string | null;
  assigneeFilter: string | null;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface BoardViewState {
  collapsedColumns: Set<string>;
  columnOrder: string[];
}

export interface ListViewState {
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  selectedIds: Set<string>;
}

export interface TimelineViewState {
  collapsedIds: Set<string>;
  zoomIndex: number;
  scrollPosition: number;
}

export interface ViewSpecificState {
  board: BoardViewState;
  list: ListViewState;
  timeline: TimelineViewState;
}
```

---

## Appendix B: Migration Checklist

### Pre-Migration
- [ ] Document current GanttChart.tsx behavior
- [ ] Write characterization tests for existing functionality
- [ ] Identify all localStorage keys in use
- [ ] Review current CSS for extractable patterns

### Phase 1 Checklist
- [ ] ViewContext.tsx implemented
- [ ] ViewContainer.tsx renders placeholder
- [ ] ViewSwitcher.tsx tabs functional
- [ ] URL sync working
- [ ] localStorage persistence working
- [ ] No console errors

### Phase 2 Checklist
- [ ] TimelineView renders identically
- [ ] Zoom slider works
- [ ] Collapse/expand works
- [ ] Drag to move works
- [ ] Drag to resize works
- [ ] Dependencies render
- [ ] Search filter works
- [ ] Status filter works

### Phase 3 Checklist
- [ ] Columns render by status
- [ ] Cards show all metadata
- [ ] Drag between columns works
- [ ] Status updates on drop
- [ ] Error handling (rollback)
- [ ] Mobile single-column mode

### Phase 4 Checklist
- [ ] All columns render
- [ ] Sorting by each column
- [ ] Single selection
- [ ] Multi-selection (Ctrl+click)
- [ ] Range selection (Shift+click)
- [ ] Select all (header checkbox)
- [ ] Bulk mark done
- [ ] Bulk change priority
- [ ] Clear selection

### Phase 5 Checklist
- [ ] Virtualization enabled (100+ items)
- [ ] No frame drops at 60fps scroll
- [ ] View switch under 100ms
- [ ] Filter under 50ms
- [ ] ARIA labels complete
- [ ] Keyboard navigation complete
- [ ] Focus management correct
- [ ] Screen reader tested
- [ ] Unit tests passing
- [ ] Integration tests passing

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-08 | Engineering | Initial ADR |
