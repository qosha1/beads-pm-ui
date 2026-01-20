"use client";

import { type HealthStatus } from '@/lib/progress';

export interface HealthBadgeProps {
  status: HealthStatus;
  compact?: boolean;
  className?: string;
}

const statusConfig: Record<
  HealthStatus,
  { label: string; icon: string; bgColor: string; textColor: string; borderColor: string }
> = {
  on_track: {
    label: 'On Track',
    icon: '●',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    textColor: '#22c55e',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  at_risk: {
    label: 'At Risk',
    icon: '⚠',
    bgColor: 'rgba(234, 179, 8, 0.15)',
    textColor: '#eab308',
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  blocked: {
    label: 'Blocked',
    icon: '✕',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    textColor: '#ef4444',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  not_started: {
    label: 'Not Started',
    icon: '○',
    bgColor: 'rgba(156, 163, 175, 0.1)',
    textColor: '#9ca3af',
    borderColor: 'rgba(156, 163, 175, 0.2)',
  },
};

/**
 * HealthBadge Component
 *
 * Displays a traffic-light style health status indicator.
 * Supports compact mode (icon only) for space-constrained layouts.
 *
 * Statuses:
 * - on_track: Green with checkmark
 * - at_risk: Yellow with warning
 * - blocked: Red with X
 * - not_started: Gray with empty circle
 */
export function HealthBadge({ status, compact = false, className = '' }: HealthBadgeProps) {
  const config = statusConfig[status];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${className}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        border: `1px solid ${config.borderColor}`,
      }}
      role="status"
      aria-live="polite"
      aria-label={`Health status: ${config.label}`}
    >
      <span className="text-sm leading-none" aria-hidden="true">
        {config.icon}
      </span>
      {!compact ? (
        <span className="leading-none whitespace-nowrap">{config.label}</span>
      ) : (
        <span className="sr-only">{config.label}</span>
      )}
    </div>
  );
}
