import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  ViewProvider,
  useViewContext,
  useActiveView,
  useFilters,
  useBoardState,
  useListState,
  useTimelineState,
  ViewType,
} from '../ViewContext';

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

describe('ViewContext', () => {
  let mockPush: vi.Mock;
  let mockSearchParams: URLSearchParams;

  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();

    // Setup mocks
    mockPush = vi.fn();
    mockSearchParams = new URLSearchParams();

    (useRouter as vi.Mock).mockReturnValue({ push: mockPush });
    (usePathname as vi.Mock).mockReturnValue('/dashboard');
    (useSearchParams as vi.Mock).mockReturnValue(mockSearchParams);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ViewProvider>{children}</ViewProvider>
  );

  describe('useViewContext', () => {
    it('should throw error when used outside ViewProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useViewContext());
      }).toThrow('useViewContext must be used within a ViewProvider');

      consoleSpy.mockRestore();
    });

    it('should provide context value within ViewProvider', () => {
      const { result } = renderHook(() => useViewContext(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.state).toBeDefined();
      expect(result.current.setActiveView).toBeDefined();
      expect(result.current.setFilters).toBeDefined();
      expect(result.current.clearFilters).toBeDefined();
    });

    it('should initialize with default state', () => {
      const { result } = renderHook(() => useViewContext(), { wrapper });

      expect(result.current.state.activeView).toBe('timeline');
      expect(result.current.state.filters.searchQuery).toBe('');
      expect(result.current.state.filters.statusFilter).toEqual([]);
      expect(result.current.state.isTransitioning).toBe(false);
    });
  });

  describe('useActiveView', () => {
    it('should return current active view', () => {
      const { result } = renderHook(() => useActiveView(), { wrapper });

      expect(result.current[0]).toBe('timeline');
    });

    it('should update active view and sync to URL', async () => {
      const { result } = renderHook(() => useActiveView(), { wrapper });

      act(() => {
        result.current[1]('board');
      });

      expect(result.current[0]).toBe('board');
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/dashboard?view=board',
          { scroll: false }
        );
      });
    });

    it('should persist active view to localStorage', async () => {
      const { result } = renderHook(() => useActiveView(), { wrapper });

      act(() => {
        result.current[1]('list');
      });

      await waitFor(() => {
        expect(localStorage.getItem('gantt-active-view')).toBe('list');
      });
    });

    it('should set transitioning state when changing views', async () => {
      const { result: viewResult } = renderHook(() => useViewContext(), { wrapper });

      act(() => {
        viewResult.current.setActiveView('board');
      });

      expect(viewResult.current.state.isTransitioning).toBe(true);

      // Wait for timeout to clear transitioning flag
      await waitFor(() => {
        expect(viewResult.current.state.isTransitioning).toBe(false);
      }, { timeout: 300 });
    });
  });

  describe('useFilters', () => {
    it('should return current filters', () => {
      const { result } = renderHook(() => useFilters(), { wrapper });

      expect(result.current[0]).toEqual({
        searchQuery: '',
        statusFilter: [],
        priorityFilter: [],
        teamFilter: null,
        assigneeFilter: null,
      });
    });

    it('should update search query filter', () => {
      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current[1]({ searchQuery: 'test query' });
      });

      expect(result.current[0].searchQuery).toBe('test query');
    });

    it('should update status filter and sync to URL', async () => {
      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current[1]({ statusFilter: ['open', 'in_progress'] });
      });

      expect(result.current[0].statusFilter).toEqual(['open', 'in_progress']);
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/dashboard?status=open%2Cin_progress',
          { scroll: false }
        );
      });
    });

    it('should persist search query to localStorage', async () => {
      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current[1]({ searchQuery: 'persistent search' });
      });

      await waitFor(() => {
        expect(localStorage.getItem('gantt-search-query')).toBe('persistent search');
      });
    });

    it('should update multiple filters at once', () => {
      const { result } = renderHook(() => useFilters(), { wrapper });

      act(() => {
        result.current[1]({
          searchQuery: 'multi',
          statusFilter: ['closed'],
          priorityFilter: [0, 1],
        });
      });

      expect(result.current[0].searchQuery).toBe('multi');
      expect(result.current[0].statusFilter).toEqual(['closed']);
      expect(result.current[0].priorityFilter).toEqual([0, 1]);
    });
  });

  describe('clearFilters', () => {
    it('should reset all filters to default', () => {
      const { result } = renderHook(() => useViewContext(), { wrapper });

      // Set some filters
      act(() => {
        result.current.setFilters({
          searchQuery: 'test',
          statusFilter: ['open'],
          priorityFilter: [1],
        });
      });

      // Clear filters
      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.state.filters).toEqual({
        searchQuery: '',
        statusFilter: [],
        priorityFilter: [],
        teamFilter: null,
        assigneeFilter: null,
      });
    });

    it('should clear URL parameters', async () => {
      const { result } = renderHook(() => useViewContext(), { wrapper });

      act(() => {
        result.current.clearFilters();
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/dashboard?',
          { scroll: false }
        );
      });
    });

    it('should remove search query from localStorage', async () => {
      localStorage.setItem('gantt-search-query', 'test');
      const { result } = renderHook(() => useViewContext(), { wrapper });

      act(() => {
        result.current.clearFilters();
      });

      await waitFor(() => {
        expect(localStorage.getItem('gantt-search-query')).toBeNull();
      });
    });
  });

  describe('useBoardState', () => {
    it('should return board state', () => {
      const { result } = renderHook(() => useBoardState(), { wrapper });

      expect(result.current[0]).toEqual({
        collapsedColumns: new Set(),
        columnOrder: ['open', 'in_progress', 'closed', 'blocked', 'deferred'],
      });
    });

    it('should update board state', () => {
      const { result } = renderHook(() => useBoardState(), { wrapper });

      act(() => {
        result.current[1]({ collapsedColumns: new Set(['open']) });
      });

      expect(result.current[0].collapsedColumns).toEqual(new Set(['open']));
    });

    it('should update column order', () => {
      const { result } = renderHook(() => useBoardState(), { wrapper });

      const newOrder = ['blocked', 'open', 'in_progress', 'closed', 'deferred'];
      act(() => {
        result.current[1]({ columnOrder: newOrder });
      });

      expect(result.current[0].columnOrder).toEqual(newOrder);
    });
  });

  describe('useListState', () => {
    it('should return list state', () => {
      const { result } = renderHook(() => useListState(), { wrapper });

      expect(result.current[0]).toEqual({
        sortColumn: 'priority',
        sortDirection: 'asc',
        selectedIds: new Set(),
      });
    });

    it('should update sort column and direction', () => {
      const { result } = renderHook(() => useListState(), { wrapper });

      act(() => {
        result.current[1]({ sortColumn: 'title', sortDirection: 'desc' });
      });

      expect(result.current[0].sortColumn).toBe('title');
      expect(result.current[0].sortDirection).toBe('desc');
    });

    it('should update selected IDs', () => {
      const { result } = renderHook(() => useListState(), { wrapper });

      act(() => {
        result.current[1]({ selectedIds: new Set(['id1', 'id2']) });
      });

      expect(result.current[0].selectedIds).toEqual(new Set(['id1', 'id2']));
    });
  });

  describe('useTimelineState', () => {
    it('should return timeline state', () => {
      const { result } = renderHook(() => useTimelineState(), { wrapper });

      expect(result.current[0]).toEqual({
        collapsedIds: new Set(),
        zoomIndex: 3,
        scrollPosition: 0,
      });
    });

    it('should update zoom index', () => {
      const { result } = renderHook(() => useTimelineState(), { wrapper });

      act(() => {
        result.current[1]({ zoomIndex: 5 });
      });

      expect(result.current[0].zoomIndex).toBe(5);
    });

    it('should update collapsed IDs', () => {
      const { result } = renderHook(() => useTimelineState(), { wrapper });

      act(() => {
        result.current[1]({ collapsedIds: new Set(['task1', 'task2']) });
      });

      expect(result.current[0].collapsedIds).toEqual(new Set(['task1', 'task2']));
    });
  });

  describe('computed values', () => {
    it('should calculate hasActiveFilters correctly', () => {
      const { result } = renderHook(() => useViewContext(), { wrapper });

      expect(result.current.hasActiveFilters).toBe(false);

      act(() => {
        result.current.setFilters({ searchQuery: 'test' });
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should calculate activeFilterCount correctly', () => {
      const { result } = renderHook(() => useViewContext(), { wrapper });

      expect(result.current.activeFilterCount).toBe(0);

      act(() => {
        result.current.setFilters({
          searchQuery: 'test',
          statusFilter: ['open'],
          priorityFilter: [1],
        });
      });

      expect(result.current.activeFilterCount).toBe(3);
    });
  });

  describe('URL initialization', () => {
    it('should initialize from URL parameters', () => {
      mockSearchParams.set('view', 'board');
      mockSearchParams.set('search', 'url%20search');
      mockSearchParams.set('status', 'open,in_progress');

      const { result } = renderHook(() => useViewContext(), { wrapper });

      expect(result.current.state.activeView).toBe('board');
      expect(result.current.state.filters.searchQuery).toBe('url search');
      expect(result.current.state.filters.statusFilter).toEqual(['open', 'in_progress']);
    });

    it('should prioritize URL over localStorage', () => {
      localStorage.setItem('gantt-active-view', 'list');
      mockSearchParams.set('view', 'board');

      const { result } = renderHook(() => useViewContext(), { wrapper });

      expect(result.current.state.activeView).toBe('board');
    });
  });

  describe('initialView prop', () => {
    it('should override URL and localStorage with initialView prop', () => {
      mockSearchParams.set('view', 'board');
      localStorage.setItem('gantt-active-view', 'list');

      const customWrapper = ({ children }: { children: ReactNode }) => (
        <ViewProvider initialView="timeline">{children}</ViewProvider>
      );

      const { result } = renderHook(() => useViewContext(), { wrapper: customWrapper });

      expect(result.current.state.activeView).toBe('timeline');
    });
  });
});
