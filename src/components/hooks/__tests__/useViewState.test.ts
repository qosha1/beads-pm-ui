import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useViewState } from '../useViewState';

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

describe('useViewState', () => {
  let mockPush: vi.Mock;
  let mockSearchParams: URLSearchParams;

  beforeEach(() => {
    localStorage.clear();

    mockPush = vi.fn();
    mockSearchParams = new URLSearchParams();

    (useRouter as vi.Mock).mockReturnValue({ push: mockPush });
    (usePathname as vi.Mock).mockReturnValue('/dashboard');
    (useSearchParams as vi.Mock).mockReturnValue(mockSearchParams);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks(); // Restore any spied methods
  });

  describe('initialization', () => {
    it('should initialize with default view', () => {
      const { result } = renderHook(() => useViewState());

      expect(result.current.activeView).toBe('timeline');
      expect(result.current.isTimeline).toBe(true);
      expect(result.current.isBoard).toBe(false);
      expect(result.current.isList).toBe(false);
    });

    it('should accept custom default view', () => {
      const { result } = renderHook(() => useViewState({ defaultView: 'board' }));

      expect(result.current.activeView).toBe('board');
      expect(result.current.isBoard).toBe(true);
    });

    it('should initialize from URL parameter', () => {
      mockSearchParams.set('view', 'list');

      const { result } = renderHook(() => useViewState());

      expect(result.current.activeView).toBe('list');
      expect(result.current.isList).toBe(true);
    });

    it('should initialize from localStorage when no URL param', () => {
      localStorage.setItem('gantt-active-view', 'board');

      const { result } = renderHook(() => useViewState());

      expect(result.current.activeView).toBe('board');
    });

    it('should prioritize URL over localStorage', () => {
      localStorage.setItem('gantt-active-view', 'board');
      mockSearchParams.set('view', 'list');

      const { result } = renderHook(() => useViewState());

      expect(result.current.activeView).toBe('list');
    });

    it('should ignore invalid URL view values', () => {
      mockSearchParams.set('view', 'invalid');

      const { result } = renderHook(() => useViewState());

      expect(result.current.activeView).toBe('timeline');
    });

    it('should ignore invalid localStorage values', () => {
      localStorage.setItem('gantt-active-view', 'invalid');

      const { result } = renderHook(() => useViewState());

      expect(result.current.activeView).toBe('timeline');
    });
  });

  describe('setActiveView', () => {
    it('should update active view state', () => {
      const { result } = renderHook(() => useViewState());

      act(() => {
        result.current.setActiveView('board');
      });

      expect(result.current.activeView).toBe('board');
      expect(result.current.isBoard).toBe(true);
      expect(result.current.isTimeline).toBe(false);
    });

    it('should update URL with new view', async () => {
      const { result } = renderHook(() => useViewState());

      act(() => {
        result.current.setActiveView('list');
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/dashboard?view=list',
          { scroll: false }
        );
      });
    });

    it('should preserve existing URL parameters', async () => {
      mockSearchParams.set('search', 'test');
      mockSearchParams.set('status', 'open');

      const { result } = renderHook(() => useViewState());

      act(() => {
        result.current.setActiveView('board');
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('search=test'),
          { scroll: false }
        );
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('status=open'),
          { scroll: false }
        );
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('view=board'),
          { scroll: false }
        );
      });
    });

    it('should persist view to localStorage', async () => {
      const { result } = renderHook(() => useViewState());

      act(() => {
        result.current.setActiveView('board');
      });

      await waitFor(() => {
        expect(localStorage.getItem('gantt-active-view')).toBe('board');
      });
    });

    it('should use custom persist key', async () => {
      const { result } = renderHook(() =>
        useViewState({ persistKey: 'custom-view-key' })
      );

      act(() => {
        result.current.setActiveView('list');
      });

      await waitFor(() => {
        expect(localStorage.getItem('custom-view-key')).toBe('list');
      });
    });

    it('should not scroll when updating URL', async () => {
      const { result } = renderHook(() => useViewState());

      act(() => {
        result.current.setActiveView('board');
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.any(String),
          { scroll: false }
        );
      });
    });
  });

  describe('URL synchronization', () => {
    it('should update state when URL changes', () => {
      const { result, rerender } = renderHook(() => useViewState());

      expect(result.current.activeView).toBe('timeline');

      // Simulate URL change by updating the mock return value
      const newSearchParams = new URLSearchParams('view=board');
      (useSearchParams as vi.Mock).mockReturnValue(newSearchParams);
      rerender();

      // State should update to match URL
      expect(result.current.activeView).toBe('board');
    });

    it('should handle browser back/forward navigation', () => {
      mockSearchParams.set('view', 'board');

      const { result } = renderHook(() => useViewState());

      expect(result.current.activeView).toBe('board');

      // Simulate back navigation
      mockSearchParams.set('view', 'list');

      // Re-render to simulate effect re-run
      const { result: result2 } = renderHook(() => useViewState());

      expect(result2.current.activeView).toBe('list');
    });
  });

  describe('boolean helper properties', () => {
    it('should correctly set isBoard', () => {
      const { result } = renderHook(() => useViewState());

      act(() => {
        result.current.setActiveView('board');
      });

      expect(result.current.isBoard).toBe(true);
      expect(result.current.isList).toBe(false);
      expect(result.current.isTimeline).toBe(false);
    });

    it('should correctly set isList', () => {
      const { result } = renderHook(() => useViewState());

      act(() => {
        result.current.setActiveView('list');
      });

      expect(result.current.isBoard).toBe(false);
      expect(result.current.isList).toBe(true);
      expect(result.current.isTimeline).toBe(false);
    });

    it('should correctly set isTimeline', () => {
      const { result } = renderHook(() => useViewState());

      // Default is timeline
      expect(result.current.isBoard).toBe(false);
      expect(result.current.isList).toBe(false);
      expect(result.current.isTimeline).toBe(true);
    });

    it('should update boolean helpers when view changes', () => {
      const { result } = renderHook(() => useViewState());

      act(() => {
        result.current.setActiveView('board');
      });
      expect(result.current.isBoard).toBe(true);

      act(() => {
        result.current.setActiveView('list');
      });
      expect(result.current.isBoard).toBe(false);
      expect(result.current.isList).toBe(true);

      act(() => {
        result.current.setActiveView('timeline');
      });
      expect(result.current.isList).toBe(false);
      expect(result.current.isTimeline).toBe(true);
    });
  });

  describe('multiple instances', () => {
    it('should allow multiple independent instances with different keys', async () => {
      const { result: result1 } = renderHook(() =>
        useViewState({ persistKey: 'view1' })
      );

      const { result: result2 } = renderHook(() =>
        useViewState({ persistKey: 'view2' })
      );

      act(() => {
        result1.current.setActiveView('board');
      });

      act(() => {
        result2.current.setActiveView('list');
      });

      await waitFor(() => {
        expect(localStorage.getItem('view1')).toBe('board');
        expect(localStorage.getItem('view2')).toBe('list');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle localStorage unavailable gracefully', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      setItemSpy.mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });

      const { result } = renderHook(() => useViewState());

      // Should not throw
      expect(() => {
        act(() => {
          result.current.setActiveView('board');
        });
      }).not.toThrow();

      setItemSpy.mockRestore();
    });

    it('should handle rapid view changes', async () => {
      const { result } = renderHook(() => useViewState());

      act(() => {
        result.current.setActiveView('board');
        result.current.setActiveView('list');
        result.current.setActiveView('timeline');
      });

      expect(result.current.activeView).toBe('timeline');

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/dashboard?view=timeline',
          { scroll: false }
        );
      });
    });

    it('should maintain consistency across re-renders', () => {
      const { result, rerender } = renderHook(() => useViewState());

      act(() => {
        result.current.setActiveView('board');
      });

      rerender();

      expect(result.current.activeView).toBe('board');
      expect(result.current.isBoard).toBe(true);
    });
  });

  describe('type safety', () => {
    it('should only accept valid ViewType values', () => {
      const { result } = renderHook(() => useViewState());

      // TypeScript should prevent this at compile time
      // but we can test runtime behavior
      act(() => {
        result.current.setActiveView('board');
        result.current.setActiveView('list');
        result.current.setActiveView('timeline');
      });

      // All valid values should work
      expect(result.current.activeView).toBe('timeline');
    });
  });
});
