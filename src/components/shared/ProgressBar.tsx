"use client";

import { type HealthStatus } from '@/lib/progress';

export type ProgressBarSize = 'sm' | 'md' | 'lg';

export interface ProgressBarProps {
  progress: number;
  size?: ProgressBarSize;
  showLabel?: boolean;
  status?: HealthStatus;
  className?: string;
}

/**
 * ProgressBar Component
 *
 * Displays a horizontal progress bar with optional label.
 * Colors are based on health status from the design system.
 *
 * Sizes:
 * - sm: 4px height (tasks, compact)
 * - md: 6px height (features, default)
 * - lg: 8px height (epics)
 *
 * Colors:
 * - on_track: accent blue
 * - at_risk: warning yellow
 * - blocked: danger red
 * - not_started: border gray
 */
export function ProgressBar({
  progress,
  size = 'md',
  showLabel = true,
  status = 'on_track',
  className = '',
}: ProgressBarProps) {
  const normalizedProgress = Math.max(0, Math.min(100, isNaN(progress) ? 0 : progress));

  const heightClass = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2',
  }[size];

  const fillColorClass = {
    on_track: 'bg-accent',
    at_risk: 'bg-warning',
    blocked: 'bg-danger',
    not_started: 'bg-border',
  }[status];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`relative w-full ${heightClass} rounded-full overflow-hidden`}
        style={{ backgroundColor: 'var(--border)' }}
        role="progressbar"
        aria-valuenow={normalizedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress: ${normalizedProgress} percent`}
      >
        {normalizedProgress > 0 && (
          <div
            className={`absolute left-0 top-0 h-full ${fillColorClass} transition-all duration-300 ease-out`}
            style={{ width: `${normalizedProgress}%` }}
          />
        )}
      </div>
      {showLabel && (
        <span
          className="text-xs font-semibold tabular-nums min-w-[36px] text-right"
          style={{ color: 'var(--fg)' }}
        >
          {Math.round(normalizedProgress)}%
        </span>
      )}
    </div>
  );
}
