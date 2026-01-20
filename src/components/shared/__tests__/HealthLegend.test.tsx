import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthLegend, HealthLegendTooltip } from '../HealthLegend';

describe('HealthLegend', () => {
  describe('Rendering', () => {
    it('renders all health status items', () => {
      render(<HealthLegend />);

      expect(screen.getByText('On Track')).toBeInTheDocument();
      expect(screen.getByText('At Risk')).toBeInTheDocument();
      expect(screen.getByText('Blocked')).toBeInTheDocument();
      expect(screen.getByText('Not Started')).toBeInTheDocument();
    });

    it('renders color indicators for each status', () => {
      const { container } = render(<HealthLegend />);

      const indicators = container.querySelectorAll('[style*="border-radius: 50%"]');
      expect(indicators.length).toBe(4);
    });

    it('renders with correct structure', () => {
      const { container } = render(<HealthLegend />);

      const legend = container.querySelector('.health-legend');
      expect(legend).toBeInTheDocument();

      const items = container.querySelectorAll('.health-legend-item');
      expect(items.length).toBe(4);
    });
  });

  describe('Compact Mode', () => {
    it('renders in compact mode when compact prop is true', () => {
      const { container } = render(<HealthLegend compact={true} />);

      const legend = container.querySelector('.health-legend');
      expect(legend).toHaveStyle({ gap: '12px' });
    });

    it('uses smaller indicators in compact mode', () => {
      const { container } = render(<HealthLegend compact={true} />);

      const indicators = container.querySelectorAll('[style*="border-radius: 50%"]');
      indicators.forEach((indicator) => {
        expect(indicator).toHaveStyle({
          width: '12px',
          height: '12px',
        });
      });
    });

    it('uses smaller font size in compact mode', () => {
      const { container } = render(<HealthLegend compact={true} />);

      const labels = container.querySelectorAll('.health-legend-item span:first-of-type');
      labels.forEach((label) => {
        expect(label).toHaveStyle({ fontSize: '11px' });
      });
    });

    it('does not show descriptions in compact mode', () => {
      render(<HealthLegend compact={true} />);

      expect(screen.queryByText(/Progress meets or exceeds/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Progress is 10%\+ behind/i)).not.toBeInTheDocument();
    });
  });

  describe('Full Mode', () => {
    it('uses larger indicators in full mode', () => {
      const { container } = render(<HealthLegend compact={false} />);

      const indicators = container.querySelectorAll('[style*="border-radius: 50%"]');
      indicators.forEach((indicator) => {
        expect(indicator).toHaveStyle({
          width: '16px',
          height: '16px',
        });
      });
    });

    it('shows icons in indicators in full mode', () => {
      const { container } = render(<HealthLegend compact={false} />);

      const indicators = container.querySelectorAll('[style*="border-radius: 50%"]');
      expect(indicators[0]).toHaveTextContent('●'); // on_track
      expect(indicators[1]).toHaveTextContent('⚠'); // at_risk
      expect(indicators[2]).toHaveTextContent('✕'); // blocked
      expect(indicators[3]).toHaveTextContent('○'); // not_started
    });
  });

  describe('Orientation', () => {
    it('renders horizontally by default', () => {
      const { container } = render(<HealthLegend />);

      const legend = container.querySelector('.health-legend');
      expect(legend).toHaveStyle({
        display: 'flex',
        flexWrap: 'wrap',
      });
    });

    it('renders horizontally when orientation is horizontal', () => {
      const { container } = render(<HealthLegend orientation="horizontal" />);

      const legend = container.querySelector('.health-legend');
      expect(legend).toHaveStyle({
        display: 'flex',
        flexWrap: 'wrap',
      });
    });

    it('renders vertically when orientation is vertical', () => {
      const { container } = render(<HealthLegend orientation="vertical" />);

      const legend = container.querySelector('.health-legend');
      expect(legend).toHaveStyle({
        display: 'flex',
        flexDirection: 'column',
      });
    });

    it('shows descriptions in vertical orientation', () => {
      const { container } = render(<HealthLegend orientation="vertical" compact={false} />);

      const descriptions = container.querySelectorAll('span[style*="display: block"]');
      expect(descriptions.length).toBeGreaterThan(0);
    });

    it('hides descriptions in horizontal orientation', () => {
      const { container } = render(<HealthLegend orientation="horizontal" compact={false} />);

      const descriptions = container.querySelectorAll('span[style*="display: none"]');
      expect(descriptions.length).toBeGreaterThan(0);
    });
  });

  describe('Status Colors', () => {
    it('renders on_track with green color', () => {
      const { container } = render(<HealthLegend />);

      const indicators = container.querySelectorAll('[style*="border-radius: 50%"]');
      expect(indicators[0]).toHaveStyle({ backgroundColor: '#22c55e' });
    });

    it('renders at_risk with yellow color', () => {
      const { container } = render(<HealthLegend />);

      const indicators = container.querySelectorAll('[style*="border-radius: 50%"]');
      expect(indicators[1]).toHaveStyle({ backgroundColor: '#eab308' });
    });

    it('renders blocked with red color', () => {
      const { container } = render(<HealthLegend />);

      const indicators = container.querySelectorAll('[style*="border-radius: 50%"]');
      expect(indicators[2]).toHaveStyle({ backgroundColor: '#ef4444' });
    });

    it('renders not_started with gray color', () => {
      const { container } = render(<HealthLegend />);

      const indicators = container.querySelectorAll('[style*="border-radius: 50%"]');
      expect(indicators[3]).toHaveStyle({ backgroundColor: '#9ca3af' });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA list role', () => {
      const { container } = render(<HealthLegend />);

      const legend = container.querySelector('[role="list"]');
      expect(legend).toBeInTheDocument();
      expect(legend).toHaveAttribute('aria-label', 'Health status legend');
    });

    it('has listitem roles for each status', () => {
      const { container } = render(<HealthLegend />);

      const items = container.querySelectorAll('[role="listitem"]');
      expect(items.length).toBe(4);
    });

    it('includes descriptions in ARIA labels', () => {
      const { container } = render(<HealthLegend />);

      const items = container.querySelectorAll('[role="listitem"]');

      expect(items[0]).toHaveAttribute(
        'aria-label',
        'On Track: Progress meets or exceeds expected timeline'
      );
      expect(items[1]).toHaveAttribute(
        'aria-label',
        'At Risk: Progress is 10%+ behind expected timeline'
      );
      expect(items[2]).toHaveAttribute(
        'aria-label',
        'Blocked: Work is blocked by dependencies or issues'
      );
      expect(items[3]).toHaveAttribute(
        'aria-label',
        'Not Started: Work has not yet begun'
      );
    });

    it('shows title tooltips in full mode', () => {
      const { container } = render(<HealthLegend compact={false} />);

      const items = container.querySelectorAll('[role="listitem"]');
      items.forEach((item) => {
        expect(item).toHaveAttribute('title');
      });
    });

    it('does not show title tooltips in compact mode', () => {
      const { container } = render(<HealthLegend compact={true} />);

      const items = container.querySelectorAll('[role="listitem"]');
      items.forEach((item) => {
        expect(item).not.toHaveAttribute('title');
      });
    });

    it('hides decorative icons from screen readers', () => {
      const { container } = render(<HealthLegend />);

      const indicators = container.querySelectorAll('[aria-hidden="true"]');
      expect(indicators.length).toBe(4);
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(<HealthLegend className="custom-legend" />);

      const legend = container.querySelector('.health-legend');
      expect(legend).toHaveClass('custom-legend');
    });

    it('maintains default health-legend class', () => {
      const { container } = render(<HealthLegend className="custom-legend" />);

      const legend = container.querySelector('.health-legend');
      expect(legend).toHaveClass('health-legend');
      expect(legend).toHaveClass('custom-legend');
    });
  });

  describe('Combined Props', () => {
    it('handles compact vertical orientation', () => {
      const { container } = render(<HealthLegend compact={true} orientation="vertical" />);

      const legend = container.querySelector('.health-legend');
      expect(legend).toHaveStyle({
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      });
    });

    it('handles full horizontal orientation', () => {
      const { container } = render(<HealthLegend compact={false} orientation="horizontal" />);

      const legend = container.querySelector('.health-legend');
      expect(legend).toHaveStyle({
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
      });
    });
  });
});

describe('HealthLegendTooltip', () => {
  describe('Rendering', () => {
    it('renders tooltip for on_track status', () => {
      render(<HealthLegendTooltip status="on_track" />);

      expect(screen.getByText('On Track')).toBeInTheDocument();
      expect(screen.getByText(/Progress meets or exceeds expected timeline/i)).toBeInTheDocument();
    });

    it('renders tooltip for at_risk status', () => {
      render(<HealthLegendTooltip status="at_risk" />);

      expect(screen.getByText('At Risk')).toBeInTheDocument();
      expect(screen.getByText(/Progress is 10%\+ behind expected timeline/i)).toBeInTheDocument();
    });

    it('renders tooltip for blocked status', () => {
      render(<HealthLegendTooltip status="blocked" />);

      expect(screen.getByText('Blocked')).toBeInTheDocument();
      expect(screen.getByText(/Work is blocked by dependencies or issues/i)).toBeInTheDocument();
    });

    it('renders tooltip for not_started status', () => {
      render(<HealthLegendTooltip status="not_started" />);

      expect(screen.getByText('Not Started')).toBeInTheDocument();
      expect(screen.getByText(/Work has not yet begun/i)).toBeInTheDocument();
    });
  });

  describe('Icon Display', () => {
    it('shows icon by default', () => {
      const { container } = render(<HealthLegendTooltip status="on_track" />);

      const icon = container.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('●');
    });

    it('shows icon when showIcon is true', () => {
      const { container } = render(<HealthLegendTooltip status="at_risk" showIcon={true} />);

      const icon = container.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('⚠');
    });

    it('hides icon when showIcon is false', () => {
      const { container } = render(<HealthLegendTooltip status="blocked" showIcon={false} />);

      const icon = container.querySelector('[aria-hidden="true"]');
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe('Status-Specific Styling', () => {
    // Browser converts hex colors to RGB format in computed styles
    it('uses correct color for on_track', () => {
      const { container } = render(<HealthLegendTooltip status="on_track" />);

      const tooltip = container.querySelector('.health-legend-tooltip') as HTMLElement;
      // #22c55e = rgb(34, 197, 94)
      expect(tooltip?.style.border).toContain('rgb(34, 197, 94)');
    });

    it('uses correct color for at_risk', () => {
      const { container } = render(<HealthLegendTooltip status="at_risk" />);

      const tooltip = container.querySelector('.health-legend-tooltip') as HTMLElement;
      // #eab308 = rgb(234, 179, 8)
      expect(tooltip?.style.border).toContain('rgb(234, 179, 8)');
    });

    it('uses correct color for blocked', () => {
      const { container } = render(<HealthLegendTooltip status="blocked" />);

      const tooltip = container.querySelector('.health-legend-tooltip') as HTMLElement;
      // #ef4444 = rgb(239, 68, 68)
      expect(tooltip?.style.border).toContain('rgb(239, 68, 68)');
    });

    it('uses correct color for not_started', () => {
      const { container } = render(<HealthLegendTooltip status="not_started" />);

      const tooltip = container.querySelector('.health-legend-tooltip') as HTMLElement;
      // #9ca3af = rgb(156, 163, 175)
      expect(tooltip?.style.border).toContain('rgb(156, 163, 175)');
    });
  });

  describe('Accessibility', () => {
    it('has tooltip role', () => {
      const { container } = render(<HealthLegendTooltip status="on_track" />);

      const tooltip = container.querySelector('[role="tooltip"]');
      expect(tooltip).toBeInTheDocument();
    });

    it('hides decorative icon from screen readers', () => {
      const { container } = render(<HealthLegendTooltip status="on_track" />);

      const icon = container.querySelector('[aria-hidden="true"]');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <HealthLegendTooltip status="on_track" className="custom-tooltip" />
      );

      const tooltip = container.querySelector('.health-legend-tooltip');
      expect(tooltip).toHaveClass('custom-tooltip');
    });

    it('maintains default class', () => {
      const { container } = render(
        <HealthLegendTooltip status="on_track" className="custom-tooltip" />
      );

      const tooltip = container.querySelector('.health-legend-tooltip');
      expect(tooltip).toHaveClass('health-legend-tooltip');
      expect(tooltip).toHaveClass('custom-tooltip');
    });
  });
});
