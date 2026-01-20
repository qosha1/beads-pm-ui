import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScheduleBadge } from '../ScheduleBadge';

describe('ScheduleBadge Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<ScheduleBadge status="on_track" />);

      expect(container.querySelector('[role="status"]')).toBeInTheDocument();
    });

    it('displays correct label for ahead status', () => {
      render(<ScheduleBadge status="ahead" />);

      expect(screen.getByText('Ahead')).toBeInTheDocument();
    });

    it('displays correct label for on_track status', () => {
      render(<ScheduleBadge status="on_track" />);

      expect(screen.getByText('On Track')).toBeInTheDocument();
    });

    it('displays correct label for behind status', () => {
      render(<ScheduleBadge status="behind" />);

      expect(screen.getByText('Behind')).toBeInTheDocument();
    });

    it('displays correct label for overdue status', () => {
      render(<ScheduleBadge status="overdue" />);

      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <ScheduleBadge status="on_track" className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Compact Mode', () => {
    it('hides visible text label in compact mode', () => {
      const { container } = render(<ScheduleBadge status="ahead" compact />);

      const visibleLabel = container.querySelector('.leading-none.whitespace-nowrap');
      expect(visibleLabel).not.toBeInTheDocument();
    });

    it('provides screen reader label only in compact mode', () => {
      const { container } = render(<ScheduleBadge status="ahead" compact />);

      const srOnly = container.querySelector('.sr-only');
      expect(srOnly).toHaveTextContent('Ahead');
      expect(screen.queryByText('Ahead')).toBeInTheDocument();
    });

    it('displays icon in compact mode', () => {
      const { container } = render(<ScheduleBadge status="ahead" compact />);

      expect(container.textContent).toContain('≫');
    });

    it('shows full label in non-compact mode', () => {
      render(<ScheduleBadge status="ahead" compact={false} />);

      expect(screen.getByText('Ahead')).toBeInTheDocument();
    });

    it('hides visible days delta in compact mode', () => {
      const { container } = render(<ScheduleBadge status="ahead" daysDelta={5} compact />);

      const visibleDelta = container.querySelector('.font-mono');
      expect(visibleDelta).not.toBeInTheDocument();
    });
  });

  describe('Status Icons', () => {
    it('displays correct icon for ahead', () => {
      const { container } = render(<ScheduleBadge status="ahead" />);

      expect(container.textContent).toContain('≫');
    });

    it('displays correct icon for on_track', () => {
      const { container } = render(<ScheduleBadge status="on_track" />);

      expect(container.textContent).toContain('–');
    });

    it('displays correct icon for behind', () => {
      const { container } = render(<ScheduleBadge status="behind" />);

      expect(container.textContent).toContain('‼');
    });

    it('displays correct icon for overdue', () => {
      const { container } = render(<ScheduleBadge status="overdue" />);

      expect(container.textContent).toContain('✕✕');
    });

    it('marks icon as aria-hidden', () => {
      const { container } = render(<ScheduleBadge status="ahead" />);

      const icon = container.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Days Delta Display', () => {
    it('displays positive days delta for ahead schedule', () => {
      render(<ScheduleBadge status="ahead" daysDelta={5} />);

      expect(screen.getByText('+5d')).toBeInTheDocument();
    });

    it('displays negative days delta as positive number for behind', () => {
      render(<ScheduleBadge status="behind" daysDelta={-3} />);

      expect(screen.getByText('3d')).toBeInTheDocument();
    });

    it('displays days delta for overdue', () => {
      render(<ScheduleBadge status="overdue" daysDelta={-10} />);

      expect(screen.getByText('10d')).toBeInTheDocument();
    });

    it('does not display delta when daysDelta is 0', () => {
      render(<ScheduleBadge status="on_track" daysDelta={0} />);

      expect(screen.queryByText('0d')).not.toBeInTheDocument();
      expect(screen.queryByText('+0d')).not.toBeInTheDocument();
    });

    it('does not display delta when daysDelta is undefined', () => {
      render(<ScheduleBadge status="on_track" />);

      expect(screen.queryByText(/d$/)).not.toBeInTheDocument();
    });

    it('formats single day correctly', () => {
      render(<ScheduleBadge status="ahead" daysDelta={1} />);

      expect(screen.getByText('+1d')).toBeInTheDocument();
    });

    it('formats double digit days correctly', () => {
      render(<ScheduleBadge status="ahead" daysDelta={15} />);

      expect(screen.getByText('+15d')).toBeInTheDocument();
    });

    it('uses monospace font for days delta', () => {
      const { container } = render(
        <ScheduleBadge status="ahead" daysDelta={5} />
      );

      const delta = container.querySelector('.font-mono');
      expect(delta).toBeInTheDocument();
      expect(delta).toHaveTextContent('+5d');
    });
  });

  describe('Status Colors', () => {
    it('applies green colors for ahead', () => {
      const { container } = render(<ScheduleBadge status="ahead" />);

      const badge = container.querySelector('[role="status"]');

      expect(badge).toHaveStyle({
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        color: '#22c55e',
      });
    });

    it('applies gray colors for on_track', () => {
      const { container } = render(<ScheduleBadge status="on_track" />);

      const badge = container.querySelector('[role="status"]');

      expect(badge).toHaveStyle({
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        color: '#9ca3af',
      });
    });

    it('applies yellow colors for behind', () => {
      const { container } = render(<ScheduleBadge status="behind" />);

      const badge = container.querySelector('[role="status"]');

      expect(badge).toHaveStyle({
        backgroundColor: 'rgba(234, 179, 8, 0.15)',
        color: '#eab308',
      });
    });

    it('applies red colors for overdue', () => {
      const { container } = render(<ScheduleBadge status="overdue" />);

      const badge = container.querySelector('[role="status"]');

      expect(badge).toHaveStyle({
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        color: '#ef4444',
      });
    });

    it('applies border with correct color for each status', () => {
      const statuses: Array<{
        status: 'ahead' | 'on_track' | 'behind' | 'overdue';
        borderColor: string;
      }> = [
        { status: 'ahead', borderColor: 'rgba(34, 197, 94, 0.3)' },
        { status: 'on_track', borderColor: 'rgba(156, 163, 175, 0.2)' },
        { status: 'behind', borderColor: 'rgba(234, 179, 8, 0.3)' },
        { status: 'overdue', borderColor: 'rgba(239, 68, 68, 0.3)' },
      ];

      statuses.forEach(({ status, borderColor }) => {
        const { container } = render(<ScheduleBadge status={status} />);
        const badge = container.querySelector('[role="status"]');
        const styles = badge?.getAttribute('style');

        expect(styles).toContain(borderColor);
      });
    });
  });

  describe('Styling', () => {
    it('applies pill shape with rounded corners', () => {
      const { container } = render(<ScheduleBadge status="ahead" />);

      expect(container.firstChild).toHaveClass('rounded-full');
    });

    it('applies uppercase text transformation', () => {
      const { container } = render(<ScheduleBadge status="ahead" />);

      expect(container.firstChild).toHaveClass('uppercase');
    });

    it('applies correct font styling', () => {
      const { container } = render(<ScheduleBadge status="ahead" />);

      expect(container.firstChild).toHaveClass('text-xs', 'font-semibold');
    });

    it('applies letter spacing', () => {
      const { container } = render(<ScheduleBadge status="ahead" />);

      expect(container.firstChild).toHaveClass('tracking-wider');
    });

    it('applies padding', () => {
      const { container } = render(<ScheduleBadge status="ahead" />);

      expect(container.firstChild).toHaveClass('px-2', 'py-1');
    });

    it('applies gap between elements', () => {
      const { container } = render(<ScheduleBadge status="ahead" />);

      expect(container.firstChild).toHaveClass('gap-1.5');
    });
  });

  describe('Accessibility', () => {
    it('has role="status"', () => {
      render(<ScheduleBadge status="ahead" />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-live="polite"', () => {
      const { container } = render(<ScheduleBadge status="ahead" />);

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveAttribute('aria-live', 'polite');
    });

    it('provides descriptive aria-label without delta', () => {
      const { container } = render(<ScheduleBadge status="ahead" />);

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveAttribute('aria-label', 'Schedule: Ahead');
    });

    it('includes days delta in aria-label', () => {
      const { container } = render(
        <ScheduleBadge status="ahead" daysDelta={5} />
      );

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveAttribute('aria-label', 'Schedule: Ahead +5d');
    });

    it('includes negative delta in aria-label', () => {
      const { container } = render(
        <ScheduleBadge status="behind" daysDelta={-3} />
      );

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveAttribute('aria-label', 'Schedule: Behind 3d');
    });

    it('provides screen reader text only in compact mode', () => {
      const { container } = render(
        <ScheduleBadge status="ahead" daysDelta={5} compact />
      );

      const srText = container.querySelector('.sr-only');
      expect(srText).toHaveTextContent('Ahead +5d');
    });

    it('hides decorative icon from screen readers', () => {
      const { container } = render(<ScheduleBadge status="ahead" />);

      const icon = container.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('All Status Variations', () => {
    it('renders all status types correctly', () => {
      const statuses: Array<{
        status: 'ahead' | 'on_track' | 'behind' | 'overdue';
        label: string;
      }> = [
        { status: 'ahead', label: 'Ahead' },
        { status: 'on_track', label: 'On Track' },
        { status: 'behind', label: 'Behind' },
        { status: 'overdue', label: 'Overdue' },
      ];

      statuses.forEach(({ status, label }) => {
        const { unmount } = render(<ScheduleBadge status={status} />);

        expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);

        unmount();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles very large positive delta', () => {
      render(<ScheduleBadge status="ahead" daysDelta={999} />);

      expect(screen.getByText('+999d')).toBeInTheDocument();
    });

    it('handles very large negative delta', () => {
      render(<ScheduleBadge status="overdue" daysDelta={-999} />);

      expect(screen.getByText('999d')).toBeInTheDocument();
    });

    it('handles zero delta correctly', () => {
      render(<ScheduleBadge status="on_track" daysDelta={0} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'Schedule: On Track');
    });

    it('handles missing daysDelta gracefully', () => {
      const { container } = render(<ScheduleBadge status="ahead" />);

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveAttribute('aria-label', 'Schedule: Ahead');
    });
  });

  describe('Integration', () => {
    it('maintains accessibility in compact mode with delta', () => {
      const { container } = render(
        <ScheduleBadge status="ahead" daysDelta={5} compact />
      );

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveAttribute('aria-live', 'polite');
      expect(badge).toHaveAttribute('aria-label', 'Schedule: Ahead +5d');
    });

    it('applies custom className without breaking styling', () => {
      const { container } = render(
        <ScheduleBadge status="ahead" className="custom-class" />
      );

      const badge = container.firstChild as Element;
      expect(badge).toHaveClass('custom-class');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('uppercase');
    });

    it('renders consistently across different statuses', () => {
      const { container: container1 } = render(
        <ScheduleBadge status="ahead" />
      );
      const { container: container2 } = render(
        <ScheduleBadge status="overdue" />
      );

      const badge1 = container1.querySelector('[role="status"]');
      const badge2 = container2.querySelector('[role="status"]');

      expect(badge1?.className).toBe(badge2?.className);
    });

    it('handles all combinations of status and delta', () => {
      const combinations = [
        { status: 'ahead' as const, daysDelta: 5 },
        { status: 'on_track' as const, daysDelta: 0 },
        { status: 'behind' as const, daysDelta: -3 },
        { status: 'overdue' as const, daysDelta: -10 },
      ];

      combinations.forEach(({ status, daysDelta }) => {
        const { unmount } = render(
          <ScheduleBadge status={status} daysDelta={daysDelta} />
        );

        expect(screen.getByRole('status')).toBeInTheDocument();

        unmount();
      });
    });
  });
});
