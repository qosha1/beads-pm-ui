import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import ListView from '../ListView';
import { ViewProvider } from '../ViewContext';
import FilterContext, { FilterContextValue, initialFilterState } from '@/components/filters/FilterContext';
import type { Bead, Dependency } from '@/lib/types';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock filter context
const mockFilterContextValue: FilterContextValue = {
  filters: initialFilterState,
  setSearch: vi.fn(),
  setStatus: vi.fn(),
  setPriority: vi.fn(),
  setIssueType: vi.fn(),
  setDueDate: vi.fn(),
  clearFilters: vi.fn(),
  clearFilter: vi.fn(),
  activeFilterCount: 0,
  applyFilters: (beads: Bead[]) => beads,
};

// Mock data for testing
const mockBeads: Bead[] = [
  {
    id: 'task-1',
    title: 'Task Alpha',
    description: 'First task',
    status: 'open',
    priority: 0,
    issue_type: 'task',
    assignee: 'alice',
    team: 'eng',
    estimated_minutes: 120,
    due_at: '2026-01-31T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
    defer_until: null,
  },
  {
    id: 'task-2',
    title: 'Bug Beta',
    description: 'Second task',
    status: 'in_progress',
    priority: 1,
    issue_type: 'bug',
    assignee: 'bob',
    team: 'eng',
    estimated_minutes: 60,
    due_at: '2026-02-15T00:00:00Z',
    created_at: '2026-01-05T00:00:00Z',
    updated_at: '2026-01-12T00:00:00Z',
    defer_until: null,
  },
  {
    id: 'task-3',
    title: 'Epic Gamma',
    description: 'Third task',
    status: 'closed',
    priority: 2,
    issue_type: 'epic',
    assignee: 'carol',
    team: 'pm',
    estimated_minutes: 480,
    due_at: '2026-03-01T00:00:00Z',
    created_at: '2026-01-08T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    defer_until: null,
  },
  {
    id: 'task-4',
    title: 'Feature Delta',
    description: 'Fourth task',
    status: 'blocked',
    priority: 3,
    issue_type: 'feature',
    assignee: null,
    team: 'gtm',
    estimated_minutes: null,
    due_at: null,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-18T00:00:00Z',
    defer_until: null,
  },
];

const mockDependencies: Dependency[] = [];
const mockOnUpdate = vi.fn();

describe('ListView Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <FilterContext.Provider value={mockFilterContextValue}>
      <ViewProvider initialView="list">
        {children}
      </ViewProvider>
    </FilterContext.Provider>
  );

  const renderListView = (beads: Bead[] = mockBeads) => {
    return render(
      <ListView
        beads={beads}
        dependencies={mockDependencies}
        selectedTeam={null}
        onTeamChange={vi.fn()}
        onUpdate={mockOnUpdate}
      />,
      { wrapper }
    );
  };

  describe('Placeholder Rendering', () => {
    it('renders without crashing', () => {
      renderListView();
      expect(screen.getByRole('region', { name: /list view/i })).toBeInTheDocument();
    });

    it('displays Coming Soon message', () => {
      renderListView();
      expect(screen.getByText('List View Coming Soon')).toBeInTheDocument();
    });

    it('displays placeholder description', () => {
      renderListView();
      expect(screen.getByText(/Sortable table with bulk actions/i)).toBeInTheDocument();
    });

    it('displays placeholder icon', () => {
      const { container } = renderListView();
      expect(container.querySelector('.placeholder-icon')).toBeInTheDocument();
    });
  });

  describe('Status Counts', () => {
    it('displays open count from beads', () => {
      renderListView();
      // One bead has status 'open'
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
      expect(screen.getByText('Open')).toBeInTheDocument();
    });

    it('displays in progress count from beads', () => {
      renderListView();
      // One bead has status 'in_progress'
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('displays closed count from beads', () => {
      renderListView();
      // One bead has status 'closed'
      expect(screen.getByText('Closed')).toBeInTheDocument();
    });

    it('shows 0 for empty status', () => {
      const beadsWithNoOpen = mockBeads.filter(b => b.status !== 'open');
      render(
        <ListView
          beads={beadsWithNoOpen}
          dependencies={mockDependencies}
          selectedTeam={null}
          onTeamChange={vi.fn()}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );
      // Should show 0 for open status
      const statValues = screen.getAllByText('0');
      expect(statValues.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('renders with empty beads array', () => {
      render(
        <ListView
          beads={[]}
          dependencies={[]}
          selectedTeam={null}
          onTeamChange={vi.fn()}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );
      expect(screen.getByRole('region', { name: /list view/i })).toBeInTheDocument();
    });

    it('shows zero counts when no beads', () => {
      render(
        <ListView
          beads={[]}
          dependencies={[]}
          selectedTeam={null}
          onTeamChange={vi.fn()}
          onUpdate={mockOnUpdate}
        />,
        { wrapper }
      );
      const zeroValues = screen.getAllByText('0');
      expect(zeroValues.length).toBe(3); // Open, In Progress, Closed
    });
  });

  describe('Accessibility', () => {
    it('has proper region role and label', () => {
      renderListView();
      const region = screen.getByRole('region', { name: /list view/i });
      expect(region).toBeInTheDocument();
    });

    it('has accessible heading', () => {
      renderListView();
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('List View Coming Soon');
    });
  });

  describe('Integration Note', () => {
    it('displays grouping system note', () => {
      renderListView();
      expect(screen.getByText(/Grouping system is ready/i)).toBeInTheDocument();
    });
  });
});
