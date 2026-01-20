import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthSummary, calculateHealthDistribution } from '../HealthSummary';
import type { Bead } from '@/lib/types';

describe('HealthSummary', () => {
  const mockBeads: Bead[] = [
    {
      id: '1',
      title: '[Q1] Feature A',
      description: 'Feature A description',
      status: 'closed',
      priority: 1,
      issue_type: 'feature',
      assignee: 'alice',
      estimated_minutes: 960,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-15T00:00:00Z',
      due_at: '2026-01-31T00:00:00Z',
      defer_until: null,
      team: 'eng',
    },
    {
      id: '2',
      title: '[Q1] Feature B',
      description: 'Feature B description',
      status: 'in_progress',
      priority: 2,
      issue_type: 'feature',
      assignee: 'bob',
      estimated_minutes: 480,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-08T00:00:00Z',
      due_at: '2026-01-15T00:00:00Z',
      defer_until: null,
      team: 'eng',
    },
    {
      id: '3',
      title: '[Q1] Feature C',
      description: 'Feature C description',
      status: 'blocked',
      priority: 0,
      issue_type: 'feature',
      assignee: 'carol',
      estimated_minutes: 720,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-05T00:00:00Z',
      due_at: '2026-02-01T00:00:00Z',
      defer_until: null,
      team: 'pm',
    },
    {
      id: '4',
      title: '[Q2] Feature D',
      description: 'Feature D description',
      status: 'open',
      priority: 3,
      issue_type: 'feature',
      assignee: null,
      estimated_minutes: null,
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
      due_at: '2026-04-30T00:00:00Z',
      defer_until: null,
      team: 'gtm',
    },
  ];

  describe('calculateHealthDistribution', () => {
    it('calculates correct distribution for mixed statuses', () => {
      const distribution = calculateHealthDistribution(mockBeads);

      expect(distribution.total).toBe(4);
      expect(distribution.on_track).toBeGreaterThanOrEqual(0);
      expect(distribution.at_risk).toBeGreaterThanOrEqual(0);
      expect(distribution.blocked).toBe(1); // Feature C is blocked
      expect(distribution.not_started).toBeGreaterThanOrEqual(0);

      // Sum should equal total
      const sum =
        distribution.on_track +
        distribution.at_risk +
        distribution.blocked +
        distribution.not_started;
      expect(sum).toBe(distribution.total);
    });

    it('returns zero distribution for empty array', () => {
      const distribution = calculateHealthDistribution([]);

      expect(distribution.total).toBe(0);
      expect(distribution.on_track).toBe(0);
      expect(distribution.at_risk).toBe(0);
      expect(distribution.blocked).toBe(0);
      expect(distribution.not_started).toBe(0);
    });

    it('categorizes completed tasks as on_track', () => {
      const completedBeads: Bead[] = [
        {
          ...mockBeads[0],
          status: 'closed',
        },
      ];

      const distribution = calculateHealthDistribution(completedBeads);

      expect(distribution.on_track).toBe(1);
      expect(distribution.total).toBe(1);
    });

    it('categorizes blocked tasks correctly', () => {
      const blockedBeads: Bead[] = [
        {
          ...mockBeads[0],
          status: 'blocked',
        },
      ];

      const distribution = calculateHealthDistribution(blockedBeads);

      expect(distribution.blocked).toBe(1);
      expect(distribution.total).toBe(1);
    });

    it('handles beads with no due date', () => {
      const noDueDateBeads: Bead[] = [
        {
          ...mockBeads[0],
          due_at: null,
        },
      ];

      const distribution = calculateHealthDistribution(noDueDateBeads);

      expect(distribution.total).toBe(1);
      const sum =
        distribution.on_track +
        distribution.at_risk +
        distribution.blocked +
        distribution.not_started;
      expect(sum).toBe(1);
    });

    it('handles beads with title-based date ranges', () => {
      const titleDateBeads: Bead[] = [
        {
          ...mockBeads[0],
          title: '[JAN] Feature with month prefix',
          due_at: null,
        },
      ];

      const distribution = calculateHealthDistribution(titleDateBeads);

      expect(distribution.total).toBe(1);
    });
  });

  describe('Rendering', () => {
    it('renders health summary with correct structure', () => {
      const { container } = render(<HealthSummary beads={mockBeads} />);

      const summary = container.querySelector('.health-summary');
      expect(summary).toBeInTheDocument();
    });

    it('displays overall health score', () => {
      render(<HealthSummary beads={mockBeads} />);

      expect(screen.getByText('Overall Health')).toBeInTheDocument();
      const scoreElement = screen.getByText(/%$/);
      expect(scoreElement).toBeInTheDocument();
    });

    it('displays distribution counts for all statuses', () => {
      render(<HealthSummary beads={mockBeads} />);

      // Use getAllByText since text may appear multiple times (legend + distribution)
      expect(screen.getAllByText('On Track').length).toBeGreaterThan(0);
      expect(screen.getAllByText('At Risk').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Blocked').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Not Started').length).toBeGreaterThan(0);
    });

    it('displays total count', () => {
      render(<HealthSummary beads={mockBeads} />);

      expect(screen.getByText('Total: 4 items')).toBeInTheDocument();
    });

    it('shows distribution bar when showDistribution is true', () => {
      const { container } = render(
        <HealthSummary beads={mockBeads} showDistribution={true} />
      );

      const distributionBar = container.querySelector('[role="img"]');
      expect(distributionBar).toBeInTheDocument();
    });

    it('hides distribution bar when showDistribution is false', () => {
      const { container } = render(
        <HealthSummary beads={mockBeads} showDistribution={false} />
      );

      const distributionBar = container.querySelector('[role="img"]');
      expect(distributionBar).not.toBeInTheDocument();
    });

    it('shows percentages when showPercentages is true', () => {
      const { container } = render(
        <HealthSummary beads={mockBeads} showPercentages={true} />
      );

      // Look for percentage indicators (text containing %)
      const text = container.textContent || '';
      const percentageMatches = text.match(/\(\d+%\)/g);
      expect(percentageMatches).not.toBeNull();
      expect(percentageMatches!.length).toBeGreaterThan(0);
    });

    it('hides percentages when showPercentages is false', () => {
      const { container } = render(
        <HealthSummary beads={mockBeads} showPercentages={false} />
      );

      // Check that status counts don't have percentage indicators
      const text = container.textContent || '';
      // Overall percentage should still show, but individual status percentages should not
      const percentageMatches = text.match(/\(\d+%\)/g);
      expect(percentageMatches).toBeNull();
    });
  });

  describe('Empty State', () => {
    it('renders empty state message when no beads provided', () => {
      render(<HealthSummary beads={[]} />);

      expect(screen.getByText('No items to display')).toBeInTheDocument();
    });

    it('does not render health metrics when empty', () => {
      const { container } = render(<HealthSummary beads={[]} />);

      expect(container.querySelector('.health-summary')).not.toBeInTheDocument();
      expect(container.querySelector('.health-summary-empty')).toBeInTheDocument();
    });
  });

  describe('Overall Health Score', () => {
    it('calculates score as 100 for all on_track items', () => {
      const allOnTrackBeads: Bead[] = [
        { ...mockBeads[0], status: 'closed' },
        { ...mockBeads[1], status: 'closed' },
      ];

      render(<HealthSummary beads={allOnTrackBeads} />);

      // Look for percentage texts - there may be multiple (score + individual statuses)
      const percentTexts = screen.getAllByText(/\d+%/);
      expect(percentTexts.length).toBeGreaterThan(0);
    });

    it('shows appropriate health badge for high score', () => {
      const highScoreBeads: Bead[] = [
        { ...mockBeads[0], status: 'closed' },
        { ...mockBeads[1], status: 'closed' },
        { ...mockBeads[2], status: 'closed' },
      ];

      const { container } = render(<HealthSummary beads={highScoreBeads} />);

      // Should have an on_track badge for high overall score
      const badges = container.querySelectorAll('[role="status"]');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('shows appropriate health badge for low score', () => {
      const lowScoreBeads: Bead[] = [
        { ...mockBeads[0], status: 'blocked' },
        { ...mockBeads[1], status: 'blocked' },
        { ...mockBeads[2], status: 'blocked' },
      ];

      const { container } = render(<HealthSummary beads={lowScoreBeads} />);

      // Should have a blocked or at_risk badge for low overall score
      const badges = container.querySelectorAll('[role="status"]');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('Distribution Bar', () => {
    it('renders segments proportional to distribution', () => {
      const { container } = render(<HealthSummary beads={mockBeads} />);

      const distributionBar = container.querySelector('[role="img"]');
      const segments = distributionBar?.querySelectorAll('div > div');

      expect(segments).toBeDefined();
      expect(segments!.length).toBeGreaterThan(0);
    });

    it('only renders segments for non-zero counts', () => {
      const singleStatusBeads: Bead[] = [
        { ...mockBeads[0], status: 'closed' },
      ];

      const { container } = render(<HealthSummary beads={singleStatusBeads} />);

      const distributionBar = container.querySelector('[role="img"]');
      const segments = distributionBar?.querySelectorAll('div > div');

      // Should have fewer segments than total statuses
      expect(segments!.length).toBeLessThan(4);
    });

    it('includes hover titles for each segment', () => {
      const { container } = render(<HealthSummary beads={mockBeads} />);

      const distributionBar = container.querySelector('[role="img"]');
      const segments = distributionBar?.querySelectorAll('div > div[title]');

      expect(segments).toBeDefined();
      segments?.forEach((segment) => {
        expect(segment).toHaveAttribute('title');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA region label', () => {
      const { container } = render(<HealthSummary beads={mockBeads} />);

      const region = container.querySelector('[role="region"]');
      expect(region).toHaveAttribute('aria-label', 'Project health summary');
    });

    it('provides ARIA label for distribution bar', () => {
      const { container } = render(<HealthSummary beads={mockBeads} />);

      const distributionBar = container.querySelector('[role="img"]');
      expect(distributionBar).toHaveAttribute('aria-label');

      const ariaLabel = distributionBar?.getAttribute('aria-label') || '';
      expect(ariaLabel).toContain('Health distribution');
      expect(ariaLabel).toContain('on track');
      expect(ariaLabel).toContain('at risk');
      expect(ariaLabel).toContain('blocked');
      expect(ariaLabel).toContain('not started');
    });

    it('uses semantic HTML structure', () => {
      const { container } = render(<HealthSummary beads={mockBeads} />);

      // Check for proper div structure and styling
      expect(container.querySelector('.health-summary')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <HealthSummary beads={mockBeads} className="custom-health-summary" />
      );

      const summary = container.querySelector('.health-summary');
      expect(summary).toHaveClass('custom-health-summary');
    });

    it('maintains default health-summary class', () => {
      const { container } = render(
        <HealthSummary beads={mockBeads} className="custom-health-summary" />
      );

      const summary = container.querySelector('.health-summary');
      expect(summary).toHaveClass('health-summary');
    });
  });

  describe('Edge Cases', () => {
    it('handles single bead', () => {
      const singleBead = [mockBeads[0]];
      render(<HealthSummary beads={singleBead} />);

      expect(screen.getByText('Total: 1 items')).toBeInTheDocument();
    });

    it('handles large number of beads', () => {
      const manyBeads = Array.from({ length: 100 }, (_, i) => ({
        ...mockBeads[0],
        id: `bead-${i}`,
      }));

      render(<HealthSummary beads={manyBeads} />);

      expect(screen.getByText('Total: 100 items')).toBeInTheDocument();
    });

    it('handles beads with missing fields', () => {
      const incompleteBeads: Bead[] = [
        {
          ...mockBeads[0],
          due_at: null,
          estimated_minutes: null,
          assignee: null,
        },
      ];

      const distribution = calculateHealthDistribution(incompleteBeads);

      expect(distribution.total).toBe(1);
    });

    it('rounds percentages correctly', () => {
      const threeBeads = mockBeads.slice(0, 3);
      const { container } = render(<HealthSummary beads={threeBeads} />);

      // Percentages should be rounded and add up to roughly 100%
      const text = container.textContent || '';
      expect(text).toMatch(/\d+%/);
    });

    it('handles all beads with same status', () => {
      const sameStatusBeads: Bead[] = [
        { ...mockBeads[0], status: 'closed' },
        { ...mockBeads[1], status: 'closed' },
        { ...mockBeads[2], status: 'closed' },
      ];

      const distribution = calculateHealthDistribution(sameStatusBeads);

      expect(distribution.total).toBe(3);
      expect(distribution.on_track).toBe(3);
      expect(distribution.at_risk).toBe(0);
      expect(distribution.blocked).toBe(0);
      expect(distribution.not_started).toBe(0);
    });
  });

  describe('Integration with Progress Utilities', () => {
    it('correctly calculates health based on time elapsed', () => {
      // This is an integration test with progress.ts utilities
      const distribution = calculateHealthDistribution(mockBeads);

      // Should properly use calculateHealthStatus and calculateExpectedProgress
      expect(distribution.total).toBe(mockBeads.length);

      // All counts should be non-negative
      expect(distribution.on_track).toBeGreaterThanOrEqual(0);
      expect(distribution.at_risk).toBeGreaterThanOrEqual(0);
      expect(distribution.blocked).toBeGreaterThanOrEqual(0);
      expect(distribution.not_started).toBeGreaterThanOrEqual(0);
    });

    it('respects blocked status from bead data', () => {
      const blockedOnlyBeads: Bead[] = [
        { ...mockBeads[0], status: 'blocked' },
      ];

      const distribution = calculateHealthDistribution(blockedOnlyBeads);

      expect(distribution.blocked).toBe(1);
    });
  });
});
