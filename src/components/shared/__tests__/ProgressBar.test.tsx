import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../ProgressBar';

describe('ProgressBar Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<ProgressBar progress={50} />);

      expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument();
    });

    it('displays progress bar with correct aria attributes', () => {
      render(<ProgressBar progress={75} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label', 'Progress: 75 percent');
    });

    it('displays percentage label by default', () => {
      render(<ProgressBar progress={42} />);

      expect(screen.getByText('42%')).toBeInTheDocument();
    });

    it('hides label when showLabel is false', () => {
      render(<ProgressBar progress={42} showLabel={false} />);

      expect(screen.queryByText('42%')).not.toBeInTheDocument();
    });

    it('applies correct size class for sm', () => {
      const { container } = render(<ProgressBar progress={50} size="sm" />);

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveClass('h-1');
    });

    it('applies correct size class for md (default)', () => {
      const { container } = render(<ProgressBar progress={50} size="md" />);

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveClass('h-1.5');
    });

    it('applies correct size class for lg', () => {
      const { container } = render(<ProgressBar progress={50} size="lg" />);

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveClass('h-2');
    });

    it('applies custom className', () => {
      const { container } = render(
        <ProgressBar progress={50} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Progress Values', () => {
    it('displays 0% progress', () => {
      render(<ProgressBar progress={0} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('displays 100% progress', () => {
      render(<ProgressBar progress={100} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('rounds decimal progress values', () => {
      render(<ProgressBar progress={42.7} />);

      expect(screen.getByText('43%')).toBeInTheDocument();
    });

    it('clamps progress below 0 to 0', () => {
      render(<ProgressBar progress={-10} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('clamps progress above 100 to 100', () => {
      render(<ProgressBar progress={150} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Status Colors', () => {
    it('applies on_track color (accent blue)', () => {
      const { container } = render(
        <ProgressBar progress={50} status="on_track" />
      );

      const fill = container.querySelector('.bg-accent');
      expect(fill).toBeInTheDocument();
    });

    it('applies at_risk color (warning yellow)', () => {
      const { container } = render(
        <ProgressBar progress={50} status="at_risk" />
      );

      const fill = container.querySelector('.bg-warning');
      expect(fill).toBeInTheDocument();
    });

    it('applies blocked color (danger red)', () => {
      const { container } = render(
        <ProgressBar progress={50} status="blocked" />
      );

      const fill = container.querySelector('.bg-danger');
      expect(fill).toBeInTheDocument();
    });

    it('applies not_started color (border gray)', () => {
      const { container } = render(
        <ProgressBar progress={0} status="not_started" />
      );

      expect(container.querySelector('.bg-border')).not.toBeInTheDocument();
    });

    it('defaults to on_track status', () => {
      const { container } = render(<ProgressBar progress={50} />);

      const fill = container.querySelector('.bg-accent');
      expect(fill).toBeInTheDocument();
    });
  });

  describe('Visual Rendering', () => {
    it('renders fill with correct width style', () => {
      const { container } = render(<ProgressBar progress={75} />);

      const fill = container.querySelector('.bg-accent');
      expect(fill).toHaveStyle({ width: '75%' });
    });

    it('renders no fill for 0% progress', () => {
      const { container } = render(<ProgressBar progress={0} />);

      const fill = container.querySelector('.bg-accent');
      expect(fill).not.toBeInTheDocument();
    });

    it('applies transition classes for smooth animation', () => {
      const { container } = render(<ProgressBar progress={50} />);

      const fill = container.querySelector('.bg-accent');
      expect(fill).toHaveClass('transition-all', 'duration-300', 'ease-out');
    });

    it('has rounded corners on progress track', () => {
      const { container } = render(<ProgressBar progress={50} />);

      const track = container.querySelector('[role="progressbar"]');
      expect(track).toHaveClass('rounded-full');
    });
  });

  describe('Accessibility', () => {
    it('has proper role attribute', () => {
      render(<ProgressBar progress={50} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('provides descriptive aria-label', () => {
      render(<ProgressBar progress={65} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Progress: 65 percent');
    });

    it('uses tabular nums for percentage display', () => {
      const { container } = render(<ProgressBar progress={42} />);

      const label = container.querySelector('.tabular-nums');
      expect(label).toBeInTheDocument();
      expect(label).toHaveTextContent('42%');
    });

    it('sets minimum width for percentage label', () => {
      const { container } = render(<ProgressBar progress={5} />);

      const label = container.querySelector('.min-w-\\[36px\\]');
      expect(label).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles very small progress values', () => {
      render(<ProgressBar progress={0.1} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles very large progress values', () => {
      render(<ProgressBar progress={999} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('handles NaN progress gracefully', () => {
      const { container } = render(<ProgressBar progress={NaN} />);

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('handles undefined progress as 0', () => {
      render(<ProgressBar progress={undefined as unknown as number} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Multiple Sizes', () => {
    it('renders different sizes correctly', () => {
      const { container: small } = render(
        <ProgressBar progress={50} size="sm" />
      );
      const { container: medium } = render(
        <ProgressBar progress={50} size="md" />
      );
      const { container: large } = render(
        <ProgressBar progress={50} size="lg" />
      );

      expect(small.querySelector('.h-1')).toBeInTheDocument();
      expect(medium.querySelector('.h-1\\.5')).toBeInTheDocument();
      expect(large.querySelector('.h-2')).toBeInTheDocument();
    });
  });
});
