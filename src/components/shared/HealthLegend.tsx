"use client";

import type { HealthStatus } from '@/lib/progress';

export interface HealthLegendProps {
  compact?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

const healthStatusInfo: Record<
  HealthStatus,
  { label: string; color: string; icon: string; description: string }
> = {
  on_track: {
    label: 'On Track',
    color: '#22c55e',
    icon: '●',
    description: 'Progress meets or exceeds expected timeline',
  },
  at_risk: {
    label: 'At Risk',
    color: '#eab308',
    icon: '⚠',
    description: 'Progress is 10%+ behind expected timeline',
  },
  blocked: {
    label: 'Blocked',
    color: '#ef4444',
    icon: '✕',
    description: 'Work is blocked by dependencies or issues',
  },
  not_started: {
    label: 'Not Started',
    color: '#9ca3af',
    icon: '○',
    description: 'Work has not yet begun',
  },
};

/**
 * HealthLegend Component
 *
 * Displays a legend explaining the RAG (Red/Amber/Green) health status colors.
 * Provides visual reference for understanding health indicators throughout the dashboard.
 *
 * Features:
 * - Compact and full display modes
 * - Horizontal and vertical orientations
 * - Color indicators with labels
 * - Tooltips with detailed descriptions
 * - Accessibility support
 */
export function HealthLegend({
  compact = false,
  orientation = 'horizontal',
  className = '',
}: HealthLegendProps) {
  const statuses: HealthStatus[] = ['on_track', 'at_risk', 'blocked', 'not_started'];

  const containerStyle =
    orientation === 'horizontal'
      ? {
          display: 'flex',
          flexWrap: 'wrap' as const,
          gap: compact ? '12px' : '16px',
          alignItems: 'center',
        }
      : {
          display: 'flex',
          flexDirection: 'column' as const,
          gap: compact ? '8px' : '12px',
        };

  return (
    <div
      className={`health-legend ${className}`}
      style={containerStyle}
      role="list"
      aria-label="Health status legend"
    >
      {statuses.map((status) => {
        const info = healthStatusInfo[status];

        return (
          <div
            key={status}
            className="health-legend-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            role="listitem"
            title={!compact ? info.description : undefined}
            aria-label={`${info.label}: ${info.description}`}
          >
            {/* Color indicator */}
            <div
              style={{
                width: compact ? '12px' : '16px',
                height: compact ? '12px' : '16px',
                borderRadius: '50%',
                backgroundColor: info.color,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: compact ? '8px' : '10px',
                color: '#0a0a0a',
                fontWeight: 700,
              }}
              aria-hidden="true"
            >
              {compact ? '' : info.icon}
            </div>

            {/* Label */}
            <span
              style={{
                fontSize: compact ? '11px' : '12px',
                color: '#ededed',
                fontWeight: compact ? 500 : 600,
                whiteSpace: 'nowrap',
              }}
            >
              {info.label}
            </span>

            {/* Description (only in non-compact mode) */}
            {!compact && (
              <span
                style={{
                  fontSize: '11px',
                  color: '#9ca3af',
                  display: orientation === 'vertical' ? 'block' : 'none',
                  marginLeft: '24px',
                  maxWidth: '280px',
                }}
              >
                {info.description}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export interface HealthLegendTooltipProps {
  status: HealthStatus;
  showIcon?: boolean;
  className?: string;
}

/**
 * HealthLegendTooltip Component
 *
 * Individual tooltip-style legend item for a specific health status.
 * Useful for inline help text or hover popovers.
 */
export function HealthLegendTooltip({
  status,
  showIcon = true,
  className = '',
}: HealthLegendTooltipProps) {
  const info = healthStatusInfo[status];

  return (
    <div
      className={`health-legend-tooltip ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        backgroundColor: 'rgba(26, 26, 26, 0.95)',
        border: `1px solid ${info.color}`,
        borderRadius: '4px',
        fontSize: '11px',
      }}
      role="tooltip"
    >
      {showIcon && (
        <span
          style={{
            color: info.color,
            fontSize: '12px',
            fontWeight: 700,
          }}
          aria-hidden="true"
        >
          {info.icon}
        </span>
      )}
      <span style={{ color: '#ededed', fontWeight: 600 }}>{info.label}</span>
      <span style={{ color: '#9ca3af' }}>{info.description}</span>
    </div>
  );
}
