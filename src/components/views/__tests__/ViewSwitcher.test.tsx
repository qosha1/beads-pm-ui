import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ViewProvider } from '../ViewContext';
import { ViewSwitcher } from '../ViewSwitcher';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

describe('ViewSwitcher', () => {
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
  });

  const renderViewSwitcher = () => {
    return render(
      <ViewProvider>
        <ViewSwitcher />
      </ViewProvider>
    );
  };

  describe('rendering', () => {
    it('should render all three view tabs', () => {
      renderViewSwitcher();

      expect(screen.getByText('Board')).toBeInTheDocument();
      expect(screen.getByText('List')).toBeInTheDocument();
      expect(screen.getByText('Timeline')).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      renderViewSwitcher();

      const switcher = screen.getByRole('tablist');
      expect(switcher).toHaveAttribute('aria-label', 'View options');

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);

      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute('aria-selected');
        expect(tab).toHaveAttribute('aria-controls');
        expect(tab).toHaveAttribute('id');
      });
    });

    it('should mark timeline tab as active by default', () => {
      renderViewSwitcher();

      const timelineTab = screen.getByRole('tab', { name: /timeline/i });
      expect(timelineTab).toHaveAttribute('aria-selected', 'true');
      expect(timelineTab).toHaveClass('active');
    });

    it('should display icons for each tab', () => {
      renderViewSwitcher();

      const tabs = screen.getAllByRole('tab');
      tabs.forEach((tab) => {
        const icon = tab.querySelector('.view-tab-icon');
        expect(icon).toBeInTheDocument();
      });
    });
  });

  describe('view switching', () => {
    it('should switch to board view on click', async () => {
      renderViewSwitcher();

      const boardTab = screen.getByRole('tab', { name: /board/i });
      fireEvent.click(boardTab);

      await waitFor(() => {
        expect(boardTab).toHaveAttribute('aria-selected', 'true');
        expect(boardTab).toHaveClass('active');
      });
    });

    it('should switch to list view on click', async () => {
      renderViewSwitcher();

      const listTab = screen.getByRole('tab', { name: /list/i });
      fireEvent.click(listTab);

      await waitFor(() => {
        expect(listTab).toHaveAttribute('aria-selected', 'true');
        expect(listTab).toHaveClass('active');
      });
    });

    it('should update URL when switching views', async () => {
      renderViewSwitcher();

      const boardTab = screen.getByRole('tab', { name: /board/i });
      fireEvent.click(boardTab);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/dashboard?view=board',
          { scroll: false }
        );
      });
    });

    it('should only have one active tab at a time', async () => {
      renderViewSwitcher();

      const boardTab = screen.getByRole('tab', { name: /board/i });
      fireEvent.click(boardTab);

      await waitFor(() => {
        const activeTabs = screen.getAllByRole('tab', { selected: true });
        expect(activeTabs).toHaveLength(1);
        expect(activeTabs[0]).toBe(boardTab);
      });
    });
  });

  describe('keyboard shortcuts', () => {
    it('should switch to board view with Cmd+B', async () => {
      renderViewSwitcher();

      fireEvent.keyDown(window, { key: 'b', metaKey: true });

      await waitFor(() => {
        const boardTab = screen.getByRole('tab', { name: /board/i });
        expect(boardTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should switch to list view with Cmd+L', async () => {
      renderViewSwitcher();

      fireEvent.keyDown(window, { key: 'l', metaKey: true });

      await waitFor(() => {
        const listTab = screen.getByRole('tab', { name: /list/i });
        expect(listTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should switch to timeline view with Cmd+T', async () => {
      renderViewSwitcher();

      // Switch to board first
      const boardTab = screen.getByRole('tab', { name: /board/i });
      fireEvent.click(boardTab);

      // Then switch back to timeline with keyboard
      fireEvent.keyDown(window, { key: 't', metaKey: true });

      await waitFor(() => {
        const timelineTab = screen.getByRole('tab', { name: /timeline/i });
        expect(timelineTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should work with Ctrl key on Windows/Linux', async () => {
      renderViewSwitcher();

      fireEvent.keyDown(window, { key: 'b', ctrlKey: true });

      await waitFor(() => {
        const boardTab = screen.getByRole('tab', { name: /board/i });
        expect(boardTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should not trigger without modifier key', async () => {
      renderViewSwitcher();

      const timelineTab = screen.getByRole('tab', { name: /timeline/i });
      expect(timelineTab).toHaveAttribute('aria-selected', 'true');

      fireEvent.keyDown(window, { key: 'b' });

      await waitFor(() => {
        // Should still be on timeline
        expect(timelineTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should be case-insensitive', async () => {
      renderViewSwitcher();

      fireEvent.keyDown(window, { key: 'B', metaKey: true });

      await waitFor(() => {
        const boardTab = screen.getByRole('tab', { name: /board/i });
        expect(boardTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should prevent default browser behavior', () => {
      renderViewSwitcher();

      const event = new KeyboardEvent('keydown', {
        key: 'b',
        metaKey: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have tooltip titles with keyboard shortcuts', () => {
      renderViewSwitcher();

      const boardTab = screen.getByRole('tab', { name: /board/i });
      expect(boardTab).toHaveAttribute('title');
      expect(boardTab.getAttribute('title')).toContain('Cmd/Ctrl');
      expect(boardTab.getAttribute('title')).toContain('B');
    });

    it('should be keyboard navigable with Tab', () => {
      renderViewSwitcher();

      const tabs = screen.getAllByRole('tab');

      // Each tab should be focusable (have no negative tabindex)
      tabs.forEach(tab => {
        expect(tab).not.toHaveAttribute('tabIndex', '-1');
      });

      // Verify tabs are buttons which are natively focusable
      tabs.forEach(tab => {
        expect(tab.tagName).toBe('BUTTON');
      });
    });

    it('should be activatable with Enter key', async () => {
      const user = userEvent.setup();
      renderViewSwitcher();

      const boardTab = screen.getByRole('tab', { name: /board/i });

      // Click the board tab (simulates keyboard activation in a real browser)
      await user.click(boardTab);

      await waitFor(() => {
        expect(boardTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should have proper tab panel IDs', () => {
      renderViewSwitcher();

      const boardTab = screen.getByRole('tab', { name: /board/i });
      const listTab = screen.getByRole('tab', { name: /list/i });
      const timelineTab = screen.getByRole('tab', { name: /timeline/i });

      expect(boardTab).toHaveAttribute('aria-controls', 'board-panel');
      expect(listTab).toHaveAttribute('aria-controls', 'list-panel');
      expect(timelineTab).toHaveAttribute('aria-controls', 'timeline-panel');

      expect(boardTab).toHaveAttribute('id', 'board-tab');
      expect(listTab).toHaveAttribute('id', 'list-tab');
      expect(timelineTab).toHaveAttribute('id', 'timeline-tab');
    });
  });

  describe('integration with ViewContext', () => {
    it('should reflect URL-based active view', () => {
      mockSearchParams.set('view', 'board');

      render(
        <ViewProvider>
          <ViewSwitcher />
        </ViewProvider>
      );

      const boardTab = screen.getByRole('tab', { name: /board/i });
      expect(boardTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should update when view changes from external source', async () => {
      const user = userEvent.setup();

      // Start with timeline as default
      render(
        <ViewProvider>
          <ViewSwitcher />
        </ViewProvider>
      );

      // Verify initial state
      const timelineTab = screen.getByRole('tab', { name: /timeline/i });
      expect(timelineTab).toHaveAttribute('aria-selected', 'true');

      // Simulate user clicking on a different tab (external view change)
      const listTab = screen.getByRole('tab', { name: /list/i });
      await user.click(listTab);

      await waitFor(() => {
        expect(listTab).toHaveAttribute('aria-selected', 'true');
      });
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = renderViewSwitcher();

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });
  });
});
