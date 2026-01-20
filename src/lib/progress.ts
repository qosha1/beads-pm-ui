/**
 * Progress Calculation and Health Status Utilities
 *
 * This module provides functions for calculating weighted progress rollups,
 * determining health status, and evaluating schedule adherence for tasks,
 * features, and epics in the dashboard.
 */

export type HealthStatus = 'on_track' | 'at_risk' | 'blocked' | 'not_started';
export type ScheduleStatus = 'ahead' | 'on_track' | 'behind' | 'overdue';

export interface ChildProgress {
  progress: number;
  weight: number;
}

export interface HealthStatusResult {
  status: HealthStatus;
  reason?: string;
}

export interface ScheduleStatusResult {
  status: ScheduleStatus;
  daysDelta: number;
}

/**
 * Calculate weighted progress from child items
 *
 * Formula: Sum(child_progress × child_weight) / Sum(weights)
 *
 * @param children - Array of child items with progress (0-100) and weight
 * @returns Weighted progress percentage (0-100), rounded to nearest integer
 *
 * @example
 * calculateWeightedProgress([
 *   { progress: 100, weight: 3 },
 *   { progress: 60, weight: 2 },
 *   { progress: 0, weight: 2 },
 *   { progress: 0, weight: 1 }
 * ]) // Returns 42
 */
export function calculateWeightedProgress(children: ChildProgress[]): number {
  if (!children || children.length === 0) {
    return 0;
  }

  const totalWeight = children.reduce((sum, child) => sum + child.weight, 0);

  if (totalWeight === 0) {
    return 0;
  }

  const weightedSum = children.reduce(
    (sum, child) => sum + (child.progress * child.weight),
    0
  );

  return Math.round(weightedSum / totalWeight);
}

/**
 * Calculate health status based on progress, expected progress, and blockers
 *
 * Rules:
 * - blocked: if hasBlockers is true
 * - not_started: if progress is 0 and expected progress > 0
 * - at_risk: if progress is more than 10% behind expected
 * - on_track: otherwise
 *
 * @param progress - Actual progress percentage (0-100)
 * @param expectedProgress - Expected progress based on time elapsed (0-100)
 * @param hasBlockers - Whether the task has active blockers
 * @returns Health status with reason
 *
 * @example
 * calculateHealthStatus(35, 50, false) // { status: 'at_risk', reason: 'Behind schedule' }
 * calculateHealthStatus(55, 50, false) // { status: 'on_track' }
 * calculateHealthStatus(0, 20, true) // { status: 'blocked', reason: 'Has active blockers' }
 */
export function calculateHealthStatus(
  progress: number,
  expectedProgress: number,
  hasBlockers: boolean
): HealthStatusResult {
  if (hasBlockers) {
    return {
      status: 'blocked',
      reason: 'Has active blockers'
    };
  }

  if (progress === 0 && expectedProgress > 0) {
    return {
      status: 'not_started',
      reason: 'Work has not started'
    };
  }

  const delta = progress - expectedProgress;

  if (delta < -10) {
    return {
      status: 'at_risk',
      reason: 'Behind schedule'
    };
  }

  return {
    status: 'on_track'
  };
}

/**
 * Calculate schedule status based on progress, time elapsed, and due date
 *
 * Rules:
 * - overdue: current date > due date AND progress < 100
 * - behind: time elapsed % > progress % + 15
 * - ahead: progress % > time elapsed % + 15
 * - on_track: otherwise
 *
 * @param progress - Actual progress percentage (0-100)
 * @param timeElapsedPercent - Percentage of time that has elapsed (0-100)
 * @param dueDate - Due date of the task
 * @param currentDate - Current date (defaults to now)
 * @returns Schedule status with days delta
 *
 * @example
 * const dueDate = new Date('2025-01-15');
 * const current = new Date('2025-01-16');
 * calculateScheduleStatus(50, 100, dueDate, current) // { status: 'overdue', daysDelta: -1 }
 *
 * calculateScheduleStatus(75, 50, dueDate, current) // { status: 'ahead', daysDelta: 25 }
 */
export function calculateScheduleStatus(
  progress: number,
  timeElapsedPercent: number,
  dueDate: Date,
  currentDate: Date = new Date()
): ScheduleStatusResult {
  const isOverdue = currentDate > dueDate && progress < 100;

  if (isOverdue) {
    const daysDelta = Math.floor((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return {
      status: 'overdue',
      daysDelta: -daysDelta
    };
  }

  const delta = progress - timeElapsedPercent;

  if (timeElapsedPercent > progress + 15) {
    return {
      status: 'behind',
      daysDelta: Math.round(delta)
    };
  }

  if (progress > timeElapsedPercent + 15) {
    return {
      status: 'ahead',
      daysDelta: Math.round(delta)
    };
  }

  return {
    status: 'on_track',
    daysDelta: Math.round(delta)
  };
}

/**
 * Calculate expected progress based on time elapsed
 *
 * @param startDate - Start date of the task
 * @param endDate - End date of the task
 * @param currentDate - Current date (defaults to now)
 * @returns Expected progress percentage (0-100)
 *
 * @example
 * const start = new Date('2025-01-01');
 * const end = new Date('2025-01-31');
 * const current = new Date('2025-01-16');
 * calculateExpectedProgress(start, end, current) // Returns ~50
 */
export function calculateExpectedProgress(
  startDate: Date,
  endDate: Date,
  currentDate: Date = new Date()
): number {
  if (currentDate <= startDate) {
    return 0;
  }

  if (currentDate >= endDate) {
    return 100;
  }

  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsed = currentDate.getTime() - startDate.getTime();

  return Math.round((elapsed / totalDuration) * 100);
}

/**
 * Get color class for health status (for styling)
 *
 * @param status - Health status
 * @returns CSS color class name
 */
export function getHealthColor(status: HealthStatus): string {
  const colors: Record<HealthStatus, string> = {
    on_track: 'health-green',
    at_risk: 'health-yellow',
    blocked: 'health-red',
    not_started: 'health-gray'
  };

  return colors[status];
}

/**
 * Get color class for schedule status (for styling)
 *
 * @param status - Schedule status
 * @returns CSS color class name
 */
export function getScheduleColor(status: ScheduleStatus): string {
  const colors: Record<ScheduleStatus, string> = {
    ahead: 'schedule-green',
    on_track: 'schedule-gray',
    behind: 'schedule-yellow',
    overdue: 'schedule-red'
  };

  return colors[status];
}
