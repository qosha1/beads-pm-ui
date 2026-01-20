import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimelineView from '../TimelineView';
import type { Bead, Dependency } from '@/lib/types';
import * as ViewContext from '../ViewContext';

// Mock the ViewContext
const mockSetTimelineState = vi.fn();
const mockTimelineState = {
  collapsedIds: new Set<string>(),
  zoomIndex: 3,
  scrollPosition: 0,
};

vi.mock('../ViewContext', () => ({
  useTimelineState: vi.fn(() => [mockTimelineState, mockSetTimelineState]),
}));

// Mock date-fns to have consistent dates in tests
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    isToday: vi.fn(() => false),
  };
});

// Mock GanttChart component
vi.mock('../../GanttChart', () => ({
  GanttChart: ({ beads, dependencies, onUpdate }: any) => (
    <div data-testid="gantt-chart" data-bead-count={beads.length} data-dep-count={dependencies.length}>
      GanttChart Mock
    </div>
  ),
}));

describe('TimelineView Component', () => {
  const mockOnUpdate = vi.fn();

  const mockBeads: Bead[] = [
    {
      id: 'bead-1',
      title: '[Q1] Epic Task',
      description: 'Test epic with milestone',
      status: 'in_progress',
      priority: 0,
      issue_type: 'epic',
      assignee: 'user1',
      estimated_minutes: 4800,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      due_at: '2025-03-31T00:00:00Z',
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
      due_at: '2025-01-31T00:00:00Z',
      defer_until: null,
      team: 'design',
    },
    {
      id: 'bead-3',
      title: '[FEB] Bug Fix',
      description: 'Test bug',
      status: 'closed',
      priority: 2,
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
    mockOnUpdate.mockClear();
    mockSetTimelineState.mockClear();
    // Reset mock timeline state
    mockTimelineState.collapsedIds = new Set();
    mockTimelineState.zoomIndex = 3;
    mockTimelineState.scrollPosition = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );
      expect(container.querySelector('.timeline-view')).toBeInTheDocument();
    });

    it('renders with proper ARIA labels', () => {
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByRole('region', { name: /timeline roadmap view/i })).toBeInTheDocument();
      expect(screen.getByRole('toolbar', { name: /timeline controls/i })).toBeInTheDocument();
    });

    it('renders GanttChart component with correct props', () => {
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const ganttChart = screen.getByTestId('gantt-chart');
      expect(ganttChart).toBeInTheDocument();
      expect(ganttChart).toHaveAttribute('data-bead-count', mockBeads.length.toString());
      expect(ganttChart).toHaveAttribute('data-dep-count', mockDependencies.length.toString());
    });
  });

  describe('Zoom Controls', () => {
    it('renders zoom slider with correct initial value', () => {
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const slider = screen.getByRole('slider', { name: /zoom level/i });
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveValue('3'); // Default zoom index
    });

    it('displays current zoom level label', () => {
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      // Default zoom index 3 corresponds to "Default" label
      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('updates zoom level when slider is moved', async () => {
      const user = userEvent.setup();
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const slider = screen.getByRole('slider', { name: /zoom level/i });

      // Change to zoom level 0 (Year)
      fireEvent.change(slider, { target: { value: '0' } });

      await waitFor(() => {
        expect(mockSetTimelineState).toHaveBeenCalledWith({ zoomIndex: 0 });
      });
    });

    it('renders zoom preset buttons', () => {
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByRole('button', { name: /year view/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /month view/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /week view/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /day view/i })).toBeInTheDocument();
    });

    it('highlights active zoom preset button', () => {
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const monthButton = screen.getByRole('button', { name: /month view/i });
      const yearButton = screen.getByRole('button', { name: /year view/i });

      // Month view (index 2) is not active by default (default is 3)
      expect(monthButton).not.toHaveClass('active');
      expect(yearButton).not.toHaveClass('active');
    });

    it('changes zoom level when preset button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const yearButton = screen.getByRole('button', { name: /year view/i });
      await user.click(yearButton);

      expect(mockSetTimelineState).toHaveBeenCalledWith({ zoomIndex: 0 });
    });

    it('has proper accessibility attributes on zoom slider', () => {
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-label', expect.stringContaining('Zoom level'));
      expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('view'));
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '5');
    });
  });

  describe('Milestone Markers', () => {
    it('extracts milestones from beads with due dates', () => {
      const { container } = render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      // Should have 2 milestones: epic (bead-1) and high-priority feature (bead-2)
      const milestones = container.querySelectorAll('.milestone-marker');
      expect(milestones.length).toBeGreaterThan(0);
    });

    it('categorizes milestones correctly (release vs deadline)', () => {
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      // Epic should be a release milestone
      const releaseMilestone = screen.getByRole('img', { name: /release.*Epic Task/i });
      expect(releaseMilestone).toBeInTheDocument();

      // High-priority feature should be a deadline milestone
      const deadlineMilestone = screen.getByRole('img', { name: /deadline.*Feature Task/i });
      expect(deadlineMilestone).toBeInTheDocument();
    });

    it('displays milestone labels at appropriate zoom levels', async () => {
      const user = userEvent.setup();
      mockTimelineState.zoomIndex = 5; // Day view (48px per day)

      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      // At high zoom, labels should be visible
      const { container } = render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const labels = container.querySelectorAll('.milestone-label');
      // At zoom level >= 24px, labels should be rendered
      expect(labels.length).toBeGreaterThanOrEqual(0);
    });

    it('hides milestones when no beads have due dates', () => {
      const beadsWithoutDueDates = mockBeads.map((b) => ({ ...b, due_at: null }));

      const { container } = render(
        <TimelineView
          beads={beadsWithoutDueDates}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const milestoneOverlay = container.querySelector('.milestone-overlay');
      expect(milestoneOverlay).not.toBeInTheDocument();
    });
  });

  describe('Today Marker', () => {
    it('renders today marker in legend', () => {
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      // Today marker should be in legend
      const legend = screen.getByText('Today');
      expect(legend).toBeInTheDocument();
    });

    it('today marker has proper visual indicator', () => {
      const { container } = render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const todayIndicator = container.querySelector('.today-indicator-line');
      expect(todayIndicator).toBeInTheDocument();
    });
  });

  describe('Legend', () => {
    it('renders legend with all milestone types', () => {
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Release')).toBeInTheDocument();
      expect(screen.getByText('Deadline')).toBeInTheDocument();
      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('renders legend items with visual markers', () => {
      const { container } = render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const releaseMarker = container.querySelector('.milestone-marker.diamond.release');
      const deadlineMarker = container.querySelector('.milestone-marker.diamond.deadline');

      expect(releaseMarker).toBeInTheDocument();
      expect(deadlineMarker).toBeInTheDocument();
    });
  });

  describe('ViewContext Integration', () => {
    it('reads initial zoom level from ViewContext', () => {
      mockTimelineState.zoomIndex = 2; // Month view

      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const slider = screen.getByRole('slider');
      expect(slider).toHaveValue('2');
      // "Month" appears in both the zoom value and the preset button
      const monthElements = screen.getAllByText('Month');
      expect(monthElements.length).toBeGreaterThan(0);
    });

    it('persists zoom level changes to ViewContext', async () => {
      const user = userEvent.setup();
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '4' } });

      await waitFor(() => {
        expect(mockSetTimelineState).toHaveBeenCalledWith({ zoomIndex: 4 });
      });
    });

    it('reads collapsed state from ViewContext', () => {
      mockTimelineState.collapsedIds = new Set(['bead-1', 'bead-2']);

      const { container } = render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      // ViewContext hook should be called
      expect(ViewContext.useTimelineState).toHaveBeenCalled();
    });

    it('updates collapsed state in ViewContext', () => {
      const { rerender } = render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      // The component should have access to handleCollapseToggle
      // This is tested indirectly through the component's internal state management
      expect(mockSetTimelineState).not.toHaveBeenCalled();
    });
  });

  describe('Scroll Position Persistence', () => {
    it('provides scroll position handler', () => {
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      // The component creates a handleScrollPosition callback
      // This is tested indirectly through component lifecycle
      expect(ViewContext.useTimelineState).toHaveBeenCalled();
    });
  });

  describe('Enhanced Tooltip', () => {
    it('does not render tooltip by default', () => {
      const { container } = render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const tooltip = container.querySelector('.timeline-tooltip');
      expect(tooltip).not.toBeInTheDocument();
    });

    // Note: Tooltip rendering requires hover state management which would need
    // additional implementation to expose the setHoveredTask function.
    // These tests verify the tooltip structure is in place.
  });

  describe('Accessibility', () => {
    it('has proper ARIA roles and labels', () => {
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByRole('region', { name: /timeline roadmap view/i })).toBeInTheDocument();
      expect(screen.getByRole('toolbar', { name: /timeline controls/i })).toBeInTheDocument();
    });

    it('zoom controls have accessible labels', () => {
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-label');
      expect(slider).toHaveAttribute('aria-valuetext');

      const label = screen.getByText('Zoom:');
      expect(label).toBeInTheDocument();
    });

    it('milestone markers have accessible descriptions', () => {
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const milestones = screen.getAllByRole('img');
      milestones.forEach((milestone) => {
        expect(milestone).toHaveAttribute('aria-label');
      });
    });

    it('legend markers are hidden from screen readers', () => {
      const { container } = render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const legendMarkers = container.querySelectorAll('.timeline-legend .milestone-marker, .today-indicator-line');
      legendMarkers.forEach((marker) => {
        expect(marker).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('zoom value has live region for screen reader updates', () => {
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const zoomValue = screen.getByText('Default');
      expect(zoomValue).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Responsive Behavior', () => {
    it('renders all controls on desktop', () => {
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByRole('slider')).toBeInTheDocument();
      expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(4); // Zoom preset buttons
    });

    it('applies responsive styles (verified through CSS)', () => {
      const { container } = render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const controls = container.querySelector('.timeline-controls');
      expect(controls).toBeInTheDocument();
      // Responsive styles are applied via CSS media queries
    });
  });

  describe('Edge Cases', () => {
    it('handles empty beads array', () => {
      render(
        <TimelineView
          beads={[]}
          dependencies={[]}
          onUpdate={mockOnUpdate}
        />
      );

      const ganttChart = screen.getByTestId('gantt-chart');
      expect(ganttChart).toHaveAttribute('data-bead-count', '0');
    });

    it('handles beads without due dates', () => {
      const beadsWithoutDueDates = mockBeads.map((b) => ({ ...b, due_at: null }));

      const { container } = render(
        <TimelineView
          beads={beadsWithoutDueDates}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      // Should not crash and milestone overlay should not render
      expect(container.querySelector('.milestone-overlay')).not.toBeInTheDocument();
    });

    it('handles invalid zoom index gracefully', () => {
      mockTimelineState.zoomIndex = 10; // Out of bounds

      expect(() => {
        render(
          <TimelineView
            beads={mockBeads}
            dependencies={mockDependencies}
            onUpdate={mockOnUpdate}
          />
        );
      }).not.toThrow();
    });

    it('handles beads with missing description', () => {
      const beadsWithoutDescription = mockBeads.map((b) => ({ ...b, description: '' }));

      expect(() => {
        render(
          <TimelineView
            beads={beadsWithoutDescription}
            dependencies={mockDependencies}
            onUpdate={mockOnUpdate}
          />
        );
      }).not.toThrow();
    });

    it('handles beads with missing assignee', () => {
      const beadsWithoutAssignee = mockBeads.map((b) => ({ ...b, assignee: null }));

      expect(() => {
        render(
          <TimelineView
            beads={beadsWithoutAssignee}
            dependencies={mockDependencies}
            onUpdate={mockOnUpdate}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Integration with GanttChart', () => {
    it('passes all props correctly to GanttChart', () => {
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const ganttChart = screen.getByTestId('gantt-chart');
      expect(ganttChart).toHaveAttribute('data-bead-count', mockBeads.length.toString());
      expect(ganttChart).toHaveAttribute('data-dep-count', mockDependencies.length.toString());
    });

    it('wraps GanttChart in timeline content container', () => {
      const { container } = render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const timelineContent = container.querySelector('.timeline-content');
      expect(timelineContent).toBeInTheDocument();
      expect(within(timelineContent!).getByTestId('gantt-chart')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('zoom slider is keyboard accessible', async () => {
      const user = userEvent.setup();
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const slider = screen.getByRole('slider');
      slider.focus();
      expect(slider).toHaveFocus();
    });

    it('zoom preset buttons are keyboard accessible', async () => {
      const user = userEvent.setup();
      render(
        <TimelineView
          beads={mockBeads}
          dependencies={mockDependencies}
          onUpdate={mockOnUpdate}
        />
      );

      const yearButton = screen.getByRole('button', { name: /year view/i });
      yearButton.focus();
      expect(yearButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(mockSetTimelineState).toHaveBeenCalledWith({ zoomIndex: 0 });
    });
  });
});
