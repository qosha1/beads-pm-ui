"use client";

import { useMemo } from 'react';
import type { Bead } from '@/lib/types';
import {
  calculateHealthStatus,
  calculateExpectedProgress,
  type HealthStatus,
} from '@/lib/progress';
import { HealthBadge } from './HealthBadge';
import { parseDateRangeFromTitle } from '@/lib/dates';
import { startOfDay, endOfDay } from 'date-fns';

export interface HealthSummaryProps {
  beads: Bead[];
  className?: string;
  showDistribution?: boolean;
  showPercentages?: boolean;
}

export interface HealthDistribution {
  on_track: number;
  at_risk: number;
  blocked: number;
  not_started: number;
  total: number;
}

/**
 * Calculate health distribution across all beads
 */
export function calculateHealthDistribution(beads: Bead[]): HealthDistribution {
  const distribution: HealthDistribution = {
    on_track: 0,
    at_risk: 0,
    blocked: 0,
    not_started: 0,
    total: beads.length,
  };

  const now = new Date();
  const currentYear = now.getFullYear();

  for (const bead of beads) {
    // Calculate actual progress based on status
    const progress =
      bead.status === 'closed' ? 100 : bead.status === 'in_progress' ? 50 : 0;

    // Determine date range
    let startDate: Date;
    let endDate: Date;

    const parsedRange = parseDateRangeFromTitle(bead.title, currentYear);
    if (parsedRange) {
      startDate = parsedRange.start;
      endDate = parsedRange.end;
    } else if (bead.due_at) {
      startDate = startOfDay(new Date(bead.created_at));
      endDate = endOfDay(new Date(bead.due_at));
    } else {
      startDate = startOfDay(new Date(bead.created_at));
      const estimatedDays = bead.estimated_minutes
        ? Math.ceil(bead.estimated_minutes / 480)
        : 14;
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + estimatedDays);
      endDate = endOfDay(endDate);
    }

    // Calculate expected progress
    const expectedProgress = calculateExpectedProgress(startDate, endDate, now);

    // Check for blockers
    const hasBlockers = bead.status === 'blocked';

    // Calculate health status
    const healthStatus = calculateHealthStatus(progress, expectedProgress, hasBlockers);

    // Increment appropriate counter
    distribution[healthStatus.status]++;
  }

  return distribution;
}

/**
 * HealthSummary Component
 *
 * Displays an aggregated health status summary across all provided beads.
 * Shows count and percentage distribution of each health status.
 *
 * Features:
 * - Color-coded horizontal distribution bar
 * - Individual status counts with badges
 * - Percentage breakdown
 * - Overall health score
 * - Responsive layout
 */
export function HealthSummary({
  beads,
  className = '',
  showDistribution = true,
  showPercentages = true,
}: HealthSummaryProps) {
  const distribution = useMemo(() => calculateHealthDistribution(beads), [beads]);

  const percentages = useMemo(() => {
    if (distribution.total === 0) {
      return {
        on_track: 0,
        at_risk: 0,
        blocked: 0,
        not_started: 0,
      };
    }

    return {
      on_track: Math.round((distribution.on_track / distribution.total) * 100),
      at_risk: Math.round((distribution.at_risk / distribution.total) * 100),
      blocked: Math.round((distribution.blocked / distribution.total) * 100),
      not_started: Math.round((distribution.not_started / distribution.total) * 100),
    };
  }, [distribution]);

  // Calculate overall health score (weighted average)
  // on_track = 100, at_risk = 50, blocked = 0, not_started = 25
  const overallScore = useMemo(() => {
    if (distribution.total === 0) return 0;

    const score =
      (distribution.on_track * 100 +
        distribution.at_risk * 50 +
        distribution.blocked * 0 +
        distribution.not_started * 25) /
      distribution.total;

    return Math.round(score);
  }, [distribution]);

  const getOverallHealthStatus = (score: number): HealthStatus => {
    if (score >= 75) return 'on_track';
    if (score >= 50) return 'at_risk';
    if (score >= 25) return 'not_started';
    return 'blocked';
  };

  if (distribution.total === 0) {
    return (
      <div
        className={`health-summary-empty ${className}`}
        style={{
          padding: '16px',
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: '14px',
        }}
      >
        No items to display
      </div>
    );
  }

  return (
    <div
      className={`health-summary ${className}`}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid #2a2a2a',
        borderRadius: '8px',
        padding: '16px',
      }}
      role="region"
      aria-label="Project health summary"
    >
      {/* Overall Score */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
            Overall Health
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#ededed',
            }}
          >
            {overallScore}%
          </div>
        </div>
        <HealthBadge status={getOverallHealthStatus(overallScore)} />
      </div>

      {/* Distribution Bar */}
      {showDistribution && (
        <div
          style={{
            marginBottom: '16px',
          }}
          role="img"
          aria-label={`Health distribution: ${percentages.on_track}% on track, ${percentages.at_risk}% at risk, ${percentages.blocked}% blocked, ${percentages.not_started}% not started`}
        >
          <div
            style={{
              display: 'flex',
              height: '8px',
              borderRadius: '4px',
              overflow: 'hidden',
              backgroundColor: '#2a2a2a',
            }}
          >
            {distribution.on_track > 0 && (
              <div
                style={{
                  width: `${percentages.on_track}%`,
                  backgroundColor: '#22c55e',
                  transition: 'width 300ms ease',
                }}
                title={`On Track: ${distribution.on_track} (${percentages.on_track}%)`}
              />
            )}
            {distribution.at_risk > 0 && (
              <div
                style={{
                  width: `${percentages.at_risk}%`,
                  backgroundColor: '#eab308',
                  transition: 'width 300ms ease',
                }}
                title={`At Risk: ${distribution.at_risk} (${percentages.at_risk}%)`}
              />
            )}
            {distribution.blocked > 0 && (
              <div
                style={{
                  width: `${percentages.blocked}%`,
                  backgroundColor: '#ef4444',
                  transition: 'width 300ms ease',
                }}
                title={`Blocked: ${distribution.blocked} (${percentages.blocked}%)`}
              />
            )}
            {distribution.not_started > 0 && (
              <div
                style={{
                  width: `${percentages.not_started}%`,
                  backgroundColor: '#9ca3af',
                  transition: 'width 300ms ease',
                }}
                title={`Not Started: ${distribution.not_started} (${percentages.not_started}%)`}
              />
            )}
          </div>
        </div>
      )}

      {/* Status Breakdown */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>On Track</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#ededed' }}>
              {distribution.on_track}
              {showPercentages && (
                <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '4px' }}>
                  ({percentages.on_track}%)
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#eab308',
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>At Risk</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#ededed' }}>
              {distribution.at_risk}
              {showPercentages && (
                <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '4px' }}>
                  ({percentages.at_risk}%)
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Blocked</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#ededed' }}>
              {distribution.blocked}
              {showPercentages && (
                <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '4px' }}>
                  ({percentages.blocked}%)
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#9ca3af',
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Not Started</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#ededed' }}>
              {distribution.not_started}
              {showPercentages && (
                <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '4px' }}>
                  ({percentages.not_started}%)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #2a2a2a',
          fontSize: '11px',
          color: '#9ca3af',
          textAlign: 'center',
        }}
      >
        Total: {distribution.total} items
      </div>
    </div>
  );
}
