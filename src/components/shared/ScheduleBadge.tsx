"use client";

import { type ScheduleStatus } from '@/lib/progress';

export interface ScheduleBadgeProps {
  status: ScheduleStatus;
  daysDelta?: number;
  compact?: boolean;
  className?: string;
}

const statusConfig: Record<
  ScheduleStatus,
  { label: string; icon: string; bgColor: string; textColor: string; borderColor: string }
> = {
  ahead: {
    label: 'Ahead',
    icon: '≫',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    textColor: '#22c55e',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  on_track: {
    label: 'On Track',
    icon: '–',
    bgColor: 'rgba(156, 163, 175, 0.1)',
    textColor: '#9ca3af',
    borderColor: 'rgba(156, 163, 175, 0.2)',
  },
  behind: {
    label: 'Behind',
    icon: '‼',
    bgColor: 'rgba(234, 179, 8, 0.15)',
    textColor: '#eab308',
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  overdue: {
    label: 'Overdue',
    icon: '✕✕',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    textColor: '#ef4444',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
};

/**
 * ScheduleBadge Component
 *
 * Displays schedule adherence status with optional days delta.
 * Shows whether a task is ahead, on track, behind, or overdue.
 *
 * Statuses:
 * - ahead: Green with double chevron right
 * - on_track: Gray with horizontal line
 * - behind: Yellow with double exclamation
 * - overdue: Red with double X
 *
 * daysDelta:
 * - Positive: days ahead of schedule
 * - Negative: days behind schedule
 */
export function ScheduleBadge({
  status,
  daysDelta,
  compact = false,
  className = '',
}: ScheduleBadgeProps) {
  const config = statusConfig[status];

  const formatDelta = () => {
    if (daysDelta === undefined || daysDelta === 0) return null;

    const days = Math.abs(daysDelta);
    const prefix = daysDelta > 0 ? '+' : '';
    return `${prefix}${days}d`;
  };

  const deltaText = formatDelta();

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
      aria-label={`Schedule: ${config.label}${deltaText ? ` ${deltaText}` : ''}`}
    >
      <span className="text-sm leading-none" aria-hidden="true">
        {config.icon}
      </span>
      {!compact ? (
        <>
          <span className="leading-none whitespace-nowrap">{config.label}</span>
          {deltaText && (
            <span className="leading-none font-mono text-xs opacity-90">
              {deltaText}
            </span>
          )}
        </>
      ) : (
        <span className="sr-only">
          {config.label}
          {deltaText ? ` ${deltaText}` : ''}
        </span>
      )}
    </div>
  );
}
