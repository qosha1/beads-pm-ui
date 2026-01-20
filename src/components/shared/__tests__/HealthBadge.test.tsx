import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthBadge } from '../HealthBadge';

describe('HealthBadge Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<HealthBadge status="on_track" />);

      expect(container.querySelector('[role="status"]')).toBeInTheDocument();
    });

    it('displays correct label for on_track status', () => {
      render(<HealthBadge status="on_track" />);

      expect(screen.getByText('On Track')).toBeInTheDocument();
    });

    it('displays correct label for at_risk status', () => {
      render(<HealthBadge status="at_risk" />);

      expect(screen.getByText('At Risk')).toBeInTheDocument();
    });

    it('displays correct label for blocked status', () => {
      render(<HealthBadge status="blocked" />);

      expect(screen.getByText('Blocked')).toBeInTheDocument();
    });

    it('displays correct label for not_started status', () => {
      render(<HealthBadge status="not_started" />);

      expect(screen.getByText('Not Started')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <HealthBadge status="on_track" className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Compact Mode', () => {
    it('hides visible text label in compact mode', () => {
      const { container } = render(<HealthBadge status="on_track" compact />);

      const visibleLabel = container.querySelector('.leading-none.whitespace-nowrap');
      expect(visibleLabel).not.toBeInTheDocument();
    });

    it('provides screen reader label only in compact mode', () => {
      const { container } = render(<HealthBadge status="on_track" compact />);

      const srOnly = container.querySelector('.sr-only');
      expect(srOnly).toHaveTextContent('On Track');
      expect(screen.queryByText('On Track')).toBeInTheDocument();
    });

    it('displays icon in compact mode', () => {
      const { container } = render(<HealthBadge status="on_track" compact />);

      expect(container.textContent).toContain('●');
    });

    it('shows full label in non-compact mode', () => {
      render(<HealthBadge status="on_track" compact={false} />);

      expect(screen.getByText('On Track')).toBeInTheDocument();
    });
  });

  describe('Status Icons', () => {
    it('displays correct icon for on_track', () => {
      const { container } = render(<HealthBadge status="on_track" />);

      expect(container.textContent).toContain('●');
    });

    it('displays correct icon for at_risk', () => {
      const { container } = render(<HealthBadge status="at_risk" />);

      expect(container.textContent).toContain('⚠');
    });

    it('displays correct icon for blocked', () => {
      const { container } = render(<HealthBadge status="blocked" />);

      expect(container.textContent).toContain('✕');
    });

    it('displays correct icon for not_started', () => {
      const { container } = render(<HealthBadge status="not_started" />);

      expect(container.textContent).toContain('○');
    });

    it('marks icon as aria-hidden', () => {
      const { container } = render(<HealthBadge status="on_track" />);

      const icon = container.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Status Colors', () => {
    it('applies green colors for on_track', () => {
      const { container } = render(<HealthBadge status="on_track" />);

      const badge = container.querySelector('[role="status"]');
      const styles = window.getComputedStyle(badge as Element);

      expect(badge).toHaveStyle({
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        color: '#22c55e',
      });
    });

    it('applies yellow colors for at_risk', () => {
      const { container } = render(<HealthBadge status="at_risk" />);

      const badge = container.querySelector('[role="status"]');

      expect(badge).toHaveStyle({
        backgroundColor: 'rgba(234, 179, 8, 0.15)',
        color: '#eab308',
      });
    });

    it('applies red colors for blocked', () => {
      const { container } = render(<HealthBadge status="blocked" />);

      const badge = container.querySelector('[role="status"]');

      expect(badge).toHaveStyle({
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        color: '#ef4444',
      });
    });

    it('applies gray colors for not_started', () => {
      const { container } = render(<HealthBadge status="not_started" />);

      const badge = container.querySelector('[role="status"]');

      expect(badge).toHaveStyle({
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        color: '#9ca3af',
      });
    });

    it('applies border with correct color for each status', () => {
      const statuses: Array<{
        status: 'on_track' | 'at_risk' | 'blocked' | 'not_started';
        borderColor: string;
      }> = [
        { status: 'on_track', borderColor: 'rgba(34, 197, 94, 0.3)' },
        { status: 'at_risk', borderColor: 'rgba(234, 179, 8, 0.3)' },
        { status: 'blocked', borderColor: 'rgba(239, 68, 68, 0.3)' },
        { status: 'not_started', borderColor: 'rgba(156, 163, 175, 0.2)' },
      ];

      statuses.forEach(({ status, borderColor }) => {
        const { container } = render(<HealthBadge status={status} />);
        const badge = container.querySelector('[role="status"]');
        const styles = badge?.getAttribute('style');

        expect(styles).toContain(borderColor);
      });
    });
  });

  describe('Styling', () => {
    it('applies pill shape with rounded corners', () => {
      const { container } = render(<HealthBadge status="on_track" />);

      expect(container.firstChild).toHaveClass('rounded-full');
    });

    it('applies uppercase text transformation', () => {
      const { container } = render(<HealthBadge status="on_track" />);

      expect(container.firstChild).toHaveClass('uppercase');
    });

    it('applies correct font styling', () => {
      const { container } = render(<HealthBadge status="on_track" />);

      expect(container.firstChild).toHaveClass('text-xs', 'font-semibold');
    });

    it('applies letter spacing', () => {
      const { container } = render(<HealthBadge status="on_track" />);

      expect(container.firstChild).toHaveClass('tracking-wider');
    });

    it('applies padding', () => {
      const { container } = render(<HealthBadge status="on_track" />);

      expect(container.firstChild).toHaveClass('px-2', 'py-1');
    });

    it('applies gap between icon and text', () => {
      const { container } = render(<HealthBadge status="on_track" />);

      expect(container.firstChild).toHaveClass('gap-1.5');
    });
  });

  describe('Accessibility', () => {
    it('has role="status"', () => {
      render(<HealthBadge status="on_track" />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-live="polite"', () => {
      const { container } = render(<HealthBadge status="on_track" />);

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveAttribute('aria-live', 'polite');
    });

    it('provides descriptive aria-label', () => {
      const { container } = render(<HealthBadge status="on_track" />);

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveAttribute('aria-label', 'Health status: On Track');
    });

    it('provides screen reader text only in compact mode', () => {
      const statuses: Array<'on_track' | 'at_risk' | 'blocked' | 'not_started'> = [
        'on_track',
        'at_risk',
        'blocked',
        'not_started',
      ];

      statuses.forEach((status) => {
        const { container } = render(<HealthBadge status={status} compact />);
        const srText = container.querySelector('.sr-only');

        expect(srText).toBeInTheDocument();
      });
    });

    it('hides decorative icon from screen readers', () => {
      const { container } = render(<HealthBadge status="on_track" />);

      const icon = container.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('All Status Variations', () => {
    it('renders all status types correctly', () => {
      const statuses: Array<{
        status: 'on_track' | 'at_risk' | 'blocked' | 'not_started';
        label: string;
      }> = [
        { status: 'on_track', label: 'On Track' },
        { status: 'at_risk', label: 'At Risk' },
        { status: 'blocked', label: 'Blocked' },
        { status: 'not_started', label: 'Not Started' },
      ];

      statuses.forEach(({ status, label }) => {
        const { unmount } = render(<HealthBadge status={status} />);

        expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);

        unmount();
      });
    });
  });

  describe('Integration', () => {
    it('maintains accessibility in compact mode', () => {
      const { container } = render(<HealthBadge status="blocked" compact />);

      const badge = container.querySelector('[role="status"]');
      expect(badge).toHaveAttribute('aria-live', 'polite');
      expect(badge).toHaveAttribute('aria-label', 'Health status: Blocked');
    });

    it('applies custom className without breaking styling', () => {
      const { container } = render(
        <HealthBadge status="on_track" className="custom-class" />
      );

      const badge = container.firstChild as Element;
      expect(badge).toHaveClass('custom-class');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('uppercase');
    });

    it('renders consistently across different statuses', () => {
      const { container: container1 } = render(
        <HealthBadge status="on_track" />
      );
      const { container: container2 } = render(
        <HealthBadge status="blocked" />
      );

      const badge1 = container1.querySelector('[role="status"]');
      const badge2 = container2.querySelector('[role="status"]');

      expect(badge1?.className).toBe(badge2?.className);
    });
  });
});
