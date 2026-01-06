import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GanttChart } from '../GanttChart';
import type { Bead, Dependency } from '@/lib/types';

// Mock date-fns to have consistent dates in tests
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    isToday: vi.fn(() => false),
  };
});

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

describe('GanttChart Component', () => {
  const mockOnUpdate = vi.fn();

  const mockBeads: Bead[] = [
    {
      id: 'bead-1',
      title: 'Epic Task',
      description: 'Test epic',
      status: 'in_progress',
      priority: 0,
      issue_type: 'epic',
      assignee: 'user1',
      estimated_minutes: 4800,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      due_at: null,
      defer_until: null,
      team: 'engineering',
    },
    {
      id: 'bead-2',
      title: 'Feature Task',
      description: 'Test feature',
      status: 'open',
      priority: 1,
      issue_type: 'feature',
      assignee: 'user2',
      estimated_minutes: 2400,
      created_at: '2025-01-16T00:00:00Z',
      updated_at: '2025-01-16T00:00:00Z',
      due_at: null,
      defer_until: null,
      team: 'design',
    },
    {
      id: 'bead-3',
      title: 'Bug Fix',
      description: 'Test bug',
      status: 'closed',
      priority: 0,
      issue_type: 'bug',
      assignee: 'user1',
      estimated_minutes: 480,
      created_at: '2025-02-01T00:00:00Z',
      updated_at: '2025-02-01T00:00:00Z',
      due_at: null,
      defer_until: null,
      team: 'engineering',
    },
  ];

  const mockDependencies: Dependency[] = [
    {
      issue_id: 'bead-1',
      depends_on_id: 'bead-2',
      type: 'blocks',
    },
  ];

  beforeEach(() => {
    localStorageMock.clear();
    mockOnUpdate.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );
      expect(container.querySelector('.gantt-wrapper')).toBeInTheDocument();
    });

    it('renders all tasks in the task list', () => {
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      // Check that we have 3 gantt-info-row elements (one for each task)
      const rows = container.querySelectorAll('.gantt-info-row');
      expect(rows.length).toBe(3);

      // Check for task titles using text content
      const titles = Array.from(rows).map((row) => row.textContent);
      expect(titles.some((t) => t?.includes('Epic Task'))).toBe(true);
      expect(titles.some((t) => t?.includes('Feature Task'))).toBe(true);
      expect(titles.some((t) => t?.includes('Bug Fix'))).toBe(true);
    });

    it('renders task bars with correct issue types', () => {
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const epicBar = container.querySelector('.gantt-bar.epic');
      const featureBar = container.querySelector('.gantt-bar.feature');
      const bugBar = container.querySelector('.gantt-bar.bug');

      expect(epicBar).toBeInTheDocument();
      expect(featureBar).toBeInTheDocument();
      expect(bugBar).toBeInTheDocument();
    });
  });

  describe('Search and Filter (ceo-b2s)', () => {
    it('renders search input', () => {
      render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search tasks...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('aria-label', 'Search tasks');
    });

    it('renders status filter dropdown', () => {
      render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const statusFilter = screen.getByLabelText('Filter by status');
      expect(statusFilter).toBeInTheDocument();
      expect(within(statusFilter).getByText('All Statuses')).toBeInTheDocument();
    });

    it('renders team filter dropdown', () => {
      render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const teamFilter = screen.getByLabelText('Filter by team');
      expect(teamFilter).toBeInTheDocument();
      expect(within(teamFilter).getByText('All Teams')).toBeInTheDocument();
    });

    it('filters tasks by search query', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search tasks...');
      await user.type(searchInput, 'Epic');

      // Should have only 1 row after filtering
      const rows = container.querySelectorAll('.gantt-info-row');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Epic Task');
    });

    it('filters tasks by status', async () => {
      const user = userEvent.setup();
      render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const statusFilter = screen.getByLabelText('Filter by status');
      await user.selectOptions(statusFilter, 'closed');

      // Only Bug Fix (closed status) should be visible
      expect(screen.getByText(/Bug Fix/)).toBeInTheDocument();
      expect(screen.queryByText(/Epic Task/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Feature Task/)).not.toBeInTheDocument();
    });

    it('filters tasks by team', async () => {
      const user = userEvent.setup();
      render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const teamFilter = screen.getByLabelText('Filter by team');
      await user.selectOptions(teamFilter, 'design');

      // Only Feature Task (design team) should be visible
      expect(screen.getAllByText(/Feature Task/).length).toBeGreaterThan(0);
      expect(screen.queryByText(/Epic Task/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Bug Fix/)).not.toBeInTheDocument();
    });

    it('combines multiple filters', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search tasks...');
      const teamFilter = screen.getByLabelText('Filter by team');

      await user.type(searchInput, 'Task');
      await user.selectOptions(teamFilter, 'engineering');

      // Should have only 1 row (Epic Task matches both filters)
      const rows = container.querySelectorAll('.gantt-info-row');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Epic Task');
    });

    it('shows clear filters button when filters are active', async () => {
      const user = userEvent.setup();
      render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText('Search tasks...');
      await user.type(searchInput, 'Epic');

      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    it('clears all filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search tasks...');
      const statusFilter = screen.getByLabelText('Filter by status');

      await user.type(searchInput, 'Epic');
      await user.selectOptions(statusFilter, 'in_progress');

      const clearButton = screen.getByText('Clear Filters');
      await user.click(clearButton);

      expect(searchInput).toHaveValue('');
      expect(statusFilter).toHaveValue('all');

      // All 3 tasks should be visible again
      const rows = container.querySelectorAll('.gantt-info-row');
      expect(rows.length).toBe(3);
    });
  });

  describe('Zoom Controls (ceo-cmi)', () => {
    it('renders zoom slider', () => {
      render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveClass('zoom-slider');
    });

    it('displays current zoom level label', () => {
      render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      // Default zoom index is 3, which corresponds to 24px/day
      expect(screen.getByText('24px/day')).toBeInTheDocument();
    });

    it('updates zoom level when slider is moved', async () => {
      const user = userEvent.setup();
      render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const slider = screen.getByRole('slider');

      // Change to zoom level 0 (8px/day)
      fireEvent.change(slider, { target: { value: '0' } });

      await waitFor(() => {
        expect(screen.getByText('8px/day')).toBeInTheDocument();
      });
    });

    it('has proper aria labels for accessibility', () => {
      render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-label', 'Zoom level: 24px per day');
      expect(slider).toHaveAttribute('title', 'Zoom: 24px/day');
    });

    it('respects zoom level bounds', () => {
      render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('5'); // 6 zoom levels, 0-indexed
    });
  });

  describe('Dependency Arrows (ceo-mu1)', () => {
    it('renders SVG container for dependency arrows', () => {
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const svg = container.querySelector('.gantt-deps-svg');
      expect(svg).toBeInTheDocument();
      expect(svg?.tagName).toBe('svg');
    });

    it('renders dependency arrow paths', () => {
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const paths = container.querySelectorAll('.gantt-dep-line');
      expect(paths.length).toBe(mockDependencies.length);
    });

    it('includes arrowhead marker definition', () => {
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const marker = container.querySelector('#arrowhead');
      expect(marker).toBeInTheDocument();
      expect(marker?.tagName).toBe('marker');
    });

    it('applies correct styling to dependency lines', () => {
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const path = container.querySelector('.gantt-dep-line');
      expect(path).toHaveAttribute('marker-end', 'url(#arrowhead)');
    });

    it('hides arrows when tasks are filtered out', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      // Initially has dependency arrows
      let paths = container.querySelectorAll('.gantt-dep-line');
      expect(paths.length).toBeGreaterThan(0);

      // Filter to only show Bug Fix (which has no dependencies)
      const statusFilter = screen.getByLabelText('Filter by status');
      await user.selectOptions(statusFilter, 'closed');

      // No dependency arrows should be rendered
      paths = container.querySelectorAll('.gantt-dep-line');
      expect(paths.length).toBe(0);
    });
  });

  describe('Collapse State Persistence (ceo-707)', () => {
    it('saves collapsed state to localStorage', async () => {
      const user = userEvent.setup();
      const beadsWithChildren: Bead[] = [
        ...mockBeads,
        {
          id: 'bead-4',
          title: 'Child Task',
          description: 'Child of bead-1',
          status: 'open',
          priority: 2,
          issue_type: 'task',
          assignee: 'user3',
          estimated_minutes: 480,
          created_at: '2025-01-05T00:00:00Z',
          updated_at: '2025-01-05T00:00:00Z',
          due_at: null,
          defer_until: null,
          team: 'engineering',
        },
      ];

      const depsWithChildren: Dependency[] = [
        ...mockDependencies,
        {
          issue_id: 'bead-1',
          depends_on_id: 'bead-4',
          type: 'blocks',
        },
      ];

      render(
        <GanttChart
          beads={beadsWithChildren}
          dependencies={depsWithChildren}
          onUpdate={mockOnUpdate}
        />
      );

      // Find and click collapse button for bead-1
      const collapseButton = screen.getByLabelText('Collapse');
      await user.click(collapseButton);

      // Check localStorage
      const stored = localStorageMock.getItem('gantt-collapsed-tasks');
      expect(stored).toBeTruthy();
      const collapsed = JSON.parse(stored!);
      expect(collapsed).toContain('bead-1');
    });

    it('loads collapsed state from localStorage on mount', () => {
      const beadsWithChildren: Bead[] = [
        ...mockBeads,
        {
          id: 'bead-4',
          title: 'Child Task',
          description: 'Child of bead-1',
          status: 'open',
          priority: 2,
          issue_type: 'task',
          assignee: 'user3',
          estimated_minutes: 480,
          created_at: '2025-01-05T00:00:00Z',
          updated_at: '2025-01-05T00:00:00Z',
          due_at: null,
          defer_until: null,
          team: 'engineering',
        },
      ];

      const depsWithChildren: Dependency[] = [
        ...mockDependencies,
        {
          issue_id: 'bead-1',
          depends_on_id: 'bead-4',
          type: 'blocks',
        },
      ];

      // Pre-populate localStorage
      localStorageMock.setItem('gantt-collapsed-tasks', JSON.stringify(['bead-1']));

      render(
        <GanttChart
          beads={beadsWithChildren}
          dependencies={depsWithChildren}
          onUpdate={mockOnUpdate}
        />
      );

      // Child task should be hidden
      expect(screen.queryByText('Child Task')).not.toBeInTheDocument();

      // Expand button should be shown
      expect(screen.getByLabelText('Expand')).toBeInTheDocument();
    });

    it('handles localStorage errors gracefully', () => {
      // Mock localStorage.getItem to throw an error
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = vi.fn(() => {
        throw new Error('Storage error');
      });

      // Should not crash
      expect(() => {
        render(
          <GanttChart
            beads={mockBeads}
            dependencies={mockDependencies}
            onUpdate={mockOnUpdate}
          />
        );
      }).not.toThrow();

      // Restore original
      localStorageMock.getItem = originalGetItem;
    });

    it('toggles collapse state correctly', async () => {
      const user = userEvent.setup();
      const beadsWithChildren: Bead[] = [
        ...mockBeads,
        {
          id: 'bead-4',
          title: 'Child Task',
          description: 'Child of bead-1',
          status: 'open',
          priority: 2,
          issue_type: 'task',
          assignee: 'user3',
          estimated_minutes: 480,
          created_at: '2025-01-05T00:00:00Z',
          updated_at: '2025-01-05T00:00:00Z',
          due_at: null,
          defer_until: null,
          team: 'engineering',
        },
      ];

      const depsWithChildren: Dependency[] = [
        ...mockDependencies,
        {
          issue_id: 'bead-1',
          depends_on_id: 'bead-4',
          type: 'blocks',
        },
      ];

      render(
        <GanttChart
          beads={beadsWithChildren}
          dependencies={depsWithChildren}
          onUpdate={mockOnUpdate}
        />
      );

      // Initially child is visible
      expect(screen.getByText('Child Task')).toBeInTheDocument();

      // Collapse
      const collapseButton = screen.getByLabelText('Collapse');
      await user.click(collapseButton);

      // Child should be hidden
      expect(screen.queryByText('Child Task')).not.toBeInTheDocument();

      // Expand
      const expandButton = screen.getByLabelText('Expand');
      await user.click(expandButton);

      // Child should be visible again
      expect(screen.getByText('Child Task')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels on interactive elements', () => {
      render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByLabelText('Search tasks')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by team')).toBeInTheDocument();
    });

    it('supports keyboard navigation for task rows', () => {
      render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(0);
      rows.forEach((row) => {
        expect(row).toHaveAttribute('tabIndex', '0');
      });
    });

    it('has aria-live region for zoom level changes', () => {
      render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const zoomLabel = screen.getByText('24px/day');
      expect(zoomLabel).toHaveAttribute('aria-live', 'polite');
    });

    it('hides decorative SVG from screen readers', () => {
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const svg = container.querySelector('.gantt-deps-svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty beads array', () => {
      render(
        <GanttChart beads={[]} dependencies={[]} onUpdate={mockOnUpdate} />
      );

      expect(screen.queryByRole('row')).not.toBeInTheDocument();
    });

    it('handles empty dependencies array', () => {
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={[]}
          onUpdate={mockOnUpdate}
        />
      );

      const paths = container.querySelectorAll('.gantt-dep-line');
      expect(paths.length).toBe(0);
    });

    it('handles beads with missing dates', () => {
      const beadsWithoutDates: Bead[] = [
        {
          ...mockBeads[0],
          title: 'Task Without Date',
        },
      ];

      expect(() => {
        render(
          <GanttChart
            beads={beadsWithoutDates}
            dependencies={[]}
            onUpdate={mockOnUpdate}
          />
        );
      }).not.toThrow();
    });

    it('filters return no results gracefully', async () => {
      const user = userEvent.setup();
      render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search tasks...');
      await user.type(searchInput, 'NonExistentTask');

      expect(screen.queryByRole('row')).not.toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('maintains filter state while zooming', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      // Apply filter
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      await user.type(searchInput, 'Epic');

      // Change zoom
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '4' } });

      // Filter should still be active - only 1 row visible
      const rows = container.querySelectorAll('.gantt-info-row');
      expect(rows.length).toBe(1);
      expect(screen.getByText('32px/day')).toBeInTheDocument();
    });

    it('updates dependency arrows when zoom changes', async () => {
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const slider = screen.getByRole('slider');
      const initialPaths = container.querySelectorAll('.gantt-dep-line');
      const initialPath = initialPaths[0]?.getAttribute('d');

      // Change zoom
      fireEvent.change(slider, { target: { value: '5' } });

      await waitFor(() => {
        const newPaths = container.querySelectorAll('.gantt-dep-line');
        const newPath = newPaths[0]?.getAttribute('d');
        // Path should change because bar positions change with zoom
        expect(newPath).not.toBe(initialPath);
      });
    });
  });
});
