import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MilestoneMarker, type Milestone } from '../MilestoneMarker';

describe('MilestoneMarker', () => {
  const mockMilestone: Milestone = {
    id: 'milestone-1',
    // Use full ISO string with time to avoid timezone issues
    date: new Date('2026-02-15T12:00:00'),
    title: 'Q1 Release',
    description: 'Major feature release for Q1',
    type: 'release',
    completed: false,
  };

  describe('Rendering', () => {
    it('renders milestone marker with correct positioning', () => {
      const { container } = render(
        <MilestoneMarker milestone={mockMilestone} position={100} height={500} />
      );

      const marker = container.querySelector('.milestone-marker');
      expect(marker).toBeInTheDocument();
      expect(marker).toHaveStyle({
        position: 'absolute',
        left: '100px',
        top: '0px',
        height: '500px',
      });
    });

    it('renders vertical line with correct styling', () => {
      const { container } = render(
        <MilestoneMarker milestone={mockMilestone} position={100} height={500} />
      );

      const line = container.querySelector('[style*="width: 2"]');
      expect(line).toBeInTheDocument();
      expect(line).toHaveStyle({
        position: 'absolute',
        width: '2px',
      });
    });

    it('renders icon badge for milestone type', () => {
      const { container } = render(
        <MilestoneMarker milestone={mockMilestone} position={100} height={500} />
      );

      const badge = container.querySelector('.milestone-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('🚀');
    });

    it('renders milestone label with title and date', () => {
      const { container } = render(
        <MilestoneMarker milestone={mockMilestone} position={100} height={500} />
      );

      const label = container.querySelector('.milestone-label');
      expect(label).toBeInTheDocument();
      expect(label).toHaveTextContent('Q1 Release');
      expect(label).toHaveTextContent('Feb 15, 2026');
    });

    it('renders description when provided', () => {
      const { container } = render(
        <MilestoneMarker milestone={mockMilestone} position={100} height={500} />
      );

      const label = container.querySelector('.milestone-label');
      expect(label).toHaveTextContent('Major feature release for Q1');
    });

    it('does not render description when not provided', () => {
      const milestoneWithoutDesc: Milestone = {
        ...mockMilestone,
        description: undefined,
      };

      const { container } = render(
        <MilestoneMarker milestone={milestoneWithoutDesc} position={100} height={500} />
      );

      const label = container.querySelector('.milestone-label');
      expect(label).not.toHaveTextContent('Major feature release');
    });
  });

  describe('Milestone Types', () => {
    it('renders release milestone with correct icon', () => {
      const releaseMilestone: Milestone = { ...mockMilestone, type: 'release' };
      const { container } = render(
        <MilestoneMarker milestone={releaseMilestone} position={100} height={500} />
      );

      const badge = container.querySelector('.milestone-badge');
      expect(badge).toHaveTextContent('🚀');
    });

    it('renders deadline milestone with correct icon', () => {
      const deadlineMilestone: Milestone = { ...mockMilestone, type: 'deadline' };
      const { container } = render(
        <MilestoneMarker milestone={deadlineMilestone} position={100} height={500} />
      );

      const badge = container.querySelector('.milestone-badge');
      expect(badge).toHaveTextContent('⏰');
    });

    it('renders checkpoint milestone with correct icon', () => {
      const checkpointMilestone: Milestone = { ...mockMilestone, type: 'checkpoint' };
      const { container } = render(
        <MilestoneMarker milestone={checkpointMilestone} position={100} height={500} />
      );

      const badge = container.querySelector('.milestone-badge');
      expect(badge).toHaveTextContent('📍');
    });

    it('renders event milestone with correct icon', () => {
      const eventMilestone: Milestone = { ...mockMilestone, type: 'event' };
      const { container } = render(
        <MilestoneMarker milestone={eventMilestone} position={100} height={500} />
      );

      const badge = container.querySelector('.milestone-badge');
      expect(badge).toHaveTextContent('📅');
    });

    it('defaults to checkpoint type when type is not provided', () => {
      const defaultMilestone: Milestone = {
        ...mockMilestone,
        type: undefined,
      };
      const { container } = render(
        <MilestoneMarker milestone={defaultMilestone} position={100} height={500} />
      );

      const badge = container.querySelector('.milestone-badge');
      expect(badge).toHaveTextContent('📍');
    });
  });

  describe('Completion Status', () => {
    it('shows checkmark icon when milestone is completed', () => {
      const completedMilestone: Milestone = { ...mockMilestone, completed: true };
      const { container } = render(
        <MilestoneMarker milestone={completedMilestone} position={100} height={500} />
      );

      const badge = container.querySelector('.milestone-badge');
      expect(badge).toHaveTextContent('✓');
    });

    it('applies reduced opacity when milestone is completed', () => {
      const completedMilestone: Milestone = { ...mockMilestone, completed: true };
      const { container } = render(
        <MilestoneMarker milestone={completedMilestone} position={100} height={500} />
      );

      const badge = container.querySelector('.milestone-badge');
      expect(badge).toHaveStyle({ opacity: 0.6 });
    });

    it('shows normal icon when milestone is not completed', () => {
      const { container } = render(
        <MilestoneMarker milestone={mockMilestone} position={100} height={500} />
      );

      const badge = container.querySelector('.milestone-badge');
      expect(badge).toHaveTextContent('🚀');
      expect(badge).not.toHaveTextContent('✓');
    });
  });

  describe('Interaction', () => {
    it('calls onClick handler when marker is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      const { container } = render(
        <MilestoneMarker
          milestone={mockMilestone}
          position={100}
          height={500}
          onClick={handleClick}
        />
      );

      const marker = container.querySelector('.milestone-marker');
      if (!marker) throw new Error('Marker not found');

      await user.click(marker as HTMLElement);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not set click handlers when onClick is not provided', () => {
      const { container } = render(
        <MilestoneMarker milestone={mockMilestone} position={100} height={500} />
      );

      const marker = container.querySelector('.milestone-marker');
      expect(marker).toHaveStyle({ cursor: 'default' });
      expect(marker).not.toHaveAttribute('role', 'button');
    });

    it('sets cursor to pointer when onClick is provided', () => {
      const handleClick = vi.fn();
      const { container } = render(
        <MilestoneMarker
          milestone={mockMilestone}
          position={100}
          height={500}
          onClick={handleClick}
        />
      );

      const marker = container.querySelector('.milestone-marker');
      expect(marker).toHaveStyle({ cursor: 'pointer' });
    });

    it('handles keyboard Enter key press', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      const { container } = render(
        <MilestoneMarker
          milestone={mockMilestone}
          position={100}
          height={500}
          onClick={handleClick}
        />
      );

      const marker = container.querySelector('.milestone-marker') as HTMLElement;
      marker.focus();
      await user.keyboard('{Enter}');

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles keyboard Space key press', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      const { container } = render(
        <MilestoneMarker
          milestone={mockMilestone}
          position={100}
          height={500}
          onClick={handleClick}
        />
      );

      const marker = container.querySelector('.milestone-marker') as HTMLElement;
      marker.focus();
      await user.keyboard(' ');

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('ignores other keyboard keys', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      const { container } = render(
        <MilestoneMarker
          milestone={mockMilestone}
          position={100}
          height={500}
          onClick={handleClick}
        />
      );

      const marker = container.querySelector('.milestone-marker') as HTMLElement;
      marker.focus();
      await user.keyboard('{Escape}');

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA label with milestone details', () => {
      const { container } = render(
        <MilestoneMarker milestone={mockMilestone} position={100} height={500} />
      );

      const marker = container.querySelector('.milestone-marker');
      expect(marker).toHaveAttribute('aria-label', 'Milestone: Q1 Release, Feb 15, 2026');
    });

    it('includes completion status in ARIA label', () => {
      const completedMilestone: Milestone = { ...mockMilestone, completed: true };
      const { container } = render(
        <MilestoneMarker milestone={completedMilestone} position={100} height={500} />
      );

      const marker = container.querySelector('.milestone-marker');
      expect(marker).toHaveAttribute(
        'aria-label',
        'Milestone: Q1 Release, Feb 15, 2026, completed'
      );
    });

    it('is focusable when onClick is provided', () => {
      const handleClick = vi.fn();
      const { container } = render(
        <MilestoneMarker
          milestone={mockMilestone}
          position={100}
          height={500}
          onClick={handleClick}
        />
      );

      const marker = container.querySelector('.milestone-marker');
      expect(marker).toHaveAttribute('tabIndex', '0');
      expect(marker).toHaveAttribute('role', 'button');
    });

    it('is not focusable when onClick is not provided', () => {
      const { container } = render(
        <MilestoneMarker milestone={mockMilestone} position={100} height={500} />
      );

      const marker = container.querySelector('.milestone-marker');
      expect(marker).not.toHaveAttribute('tabIndex');
      expect(marker).not.toHaveAttribute('role');
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <MilestoneMarker
          milestone={mockMilestone}
          position={100}
          height={500}
          className="custom-milestone"
        />
      );

      const marker = container.querySelector('.milestone-marker');
      expect(marker).toHaveClass('custom-milestone');
    });

    it('maintains default milestone-marker class', () => {
      const { container } = render(
        <MilestoneMarker
          milestone={mockMilestone}
          position={100}
          height={500}
          className="custom-milestone"
        />
      );

      const marker = container.querySelector('.milestone-marker');
      expect(marker).toHaveClass('milestone-marker');
      expect(marker).toHaveClass('custom-milestone');
    });
  });

  describe('Edge Cases', () => {
    it('handles zero position', () => {
      const { container } = render(
        <MilestoneMarker milestone={mockMilestone} position={0} height={500} />
      );

      const marker = container.querySelector('.milestone-marker');
      expect(marker).toHaveStyle({ left: '0px' });
    });

    it('handles large position values', () => {
      const { container } = render(
        <MilestoneMarker milestone={mockMilestone} position={9999} height={500} />
      );

      const marker = container.querySelector('.milestone-marker');
      expect(marker).toHaveStyle({ left: '9999px' });
    });

    it('handles minimum height', () => {
      const { container } = render(
        <MilestoneMarker milestone={mockMilestone} position={100} height={0} />
      );

      const marker = container.querySelector('.milestone-marker');
      expect(marker).toHaveStyle({ height: '0px' });
    });

    it('handles very long titles', () => {
      const longTitleMilestone: Milestone = {
        ...mockMilestone,
        title: 'A'.repeat(100),
      };

      const { container } = render(
        <MilestoneMarker milestone={longTitleMilestone} position={100} height={500} />
      );

      const label = container.querySelector('.milestone-label');
      expect(label).toHaveTextContent('A'.repeat(100));
    });

    it('handles very long descriptions', () => {
      const longDescMilestone: Milestone = {
        ...mockMilestone,
        description: 'B'.repeat(200),
      };

      const { container } = render(
        <MilestoneMarker milestone={longDescMilestone} position={100} height={500} />
      );

      const label = container.querySelector('.milestone-label');
      expect(label).toHaveTextContent('B'.repeat(200));
    });
  });
});
