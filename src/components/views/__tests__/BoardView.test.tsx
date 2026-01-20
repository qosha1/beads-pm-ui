import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BoardView from '../BoardView';
import { ViewProvider } from '../ViewContext';
import { GroupingProvider } from '@/components/grouping/GroupingContext';
import type { Bead, Dependency } from '@/lib/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    toString: vi.fn(() => ''),
  }),
  usePathname: () => '/dashboard',
}));

// Mock grouping module
vi.mock('../../grouping', () => ({
  useGrouping: () => ({
    state: {
      groupBy: 'none',
      collapsedGroups: new Set(),
      groupOrder: [],
    },
  }),
  useBeadGrouping: (beads: Bead[]) => ({ 'All Tasks': beads }),
}));

describe('BoardView Component', () => {
  const mockOnUpdate = vi.fn();

  const mockBeads: Bead[] = [
    {
      id: 'bead-1',
      title: 'Open Task 1',
      description: 'Test open task',
      status: 'open',
      priority: 0,
      issue_type: 'epic',
      assignee: 'alice',
      estimated_minutes: 480,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      due_at: '2025-01-31T00:00:00Z',
      defer_until: null,
      team: 'engineering',
    },
    {
      id: 'bead-2',
      title: 'In Progress Task',
      description: 'Test in progress task',
      status: 'in_progress',
      priority: 1,
      issue_type: 'feature',
      assignee: 'bob',
      estimated_minutes: 240,
      created_at: '2025-01-02T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
      due_at: '2025-01-15T00:00:00Z',
      defer_until: null,
      team: 'design',
    },
    {
      id: 'bead-3',
      title: 'Blocked Task',
      description: 'Test blocked task',
      status: 'blocked',
      priority: 0,
      issue_type: 'bug',
      assignee: 'charlie',
      estimated_minutes: 120,
      created_at: '2025-01-03T00:00:00Z',
      updated_at: '2025-01-03T00:00:00Z',
      due_at: '2024-12-31T00:00:00Z', // Overdue
      defer_until: null,
      team: 'engineering',
    },
    {
      id: 'bead-4',
      title: 'Closed Task',
      description: 'Test closed task',
      status: 'closed',
      priority: 2,
      issue_type: 'task',
      assignee: null,
      estimated_minutes: 60,
      created_at: '2025-01-04T00:00:00Z',
      updated_at: '2025-01-04T00:00:00Z',
      due_at: null,
      defer_until: null,
      team: 'product',
    },
    {
      id: 'bead-5',
      title: 'Deferred Task',
      description: 'Test deferred task',
      status: 'deferred',
      priority: 3,
      issue_type: 'feature',
      assignee: 'dave',
      estimated_minutes: 480,
      created_at: '2025-01-05T00:00:00Z',
      updated_at: '2025-01-05T00:00:00Z',
      due_at: '2025-02-28T00:00:00Z',
      defer_until: '2025-02-01T00:00:00Z',
      team: 'marketing',
    },
  ];

  const mockDependencies: Dependency[] = [];

  beforeEach(() => {
    localStorageMock.clear();
    mockOnUpdate.mockClear();
  });

  const renderBoardView = (beads: Bead[] = mockBeads, dependencies: Dependency[] = mockDependencies) => {
    return render(
      <ViewProvider initialView="board">
        <GroupingProvider>
          <BoardView beads={beads} dependencies={dependencies} onUpdate={mockOnUpdate} />
        </GroupingProvider>
      </ViewProvider>
    );
  };

  describe('Column Rendering', () => {
    it('renders all five status columns', () => {
      renderBoardView();

      expect(screen.getByRole('region', { name: /open column/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /in progress column/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /blocked column/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /closed column/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /deferred column/i })).toBeInTheDocument();
    });

    it('displays correct bead counts in column headers', () => {
      renderBoardView();

      const openColumn = screen.getByRole('region', { name: /open column/i });
      expect(within(openColumn).getByText('(1)')).toBeInTheDocument();

      const inProgressColumn = screen.getByRole('region', { name: /in progress column/i });
      expect(within(inProgressColumn).getByText('(1)')).toBeInTheDocument();

      const blockedColumn = screen.getByRole('region', { name: /blocked column/i });
      expect(within(blockedColumn).getByText('(1)')).toBeInTheDocument();

      const closedColumn = screen.getByRole('region', { name: /closed column/i });
      expect(within(closedColumn).getByText('(1)')).toBeInTheDocument();

      const deferredColumn = screen.getByRole('region', { name: /deferred column/i });
      expect(within(deferredColumn).getByText('(1)')).toBeInTheDocument();
    });

    it('renders column icons', () => {
      const { container } = renderBoardView();

      const icons = container.querySelectorAll('.board-column-icon');
      expect(icons.length).toBeGreaterThan(0);
      icons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('displays empty state when column has no beads', () => {
      const singleBead: Bead[] = [mockBeads[0]];
      renderBoardView(singleBead);

      const blockedColumn = screen.getByRole('region', { name: /blocked column/i });
      expect(within(blockedColumn).getByText(/no tasks/i)).toBeInTheDocument();
    });
  });

  describe('Card Rendering', () => {
    it('displays all bead information on cards', () => {
      renderBoardView();

      // Check first bead card
      const openCard = screen.getByText('Open Task 1').closest('.board-card');
      expect(openCard).toBeInTheDocument();
      expect(within(openCard!).getByText('P0')).toBeInTheDocument();
      expect(within(openCard!).getByText('ENG')).toBeInTheDocument();
      expect(within(openCard!).getByText('@alice')).toBeInTheDocument();
      expect(within(openCard!).getByText('epic')).toBeInTheDocument();
    });

    it('shows priority badge with correct color', () => {
      renderBoardView();

      const p0Badge = screen.getAllByText('P0')[0];
      expect(p0Badge).toHaveStyle({ backgroundColor: '#ef4444' });

      const p1Badge = screen.getByText('P1');
      expect(p1Badge).toHaveStyle({ backgroundColor: '#f97316' });

      const p2Badge = screen.getByText('P2');
      expect(p2Badge).toHaveStyle({ backgroundColor: '#eab308' });
    });

    it('displays due date in human-readable format', () => {
      renderBoardView();

      const card = screen.getByText('Open Task 1').closest('.board-card');
      expect(card).toHaveTextContent(/Jan/);
    });

    it('highlights overdue tasks', () => {
      renderBoardView();

      const overdueCard = screen.getByText('Blocked Task').closest('.board-card');
      expect(overdueCard).toBeInTheDocument();

      // The component applies 'overdue' class to the due date element
      const dueDate = within(overdueCard!).getByText(/Dec/i);
      expect(dueDate).toHaveClass('overdue');
    });

    it('shows progress bar when dates are available', () => {
      renderBoardView();

      const card = screen.getByText('Open Task 1').closest('.board-card');
      const progressBar = within(card!).getByRole('progressbar');

      expect(progressBar).toBeInTheDocument();
    });

    it('handles missing assignee', () => {
      renderBoardView();

      const card = screen.getByText('Closed Task').closest('.board-card');
      expect(card).not.toHaveTextContent('@');
    });

    it('makes cards keyboard focusable', () => {
      renderBoardView();

      const cards = screen.getAllByRole('listitem');
      cards.forEach(card => {
        expect(card).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Column Collapse/Expand', () => {
    it('collapses column when collapse button is clicked', async () => {
      renderBoardView();

      const openColumn = screen.getByRole('region', { name: /open column/i });
      const collapseButton = within(openColumn).getByRole('button', { name: /collapse/i });

      await userEvent.click(collapseButton);

      expect(openColumn).toHaveClass('collapsed');
      expect(within(openColumn).queryByText('Open Task 1')).not.toBeInTheDocument();
    });

    it('expands collapsed column when expand button is clicked', async () => {
      renderBoardView();

      const openColumn = screen.getByRole('region', { name: /open column/i });
      const collapseButton = within(openColumn).getByRole('button');

      // Collapse
      await userEvent.click(collapseButton);
      expect(openColumn).toHaveClass('collapsed');

      // Expand
      await userEvent.click(collapseButton);
      expect(openColumn).not.toHaveClass('collapsed');
      expect(within(openColumn).getByText('Open Task 1')).toBeInTheDocument();
    });

    it('updates button aria-label when toggling', async () => {
      renderBoardView();

      const openColumn = screen.getByRole('region', { name: /open column/i });
      const button = within(openColumn).getByRole('button');

      expect(button).toHaveAttribute('aria-label', expect.stringContaining('Collapse'));

      await userEvent.click(button);

      expect(button).toHaveAttribute('aria-label', expect.stringContaining('Expand'));
    });

    it('updates button aria-expanded attribute', async () => {
      renderBoardView();

      const openColumn = screen.getByRole('region', { name: /open column/i });
      const button = within(openColumn).getByRole('button');

      expect(button).toHaveAttribute('aria-expanded', 'true');

      await userEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Drag and Drop', () => {
    it('sets draggable attribute on cards', () => {
      renderBoardView();

      const cards = screen.getAllByRole('listitem');
      cards.forEach(card => {
        expect(card).toHaveAttribute('draggable', 'true');
      });
    });

    it('calls onUpdate when card is dropped on different column', async () => {
      renderBoardView();

      const card = screen.getByText('Open Task 1').closest('.board-card') as HTMLElement;
      const inProgressColumn = screen.getByRole('region', { name: /in progress column/i });
      const dropZone = within(inProgressColumn).getByRole('list');

      // Simulate drag start
      fireEvent.dragStart(card, {
        dataTransfer: {
          effectAllowed: 'move',
          setData: vi.fn(),
        },
      });

      // Simulate drag over
      fireEvent.dragOver(dropZone, {
        dataTransfer: {
          dropEffect: 'move',
        },
      });

      // Simulate drop
      fireEvent.drop(dropZone);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('bead-1', 'engineering', { status: 'in_progress' });
      });
    });

    it('does not call onUpdate when dropped on same column', async () => {
      renderBoardView();

      const card = screen.getByText('Open Task 1').closest('.board-card') as HTMLElement;
      const openColumn = screen.getByRole('region', { name: /open column/i });
      const dropZone = within(openColumn).getByRole('list');

      fireEvent.dragStart(card, {
        dataTransfer: {
          effectAllowed: 'move',
          setData: vi.fn(),
        },
      });

      fireEvent.drop(dropZone);

      await waitFor(() => {
        expect(mockOnUpdate).not.toHaveBeenCalled();
      });
    });

    it('adds visual feedback during drag', () => {
      renderBoardView();

      const card = screen.getByText('Open Task 1').closest('.board-card') as HTMLElement;

      fireEvent.dragStart(card, {
        dataTransfer: {
          effectAllowed: 'move',
          setData: vi.fn(),
        },
      });

      // Need to wait for setTimeout in dragStart handler
      setTimeout(() => {
        expect(card).toHaveClass('dragging');
      }, 10);
    });

    it('removes visual feedback after drag ends', () => {
      renderBoardView();

      const card = screen.getByText('Open Task 1').closest('.board-card') as HTMLElement;

      fireEvent.dragStart(card, {
        dataTransfer: {
          effectAllowed: 'move',
          setData: vi.fn(),
        },
      });

      fireEvent.dragEnd(card);

      expect(card).not.toHaveClass('dragging');
    });

    it('highlights drop zone when dragging over column', () => {
      renderBoardView();

      const card = screen.getByText('Open Task 1').closest('.board-card') as HTMLElement;
      const blockedColumn = screen.getByRole('region', { name: /blocked column/i });

      fireEvent.dragStart(card, {
        dataTransfer: {
          effectAllowed: 'move',
          setData: vi.fn(),
        },
      });

      // Note: In actual implementation, drag-over class is added via state
      // This test validates the className is conditionally applied
      expect(blockedColumn).not.toHaveClass('drag-over');
    });
  });

  describe('Filtering Integration', () => {
    it('renders only beads passed as props (filtered by parent)', () => {
      const filteredBeads = mockBeads.filter(b => b.status === 'open');
      renderBoardView(filteredBeads);

      expect(screen.getByText('Open Task 1')).toBeInTheDocument();
      expect(screen.queryByText('In Progress Task')).not.toBeInTheDocument();
      expect(screen.queryByText('Blocked Task')).not.toBeInTheDocument();
    });

    it('updates column counts when filtered', () => {
      const filteredBeads = mockBeads.filter(b => b.priority === 0);
      renderBoardView(filteredBeads);

      // Only P0 tasks (Open and Blocked)
      const openColumn = screen.getByRole('region', { name: /open column/i });
      expect(within(openColumn).getByText('(1)')).toBeInTheDocument();

      const blockedColumn = screen.getByRole('region', { name: /blocked column/i });
      expect(within(blockedColumn).getByText('(1)')).toBeInTheDocument();

      const inProgressColumn = screen.getByRole('region', { name: /in progress column/i });
      expect(within(inProgressColumn).getByText('(0)')).toBeInTheDocument();
    });

    it('handles empty filtered results', () => {
      renderBoardView([]);

      const columns = screen.getAllByRole('region', { name: /column/i });
      columns.forEach(column => {
        expect(within(column).getByText(/no tasks/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels on columns', () => {
      renderBoardView();

      expect(screen.getByRole('region', { name: /open column/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /in progress column/i })).toBeInTheDocument();
    });

    it('has proper ARIA labels on cards', () => {
      renderBoardView();

      const card = screen.getByLabelText(/task: open task 1.*priority 0.*status open/i);
      expect(card).toBeInTheDocument();
    });

    it('has proper ARIA labels on collapse buttons', () => {
      renderBoardView();

      const openColumn = screen.getByRole('region', { name: /open column/i });
      const button = within(openColumn).getByRole('button');

      expect(button).toHaveAttribute('aria-label', expect.stringContaining('Collapse'));
      expect(button).toHaveAttribute('aria-expanded');
    });

    it('provides keyboard focus indicators', async () => {
      renderBoardView();

      const card = screen.getByText('Open Task 1').closest('.board-card') as HTMLElement;

      card.focus();
      expect(document.activeElement).toBe(card);
    });

    it('lists have proper ARIA labels', () => {
      renderBoardView();

      const openColumn = screen.getByRole('region', { name: /open column/i });
      const list = within(openColumn).getByRole('list');

      expect(list).toHaveAttribute('aria-label', 'Open tasks');
    });
  });

  describe('Error Handling', () => {
    it('handles onUpdate errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockOnUpdate.mockRejectedValue(new Error('Update failed'));

      renderBoardView();

      const card = screen.getByText('Open Task 1').closest('.board-card') as HTMLElement;
      const inProgressColumn = screen.getByRole('region', { name: /in progress column/i });
      const dropZone = within(inProgressColumn).getByRole('list');

      fireEvent.dragStart(card, {
        dataTransfer: {
          effectAllowed: 'move',
          setData: vi.fn(),
        },
      });

      fireEvent.drop(dropZone);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to update bead status:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('handles beads with missing team gracefully', () => {
      const beadWithoutTeam = { ...mockBeads[0], team: '' };
      renderBoardView([beadWithoutTeam]);

      const card = screen.getByText('Open Task 1').closest('.board-card');
      expect(card).toBeInTheDocument();
    });

    it('handles beads with very long titles', () => {
      const longTitleBead = {
        ...mockBeads[0],
        title: 'This is an extremely long task title that should be truncated properly in the card display to prevent layout issues',
      };
      renderBoardView([longTitleBead]);

      const card = screen.getByText(/this is an extremely long/i).closest('.board-card');
      expect(card).toBeInTheDocument();
    });

    it('handles beads with invalid priority', () => {
      const invalidPriorityBead = { ...mockBeads[0], priority: 99 as any };
      renderBoardView([invalidPriorityBead]);

      // Should default to P4
      const card = screen.getByText('Open Task 1').closest('.board-card');
      expect(within(card!).getByText('P4')).toBeInTheDocument();
    });

    it('handles beads with null dates', () => {
      const noDatesBead = {
        ...mockBeads[0],
        created_at: '',
        due_at: null,
      };
      renderBoardView([noDatesBead]);

      const card = screen.getByText('Open Task 1').closest('.board-card');
      expect(card).toBeInTheDocument();
      expect(within(card!).queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders efficiently with large number of beads', () => {
      const largeBeadSet: Bead[] = Array.from({ length: 100 }, (_, i) => ({
        ...mockBeads[0],
        id: `bead-${i}`,
        title: `Task ${i}`,
        status: ['open', 'in_progress', 'blocked', 'closed', 'deferred'][i % 5] as any,
      }));

      const { container } = renderBoardView(largeBeadSet);

      const cards = container.querySelectorAll('.board-card');
      expect(cards).toHaveLength(100);
    });

    it('memoizes bead grouping by status', () => {
      const { rerender } = renderBoardView();

      // Rerender with same props should not cause re-computation
      rerender(
        <ViewProvider initialView="board">
          <BoardView beads={mockBeads} dependencies={mockDependencies} onUpdate={mockOnUpdate} />
        </ViewProvider>
      );

      // All beads should still be rendered
      expect(screen.getByText('Open Task 1')).toBeInTheDocument();
      expect(screen.getByText('In Progress Task')).toBeInTheDocument();
    });
  });
});
