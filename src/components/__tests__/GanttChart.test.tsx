import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GanttChart } from '../GanttChart';
import type { Bead, Dependency } from '@/lib/types';

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

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
  const mockOnTeamChange = vi.fn();
  const mockTeams = [
    { id: 'engineering', name: 'Engineering' },
    { id: 'design', name: 'Design' },
  ];

  // Default props for rendering GanttChart
  const defaultProps = {
    onUpdate: mockOnUpdate,
    teams: mockTeams,
    selectedTeam: null,
    onTeamChange: mockOnTeamChange,
  };

  // Note: bead-1 uses [Q1] prefix to establish hierarchy level for parent-child tests
  // bead-2 uses [JAN] which is lower level, so bead-1 can be its parent
  const mockBeads: Bead[] = [
    {
      id: 'bead-1',
      title: '[Q1] Epic Task',
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
      title: '[JAN] Feature Task',
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
      title: '[FEB] Bug Fix',
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
    mockOnTeamChange.mockClear();
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
          {...defaultProps}
        />
      );
      expect(container.querySelector('.gantt-wrapper')).toBeInTheDocument();
    });

    it('renders all tasks in the task list', () => {
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          {...defaultProps}
        />
      );

      // Check that we have 3 gantt-info-row elements (one for each task)
      const rows = container.querySelectorAll('.gantt-info-row');
      expect(rows.length).toBe(3);

      // Check for task titles using text content
      const titles = Array.from(rows).map((row) => row.textContent);
      expect(titles.some((t) => t?.includes('[Q1] Epic Task'))).toBe(true);
      expect(titles.some((t) => t?.includes('[JAN] Feature Task'))).toBe(true);
      expect(titles.some((t) => t?.includes('[FEB] Bug Fix'))).toBe(true);
    });

    it('renders task bars with correct issue types', () => {
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          {...defaultProps}
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
          {...defaultProps}
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
          {...defaultProps}
        />
      );

      // The new UI uses FilterDropdown buttons instead of native select
      const statusButton = screen.getByRole('button', { name: /Status/i });
      expect(statusButton).toBeInTheDocument();
    });

    it('filters tasks by search query', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          {...defaultProps}
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
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          {...defaultProps}
        />
      );

      // Open the status filter dropdown
      const statusButton = screen.getByRole('button', { name: /Status/i });
      await user.click(statusButton);

      // Click on Closed option
      const closedOption = screen.getByRole('checkbox', { name: /Select Closed/i });
      await user.click(closedOption);

      // Only Bug Fix (closed status) should be visible
      await waitFor(() => {
        const rows = container.querySelectorAll('.gantt-info-row');
        expect(rows.length).toBe(1);
        expect(rows[0].textContent).toContain('Bug Fix');
      });
    });

    it('combines multiple filters', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          {...defaultProps}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search tasks...');
      await user.type(searchInput, 'Task');

      // Open status filter and select in_progress
      const statusButton = screen.getByRole('button', { name: /Status/i });
      await user.click(statusButton);

      const inProgressOption = screen.getByRole('checkbox', { name: /Select In Progress/i });
      await user.click(inProgressOption);

      // Only Epic Task matches both filters (contains "Task" and has status "in_progress")
      await waitFor(() => {
        const rows = container.querySelectorAll('.gantt-info-row');
        expect(rows.length).toBe(1);
        expect(rows[0].textContent).toContain('Epic Task');
      });
    });

    it('shows clear filters button when filters are active', async () => {
      const user = userEvent.setup();
      render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          {...defaultProps}
        />
      );

      expect(screen.queryByRole('button', { name: /Clear All/i })).not.toBeInTheDocument();

      // Open status filter and select an option
      const statusButton = screen.getByRole('button', { name: /Status/i });
      await user.click(statusButton);

      // The checkbox has aria-label "Select Open"
      const openOption = screen.getByRole('checkbox', { name: /Select Open/i });
      await user.click(openOption);

      expect(screen.getByRole('button', { name: /Clear All/i })).toBeInTheDocument();
    });

    it('clears all filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          {...defaultProps}
        />
      );

      // Apply a status filter (search alone doesn't trigger Clear All)
      const statusButton = screen.getByRole('button', { name: /Status/i });
      await user.click(statusButton);

      const closedOption = screen.getByRole('checkbox', { name: /Select Closed/i });
      await user.click(closedOption);

      // Wait for the filter to apply and show Clear All button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Clear All/i })).toBeInTheDocument();
      });

      const clearButton = screen.getByRole('button', { name: /Clear All/i });
      await user.click(clearButton);

      // All 3 tasks should be visible again
      await waitFor(() => {
        const rows = container.querySelectorAll('.gantt-info-row');
        expect(rows.length).toBe(3);
      });
    });
  });

  describe('Zoom Controls (ceo-cmi)', () => {
    it('renders zoom slider', () => {
      render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          {...defaultProps}
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
          {...defaultProps}
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
          {...defaultProps}
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
          {...defaultProps}
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
          {...defaultProps}
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
          {...defaultProps}
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
          {...defaultProps}
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
          {...defaultProps}
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
          {...defaultProps}
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
          {...defaultProps}
        />
      );

      // Initially has dependency arrows
      let paths = container.querySelectorAll('.gantt-dep-line');
      expect(paths.length).toBeGreaterThan(0);

      // Filter to only show Bug Fix (which has no dependencies) using the new UI
      const statusButton = screen.getByRole('button', { name: /Status/i });
      await user.click(statusButton);

      const closedOption = screen.getByRole('checkbox', { name: /Select Closed/i });
      await user.click(closedOption);

      // No dependency arrows should be rendered
      paths = container.querySelectorAll('.gantt-dep-line');
      expect(paths.length).toBe(0);
    });
  });

  describe('Collapse State Persistence (ceo-707)', () => {
    // Child task has no prefix (level 0), making it lower than bead-1's [Q1] (level 40)
    // This allows the hierarchy-based parent detection to work correctly
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
          {...defaultProps}
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
          {...defaultProps}
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
            {...defaultProps}
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
          {...defaultProps}
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
          {...defaultProps}
        />
      );

      expect(screen.getByLabelText('Search tasks')).toBeInTheDocument();
      // The new FilterBar uses buttons with accessible labels
      expect(screen.getByRole('button', { name: /Status/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation for task rows', () => {
      render(
        <GanttChart
          beads={mockBeads}
          dependencies={mockDependencies}
          {...defaultProps}
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
          {...defaultProps}
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
          {...defaultProps}
        />
      );

      const svg = container.querySelector('.gantt-deps-svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty beads array', () => {
      render(
        <GanttChart beads={[]} dependencies={[]} {...defaultProps} />
      );

      expect(screen.queryByRole('row')).not.toBeInTheDocument();
    });

    it('handles empty dependencies array', () => {
      const { container } = render(
        <GanttChart
          beads={mockBeads}
          dependencies={[]}
          {...defaultProps}
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
            {...defaultProps}
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
          {...defaultProps}
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
          {...defaultProps}
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
          {...defaultProps}
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

  describe('Hierarchy Sorting (eng-ew2)', () => {
    describe('OKR Hierarchy Ordering', () => {
      it('renders annual goals before quarterly goals', () => {
        const hierarchyBeads: Bead[] = [
          {
            id: 'quarterly-1',
            title: '[Q1] Q1 Goals',
            description: 'Q1 quarterly goals',
            status: 'open',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 28800,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'annual-1',
            title: '[1YR] Annual Plan',
            description: 'Annual plan',
            status: 'in_progress',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 115200,
            created_at: '2025-01-02T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
        ];

        const { container } = render(
          <GanttChart
            beads={hierarchyBeads}
            dependencies={[]}
            {...defaultProps}
          />
        );

        const rows = container.querySelectorAll('.gantt-info-row');
        expect(rows.length).toBe(2);

        // Annual [1YR] should appear before Quarterly [Q1]
        expect(rows[0].textContent).toContain('Annual Plan');
        expect(rows[1].textContent).toContain('Q1 Goals');
      });

      it('renders quarterly goals before monthly tasks', () => {
        const hierarchyBeads: Bead[] = [
          {
            id: 'monthly-1',
            title: '[JAN] January Sprint',
            description: 'January work',
            status: 'open',
            priority: 0,
            issue_type: 'feature',
            assignee: 'user1',
            estimated_minutes: 9600,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'quarterly-1',
            title: '[Q1] Q1 Goals',
            description: 'Q1 quarterly goals',
            status: 'in_progress',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 28800,
            created_at: '2025-01-02T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
        ];

        const { container } = render(
          <GanttChart
            beads={hierarchyBeads}
            dependencies={[]}
            {...defaultProps}
          />
        );

        const rows = container.querySelectorAll('.gantt-info-row');
        expect(rows.length).toBe(2);

        // Quarterly [Q1] should appear before Monthly [JAN]
        expect(rows[0].textContent).toContain('Q1 Goals');
        expect(rows[1].textContent).toContain('January Sprint');
      });

      it('renders complete hierarchy in correct order', () => {
        const hierarchyBeads: Bead[] = [
          {
            id: 'task-1',
            title: 'No Prefix Task',
            description: 'Regular task',
            status: 'open',
            priority: 0,
            issue_type: 'task',
            assignee: 'user1',
            estimated_minutes: 480,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'weekly-1',
            title: '[W1] Week 1 Tasks',
            description: 'Week 1',
            status: 'open',
            priority: 0,
            issue_type: 'task',
            assignee: 'user1',
            estimated_minutes: 2400,
            created_at: '2025-01-02T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'monthly-1',
            title: '[JAN] January Sprint',
            description: 'January work',
            status: 'open',
            priority: 0,
            issue_type: 'feature',
            assignee: 'user1',
            estimated_minutes: 9600,
            created_at: '2025-01-03T00:00:00Z',
            updated_at: '2025-01-03T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'quarterly-1',
            title: '[Q1] Q1 Goals',
            description: 'Q1 quarterly goals',
            status: 'in_progress',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 28800,
            created_at: '2025-01-04T00:00:00Z',
            updated_at: '2025-01-04T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'annual-1',
            title: '[1YR] Annual Plan',
            description: 'Annual plan',
            status: 'in_progress',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 115200,
            created_at: '2025-01-05T00:00:00Z',
            updated_at: '2025-01-05T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
        ];

        const { container } = render(
          <GanttChart
            beads={hierarchyBeads}
            dependencies={[]}
            {...defaultProps}
          />
        );

        const rows = container.querySelectorAll('.gantt-info-row');
        expect(rows.length).toBe(5);

        // Expected order: 1YR > Q1 > JAN > W1 > no prefix
        expect(rows[0].textContent).toContain('Annual Plan');
        expect(rows[1].textContent).toContain('Q1 Goals');
        expect(rows[2].textContent).toContain('January Sprint');
        expect(rows[3].textContent).toContain('Week 1 Tasks');
        expect(rows[4].textContent).toContain('No Prefix Task');
      });
    });

    describe('Quarter Ordering', () => {
      it('sorts quarters in Q1, Q2, Q3, Q4 order regardless of creation date', () => {
        const quarterBeads: Bead[] = [
          {
            id: 'q4',
            title: '[Q4] Q4 Goals',
            description: 'Q4 goals',
            status: 'open',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 28800,
            created_at: '2024-10-01T00:00:00Z',
            updated_at: '2024-10-01T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'q2',
            title: '[Q2] Q2 Goals',
            description: 'Q2 goals',
            status: 'open',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 28800,
            created_at: '2024-11-01T00:00:00Z',
            updated_at: '2024-11-01T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'q1',
            title: '[Q1] Q1 Goals',
            description: 'Q1 goals',
            status: 'open',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 28800,
            created_at: '2024-12-01T00:00:00Z',
            updated_at: '2024-12-01T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'q3',
            title: '[Q3] Q3 Goals',
            description: 'Q3 goals',
            status: 'open',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 28800,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
        ];

        const { container } = render(
          <GanttChart
            beads={quarterBeads}
            dependencies={[]}
            {...defaultProps}
          />
        );

        const rows = container.querySelectorAll('.gantt-info-row');
        expect(rows.length).toBe(4);

        // Should be in Q1, Q2, Q3, Q4 order, NOT by creation date
        expect(rows[0].textContent).toContain('Q1 Goals');
        expect(rows[1].textContent).toContain('Q2 Goals');
        expect(rows[2].textContent).toContain('Q3 Goals');
        expect(rows[3].textContent).toContain('Q4 Goals');
      });

      it('sorts half-year periods before quarters', () => {
        const periodBeads: Bead[] = [
          {
            id: 'q3',
            title: '[Q3] Q3 Goals',
            description: 'Q3 goals',
            status: 'open',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 28800,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'h2',
            title: '[H2] H2 Plan',
            description: 'Second half plan',
            status: 'open',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 57600,
            created_at: '2025-01-02T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'q1',
            title: '[Q1] Q1 Goals',
            description: 'Q1 goals',
            status: 'open',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 28800,
            created_at: '2025-01-03T00:00:00Z',
            updated_at: '2025-01-03T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'h1',
            title: '[H1] H1 Plan',
            description: 'First half plan',
            status: 'open',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 57600,
            created_at: '2025-01-04T00:00:00Z',
            updated_at: '2025-01-04T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
        ];

        const { container } = render(
          <GanttChart
            beads={periodBeads}
            dependencies={[]}
            {...defaultProps}
          />
        );

        const rows = container.querySelectorAll('.gantt-info-row');
        expect(rows.length).toBe(4);

        // Half-year periods should come before quarters, in H1, H2 order
        expect(rows[0].textContent).toContain('H1 Plan');
        expect(rows[1].textContent).toContain('H2 Plan');
        expect(rows[2].textContent).toContain('Q1 Goals');
        expect(rows[3].textContent).toContain('Q3 Goals');
      });
    });

    describe('Parent-Child Rendering', () => {
      it('renders children indented under parent', () => {
        const parentChildBeads: Bead[] = [
          {
            id: 'parent',
            title: '[Q1] Parent Epic',
            description: 'Parent',
            status: 'in_progress',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 28800,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'child',
            title: '[JAN] Child Feature',
            description: 'Child',
            status: 'open',
            priority: 1,
            issue_type: 'feature',
            assignee: 'user2',
            estimated_minutes: 2400,
            created_at: '2025-01-02T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
        ];

        const parentChildDeps: Dependency[] = [
          {
            issue_id: 'parent',
            depends_on_id: 'child',
            type: 'blocks',
          },
        ];

        const { container } = render(
          <GanttChart
            beads={parentChildBeads}
            dependencies={parentChildDeps}
            {...defaultProps}
          />
        );

        const rows = container.querySelectorAll('.gantt-info-row');
        expect(rows.length).toBe(2);

        // Parent should come first
        expect(rows[0].textContent).toContain('Parent Epic');
        expect(rows[1].textContent).toContain('Child Feature');

        // Child should have indentation (depth 1)
        const childRow = rows[1];
        const indent = childRow.querySelector('.gantt-row-indent') as HTMLElement;
        expect(indent).toBeInTheDocument();
        expect(indent.style.width).not.toBe('0px');
      });

      it('sorts siblings at same level by hierarchy rules', () => {
        const siblingsBeads: Bead[] = [
          {
            id: 'parent',
            title: '[Q1] Parent Epic',
            description: 'Parent',
            status: 'in_progress',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 28800,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'child-feb',
            title: '[FEB] February Feature',
            description: 'Feb feature',
            status: 'open',
            priority: 1,
            issue_type: 'feature',
            assignee: 'user2',
            estimated_minutes: 2400,
            created_at: '2025-01-02T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'child-jan',
            title: '[JAN] January Feature',
            description: 'Jan feature',
            status: 'open',
            priority: 1,
            issue_type: 'feature',
            assignee: 'user2',
            estimated_minutes: 2400,
            created_at: '2025-01-03T00:00:00Z',
            updated_at: '2025-01-03T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
        ];

        const siblingDeps: Dependency[] = [
          {
            issue_id: 'parent',
            depends_on_id: 'child-feb',
            type: 'blocks',
          },
          {
            issue_id: 'parent',
            depends_on_id: 'child-jan',
            type: 'blocks',
          },
        ];

        const { container } = render(
          <GanttChart
            beads={siblingsBeads}
            dependencies={siblingDeps}
            {...defaultProps}
          />
        );

        const rows = container.querySelectorAll('.gantt-info-row');
        expect(rows.length).toBe(3);

        // Parent first, then children sorted by month (JAN before FEB)
        expect(rows[0].textContent).toContain('Parent Epic');
        expect(rows[1].textContent).toContain('January Feature');
        expect(rows[2].textContent).toContain('February Feature');
      });

      it('handles multiple depth levels correctly', () => {
        const multiLevelBeads: Bead[] = [
          {
            id: 'annual',
            title: '[1YR] Annual Plan',
            description: 'Annual',
            status: 'in_progress',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 115200,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'quarter',
            title: '[Q1] Q1 Goals',
            description: 'Quarterly',
            status: 'in_progress',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 28800,
            created_at: '2025-01-02T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'monthly',
            title: '[JAN] January Sprint',
            description: 'Monthly',
            status: 'open',
            priority: 1,
            issue_type: 'feature',
            assignee: 'user2',
            estimated_minutes: 9600,
            created_at: '2025-01-03T00:00:00Z',
            updated_at: '2025-01-03T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'task',
            title: 'Specific Task',
            description: 'Task',
            status: 'open',
            priority: 2,
            issue_type: 'task',
            assignee: 'user3',
            estimated_minutes: 480,
            created_at: '2025-01-04T00:00:00Z',
            updated_at: '2025-01-04T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
        ];

        const multiLevelDeps: Dependency[] = [
          {
            issue_id: 'annual',
            depends_on_id: 'quarter',
            type: 'blocks',
          },
          {
            issue_id: 'quarter',
            depends_on_id: 'monthly',
            type: 'blocks',
          },
          {
            issue_id: 'monthly',
            depends_on_id: 'task',
            type: 'blocks',
          },
        ];

        const { container } = render(
          <GanttChart
            beads={multiLevelBeads}
            dependencies={multiLevelDeps}
            {...defaultProps}
          />
        );

        const rows = container.querySelectorAll('.gantt-info-row');
        expect(rows.length).toBe(4);

        // Verify correct order
        expect(rows[0].textContent).toContain('Annual Plan');
        expect(rows[1].textContent).toContain('Q1 Goals');
        expect(rows[2].textContent).toContain('January Sprint');
        expect(rows[3].textContent).toContain('Specific Task');

        // Verify increasing indentation
        const indents = Array.from(rows).map((row) => {
          const indent = row.querySelector('.gantt-row-indent') as HTMLElement;
          return indent ? parseInt(indent.style.width) || 0 : 0;
        });

        expect(indents[0]).toBe(0); // Annual (depth 0)
        expect(indents[1]).toBeGreaterThan(0); // Quarter (depth 1)
        expect(indents[2]).toBeGreaterThan(indents[1]); // Monthly (depth 2)
        expect(indents[3]).toBeGreaterThan(indents[2]); // Task (depth 3)
      });
    });

    describe('Mixed Hierarchy', () => {
      it('handles mix of epics, features, and tasks at different levels', () => {
        const mixedBeads: Bead[] = [
          {
            id: 'epic-annual',
            title: '[1YR] Annual Epic',
            description: 'Annual epic',
            status: 'in_progress',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 115200,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'task-standalone',
            title: 'Standalone Task',
            description: 'No parent task',
            status: 'open',
            priority: 1,
            issue_type: 'task',
            assignee: 'user2',
            estimated_minutes: 480,
            created_at: '2025-01-02T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'design',
          },
          {
            id: 'feature-q1',
            title: '[Q1] Q1 Feature',
            description: 'Q1 feature',
            status: 'in_progress',
            priority: 0,
            issue_type: 'feature',
            assignee: 'user1',
            estimated_minutes: 28800,
            created_at: '2025-01-03T00:00:00Z',
            updated_at: '2025-01-03T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'bug-jan',
            title: '[JAN] Critical Bug',
            description: 'Bug fix',
            status: 'open',
            priority: 2,
            issue_type: 'bug',
            assignee: 'user3',
            estimated_minutes: 240,
            created_at: '2025-01-04T00:00:00Z',
            updated_at: '2025-01-04T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
        ];

        const { container } = render(
          <GanttChart
            beads={mixedBeads}
            dependencies={[]}
            {...defaultProps}
          />
        );

        const rows = container.querySelectorAll('.gantt-info-row');
        expect(rows.length).toBe(4);

        // Expected order by hierarchy: [1YR] > [Q1] > [JAN] > no prefix
        // Issue type should not affect hierarchy ordering
        expect(rows[0].textContent).toContain('Annual Epic');
        expect(rows[1].textContent).toContain('Q1 Feature');
        expect(rows[2].textContent).toContain('Critical Bug');
        expect(rows[3].textContent).toContain('Standalone Task');
      });

      it('maintains hierarchy order across different teams', () => {
        const multiTeamBeads: Bead[] = [
          {
            id: 'design-jan',
            title: '[JAN] Design Sprint',
            description: 'Design work',
            status: 'open',
            priority: 0,
            issue_type: 'feature',
            assignee: 'designer1',
            estimated_minutes: 9600,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'design',
          },
          {
            id: 'eng-q1',
            title: '[Q1] Engineering Goals',
            description: 'Engineering quarterly goals',
            status: 'in_progress',
            priority: 0,
            issue_type: 'epic',
            assignee: 'eng1',
            estimated_minutes: 28800,
            created_at: '2025-01-02T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'pm-annual',
            title: '[1YR] Product Strategy',
            description: 'Annual product strategy',
            status: 'in_progress',
            priority: 0,
            issue_type: 'epic',
            assignee: 'pm1',
            estimated_minutes: 115200,
            created_at: '2025-01-03T00:00:00Z',
            updated_at: '2025-01-03T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'product',
          },
        ];

        const { container } = render(
          <GanttChart
            beads={multiTeamBeads}
            dependencies={[]}
            {...defaultProps}
          />
        );

        const rows = container.querySelectorAll('.gantt-info-row');
        expect(rows.length).toBe(3);

        // Hierarchy should be maintained regardless of team
        expect(rows[0].textContent).toContain('Product Strategy');
        expect(rows[1].textContent).toContain('Engineering Goals');
        expect(rows[2].textContent).toContain('Design Sprint');
      });

      it('sorts multi-year plans by year count (larger first)', () => {
        const multiYearBeads: Bead[] = [
          {
            id: '1yr',
            title: '[1YR] One Year Plan',
            description: '1 year',
            status: 'in_progress',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 115200,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: '3yr',
            title: '[3YR] Three Year Vision',
            description: '3 years',
            status: 'in_progress',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 345600,
            created_at: '2025-01-02T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: '5yr',
            title: '[5YR] Five Year Strategy',
            description: '5 years',
            status: 'in_progress',
            priority: 0,
            issue_type: 'epic',
            assignee: 'user1',
            estimated_minutes: 576000,
            created_at: '2025-01-03T00:00:00Z',
            updated_at: '2025-01-03T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
        ];

        const { container } = render(
          <GanttChart
            beads={multiYearBeads}
            dependencies={[]}
            {...defaultProps}
          />
        );

        const rows = container.querySelectorAll('.gantt-info-row');
        expect(rows.length).toBe(3);

        // Larger time spans should come first: 5YR > 3YR > 1YR
        expect(rows[0].textContent).toContain('Five Year Strategy');
        expect(rows[1].textContent).toContain('Three Year Vision');
        expect(rows[2].textContent).toContain('One Year Plan');
      });

      it('sorts months in chronological order (JAN through DEC)', () => {
        const monthlyBeads: Bead[] = [
          {
            id: 'dec',
            title: '[DEC] December Tasks',
            description: 'December',
            status: 'open',
            priority: 0,
            issue_type: 'feature',
            assignee: 'user1',
            estimated_minutes: 9600,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'mar',
            title: '[MAR] March Tasks',
            description: 'March',
            status: 'open',
            priority: 0,
            issue_type: 'feature',
            assignee: 'user1',
            estimated_minutes: 9600,
            created_at: '2025-01-02T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'jan',
            title: '[JAN] January Tasks',
            description: 'January',
            status: 'open',
            priority: 0,
            issue_type: 'feature',
            assignee: 'user1',
            estimated_minutes: 9600,
            created_at: '2025-01-03T00:00:00Z',
            updated_at: '2025-01-03T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
          {
            id: 'jun',
            title: '[JUN] June Tasks',
            description: 'June',
            status: 'open',
            priority: 0,
            issue_type: 'feature',
            assignee: 'user1',
            estimated_minutes: 9600,
            created_at: '2025-01-04T00:00:00Z',
            updated_at: '2025-01-04T00:00:00Z',
            due_at: null,
            defer_until: null,
            team: 'engineering',
          },
        ];

        const { container } = render(
          <GanttChart
            beads={monthlyBeads}
            dependencies={[]}
            {...defaultProps}
          />
        );

        const rows = container.querySelectorAll('.gantt-info-row');
        expect(rows.length).toBe(4);

        // Should be in chronological order: JAN, MAR, JUN, DEC
        expect(rows[0].textContent).toContain('January Tasks');
        expect(rows[1].textContent).toContain('March Tasks');
        expect(rows[2].textContent).toContain('June Tasks');
        expect(rows[3].textContent).toContain('December Tasks');
      });
    });
  });
});
