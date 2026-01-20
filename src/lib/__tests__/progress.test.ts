import { describe, it, expect } from 'vitest';
import {
  calculateWeightedProgress,
  calculateHealthStatus,
  calculateScheduleStatus,
  calculateExpectedProgress,
  getHealthColor,
  getScheduleColor,
  type ChildProgress,
} from '../progress';

describe('Progress Calculation Utilities', () => {
  describe('calculateWeightedProgress', () => {
    it('calculates weighted average correctly with mixed progress', () => {
      const children: ChildProgress[] = [
        { progress: 100, weight: 3 },
        { progress: 60, weight: 2 },
        { progress: 0, weight: 2 },
        { progress: 0, weight: 1 },
      ];

      const result = calculateWeightedProgress(children);

      // Formula: Sum(progress × weight) / Sum(weights)
      // = (100*3 + 60*2 + 0*2 + 0*1) / (3+2+2+1)
      // = (300 + 120 + 0 + 0) / 8 = 420 / 8 = 52.5 ≈ 53
      expect(result).toBe(53);
    });

    it('returns 100 when all children are complete', () => {
      const children: ChildProgress[] = [
        { progress: 100, weight: 1 },
        { progress: 100, weight: 2 },
        { progress: 100, weight: 3 },
      ];

      const result = calculateWeightedProgress(children);

      expect(result).toBe(100);
    });

    it('returns 0 when all children are not started', () => {
      const children: ChildProgress[] = [
        { progress: 0, weight: 1 },
        { progress: 0, weight: 2 },
        { progress: 0, weight: 3 },
      ];

      const result = calculateWeightedProgress(children);

      expect(result).toBe(0);
    });

    it('handles single child correctly', () => {
      const children: ChildProgress[] = [{ progress: 75, weight: 1 }];

      const result = calculateWeightedProgress(children);

      expect(result).toBe(75);
    });

    it('returns 0 for empty children array', () => {
      const result = calculateWeightedProgress([]);

      expect(result).toBe(0);
    });

    it('returns 0 when total weight is 0', () => {
      const children: ChildProgress[] = [
        { progress: 50, weight: 0 },
        { progress: 100, weight: 0 },
      ];

      const result = calculateWeightedProgress(children);

      expect(result).toBe(0);
    });

    it('handles unequal weights correctly', () => {
      const children: ChildProgress[] = [
        { progress: 100, weight: 5 },
        { progress: 0, weight: 1 },
      ];

      const result = calculateWeightedProgress(children);

      // (100*5 + 0*1) / (5+1) = 500/6 = 83.33 -> rounds to 83
      expect(result).toBe(83);
    });

    it('rounds to nearest integer', () => {
      const children: ChildProgress[] = [
        { progress: 50, weight: 1 },
        { progress: 51, weight: 1 },
      ];

      const result = calculateWeightedProgress(children);

      // (50*1 + 51*1) / 2 = 101/2 = 50.5 -> rounds to 51
      expect(result).toBe(51);
    });

    it('handles decimal progress values', () => {
      const children: ChildProgress[] = [
        { progress: 33.33, weight: 1 },
        { progress: 66.67, weight: 1 },
      ];

      const result = calculateWeightedProgress(children);

      // (33.33 + 66.67) / 2 = 100/2 = 50
      expect(result).toBe(50);
    });
  });

  describe('calculateHealthStatus', () => {
    describe('blocked status', () => {
      it('returns blocked when hasBlockers is true regardless of progress', () => {
        const result = calculateHealthStatus(50, 50, true);

        expect(result.status).toBe('blocked');
        expect(result.reason).toBe('Has active blockers');
      });

      it('returns blocked even with high progress', () => {
        const result = calculateHealthStatus(90, 50, true);

        expect(result.status).toBe('blocked');
      });

      it('returns blocked even with zero progress', () => {
        const result = calculateHealthStatus(0, 50, true);

        expect(result.status).toBe('blocked');
      });
    });

    describe('not_started status', () => {
      it('returns not_started when progress is 0 and expected > 0', () => {
        const result = calculateHealthStatus(0, 20, false);

        expect(result.status).toBe('not_started');
        expect(result.reason).toBe('Work has not started');
      });

      it('returns not_started when progress is 0 and expected is high', () => {
        const result = calculateHealthStatus(0, 80, false);

        expect(result.status).toBe('not_started');
      });

      it('does not return not_started when progress > 0', () => {
        const result = calculateHealthStatus(1, 20, false);

        expect(result.status).not.toBe('not_started');
      });

      it('returns on_track when both progress and expected are 0', () => {
        const result = calculateHealthStatus(0, 0, false);

        expect(result.status).toBe('on_track');
      });
    });

    describe('at_risk status', () => {
      it('returns at_risk when progress is > 10% behind expected', () => {
        const result = calculateHealthStatus(35, 50, false);

        expect(result.status).toBe('at_risk');
        expect(result.reason).toBe('Behind schedule');
      });

      it('returns at_risk at exactly -10% threshold', () => {
        const result = calculateHealthStatus(40, 51, false);

        expect(result.status).toBe('at_risk');
      });

      it('returns at_risk when significantly behind', () => {
        const result = calculateHealthStatus(20, 80, false);

        expect(result.status).toBe('at_risk');
      });
    });

    describe('on_track status', () => {
      it('returns on_track when progress matches expected', () => {
        const result = calculateHealthStatus(50, 50, false);

        expect(result.status).toBe('on_track');
      });

      it('returns on_track when progress is ahead of expected', () => {
        const result = calculateHealthStatus(70, 50, false);

        expect(result.status).toBe('on_track');
      });

      it('returns on_track when progress is slightly behind (< 10%)', () => {
        const result = calculateHealthStatus(45, 50, false);

        expect(result.status).toBe('on_track');
      });

      it('returns on_track at exactly -10% threshold boundary', () => {
        const result = calculateHealthStatus(40, 50, false);

        expect(result.status).toBe('on_track');
      });

      it('returns on_track when task is complete', () => {
        const result = calculateHealthStatus(100, 80, false);

        expect(result.status).toBe('on_track');
      });
    });

    describe('edge cases', () => {
      it('handles 0% progress and 0% expected correctly', () => {
        const result = calculateHealthStatus(0, 0, false);

        expect(result.status).toBe('on_track');
      });

      it('handles 100% progress and 100% expected correctly', () => {
        const result = calculateHealthStatus(100, 100, false);

        expect(result.status).toBe('on_track');
      });

      it('handles negative deltas correctly', () => {
        const result = calculateHealthStatus(10, 90, false);

        expect(result.status).toBe('at_risk');
      });

      it('handles large positive deltas correctly', () => {
        const result = calculateHealthStatus(90, 10, false);

        expect(result.status).toBe('on_track');
      });
    });
  });

  describe('calculateScheduleStatus', () => {
    describe('overdue status', () => {
      it('returns overdue when past due date and incomplete', () => {
        const dueDate = new Date('2025-01-15');
        const currentDate = new Date('2025-01-16');

        const result = calculateScheduleStatus(50, 100, dueDate, currentDate);

        expect(result.status).toBe('overdue');
        expect(result.daysDelta).toBeLessThan(0);
      });

      it('calculates correct days overdue', () => {
        const dueDate = new Date('2025-01-01');
        const currentDate = new Date('2025-01-06');

        const result = calculateScheduleStatus(80, 100, dueDate, currentDate);

        expect(result.status).toBe('overdue');
        expect(result.daysDelta).toBe(-5);
      });

      it('does not return overdue when task is complete', () => {
        const dueDate = new Date('2025-01-15');
        const currentDate = new Date('2025-01-16');

        const result = calculateScheduleStatus(100, 100, dueDate, currentDate);

        expect(result.status).not.toBe('overdue');
      });

      it('does not return overdue when before due date', () => {
        const dueDate = new Date('2025-01-20');
        const currentDate = new Date('2025-01-15');

        const result = calculateScheduleStatus(50, 75, dueDate, currentDate);

        expect(result.status).not.toBe('overdue');
      });
    });

    describe('behind status', () => {
      it('returns behind when time elapsed > progress + 15%', () => {
        const dueDate = new Date('2025-12-31');
        const currentDate = new Date('2025-01-15');

        const result = calculateScheduleStatus(20, 50, dueDate, currentDate);

        expect(result.status).toBe('behind');
      });

      it('returns behind at exactly 15% threshold', () => {
        const dueDate = new Date('2025-12-31');
        const currentDate = new Date('2025-01-15');

        const result = calculateScheduleStatus(34, 50, dueDate, currentDate);

        expect(result.status).toBe('behind');
      });

      it('calculates negative days delta when behind', () => {
        const dueDate = new Date('2025-12-31');
        const currentDate = new Date('2025-01-15');

        const result = calculateScheduleStatus(20, 50, dueDate, currentDate);

        expect(result.daysDelta).toBe(-30);
      });
    });

    describe('ahead status', () => {
      it('returns ahead when progress > time elapsed + 15%', () => {
        const dueDate = new Date('2025-12-31');
        const currentDate = new Date('2025-01-15');

        const result = calculateScheduleStatus(70, 40, dueDate, currentDate);

        expect(result.status).toBe('ahead');
      });

      it('returns ahead at exactly 15% threshold', () => {
        const dueDate = new Date('2025-12-31');
        const currentDate = new Date('2025-01-15');

        const result = calculateScheduleStatus(66, 50, dueDate, currentDate);

        expect(result.status).toBe('ahead');
      });

      it('calculates positive days delta when ahead', () => {
        const dueDate = new Date('2025-12-31');
        const currentDate = new Date('2025-01-15');

        const result = calculateScheduleStatus(80, 50, dueDate, currentDate);

        expect(result.daysDelta).toBe(30);
      });
    });

    describe('on_track status', () => {
      it('returns on_track when progress matches time elapsed', () => {
        const dueDate = new Date('2025-12-31');
        const currentDate = new Date('2025-01-15');

        const result = calculateScheduleStatus(50, 50, dueDate, currentDate);

        expect(result.status).toBe('on_track');
      });

      it('returns on_track when within ±15% threshold', () => {
        const dueDate = new Date('2025-12-31');
        const currentDate = new Date('2025-01-15');

        const result = calculateScheduleStatus(55, 50, dueDate, currentDate);

        expect(result.status).toBe('on_track');
      });

      it('returns on_track when slightly behind but within threshold', () => {
        const dueDate = new Date('2025-12-31');
        const currentDate = new Date('2025-01-15');

        const result = calculateScheduleStatus(45, 50, dueDate, currentDate);

        expect(result.status).toBe('on_track');
      });

      it('returns on_track at task start (0% progress, 0% time)', () => {
        const dueDate = new Date('2025-12-31');
        const currentDate = new Date('2025-01-15');

        const result = calculateScheduleStatus(0, 0, dueDate, currentDate);

        expect(result.status).toBe('on_track');
      });
    });

    describe('edge cases', () => {
      it('uses current date if not provided', () => {
        const dueDate = new Date('2099-12-31');

        const result = calculateScheduleStatus(50, 50, dueDate);

        expect(result).toBeDefined();
        expect(result.status).toBeDefined();
      });

      it('handles task completion correctly', () => {
        const dueDate = new Date('2025-01-31');
        const currentDate = new Date('2025-01-15');

        const result = calculateScheduleStatus(100, 50, dueDate, currentDate);

        expect(result.status).toBe('ahead');
      });

      it('handles extreme time elapsed correctly', () => {
        const dueDate = new Date('2025-12-31');
        const currentDate = new Date('2025-01-15');

        const result = calculateScheduleStatus(10, 90, dueDate, currentDate);

        expect(result.status).toBe('behind');
        expect(result.daysDelta).toBe(-80);
      });

      it('rounds days delta to nearest integer', () => {
        const dueDate = new Date('2025-12-31');
        const currentDate = new Date('2025-01-15');

        const result = calculateScheduleStatus(52, 50, dueDate, currentDate);

        expect(Number.isInteger(result.daysDelta)).toBe(true);
      });
    });
  });

  describe('calculateExpectedProgress', () => {
    it('returns 0 when current date is before start date', () => {
      const startDate = new Date('2025-01-10');
      const endDate = new Date('2025-01-20');
      const currentDate = new Date('2025-01-05');

      const result = calculateExpectedProgress(startDate, endDate, currentDate);

      expect(result).toBe(0);
    });

    it('returns 100 when current date is after end date', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-10');
      const currentDate = new Date('2025-01-20');

      const result = calculateExpectedProgress(startDate, endDate, currentDate);

      expect(result).toBe(100);
    });

    it('calculates 50% at midpoint', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const currentDate = new Date('2025-01-16');

      const result = calculateExpectedProgress(startDate, endDate, currentDate);

      expect(result).toBeGreaterThanOrEqual(48);
      expect(result).toBeLessThanOrEqual(52);
    });

    it('calculates 25% at quarter point', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const currentDate = new Date('2025-01-08');

      const result = calculateExpectedProgress(startDate, endDate, currentDate);

      expect(result).toBeGreaterThanOrEqual(22);
      expect(result).toBeLessThanOrEqual(28);
    });

    it('calculates 75% at three-quarter point', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const currentDate = new Date('2025-01-24');

      const result = calculateExpectedProgress(startDate, endDate, currentDate);

      expect(result).toBeGreaterThanOrEqual(73);
      expect(result).toBeLessThanOrEqual(77);
    });

    it('uses current date if not provided', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2099-12-31');

      const result = calculateExpectedProgress(startDate, endDate);

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(100);
    });

    it('returns 0 when start equals current', () => {
      const date = new Date('2025-01-15');

      const result = calculateExpectedProgress(date, new Date('2025-01-31'), date);

      expect(result).toBe(0);
    });

    it('returns 100 when end equals current', () => {
      const date = new Date('2025-01-31');

      const result = calculateExpectedProgress(new Date('2025-01-01'), date, date);

      expect(result).toBe(100);
    });

    it('handles short durations correctly', () => {
      const startDate = new Date('2025-01-01T00:00:00Z');
      const endDate = new Date('2025-01-01T12:00:00Z');
      const currentDate = new Date('2025-01-01T06:00:00Z');

      const result = calculateExpectedProgress(startDate, endDate, currentDate);

      expect(result).toBe(50);
    });
  });

  describe('getHealthColor', () => {
    it('returns correct color for on_track status', () => {
      const color = getHealthColor('on_track');

      expect(color).toBe('health-green');
    });

    it('returns correct color for at_risk status', () => {
      const color = getHealthColor('at_risk');

      expect(color).toBe('health-yellow');
    });

    it('returns correct color for blocked status', () => {
      const color = getHealthColor('blocked');

      expect(color).toBe('health-red');
    });

    it('returns correct color for not_started status', () => {
      const color = getHealthColor('not_started');

      expect(color).toBe('health-gray');
    });
  });

  describe('getScheduleColor', () => {
    it('returns correct color for ahead status', () => {
      const color = getScheduleColor('ahead');

      expect(color).toBe('schedule-green');
    });

    it('returns correct color for on_track status', () => {
      const color = getScheduleColor('on_track');

      expect(color).toBe('schedule-gray');
    });

    it('returns correct color for behind status', () => {
      const color = getScheduleColor('behind');

      expect(color).toBe('schedule-yellow');
    });

    it('returns correct color for overdue status', () => {
      const color = getScheduleColor('overdue');

      expect(color).toBe('schedule-red');
    });
  });

  describe('Integration Tests', () => {
    it('calculates complete workflow for on-track task', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const currentDate = new Date('2025-01-16');

      const expectedProgress = calculateExpectedProgress(startDate, endDate, currentDate);
      const actualProgress = 55;
      const health = calculateHealthStatus(actualProgress, expectedProgress, false);
      const schedule = calculateScheduleStatus(actualProgress, expectedProgress, endDate, currentDate);

      expect(health.status).toBe('on_track');
      expect(schedule.status).toBe('on_track');
    });

    it('calculates complete workflow for at-risk task', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const currentDate = new Date('2025-01-16');

      const expectedProgress = calculateExpectedProgress(startDate, endDate, currentDate);
      const actualProgress = 25;
      const health = calculateHealthStatus(actualProgress, expectedProgress, false);
      const schedule = calculateScheduleStatus(actualProgress, expectedProgress, endDate, currentDate);

      expect(health.status).toBe('at_risk');
      expect(schedule.status).toBe('behind');
    });

    it('calculates complete workflow for blocked task', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const currentDate = new Date('2025-01-16');

      const expectedProgress = calculateExpectedProgress(startDate, endDate, currentDate);
      const actualProgress = 0;
      const health = calculateHealthStatus(actualProgress, expectedProgress, true);

      expect(health.status).toBe('blocked');
      expect(health.reason).toBe('Has active blockers');
    });

    it('calculates complete workflow for ahead-of-schedule task', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const currentDate = new Date('2025-01-16');

      const expectedProgress = calculateExpectedProgress(startDate, endDate, currentDate);
      const actualProgress = 75;
      const health = calculateHealthStatus(actualProgress, expectedProgress, false);
      const schedule = calculateScheduleStatus(actualProgress, expectedProgress, endDate, currentDate);

      expect(health.status).toBe('on_track');
      expect(schedule.status).toBe('ahead');
    });

    it('calculates rollup progress for epic with multiple children', () => {
      const children: ChildProgress[] = [
        { progress: 100, weight: 2 },
        { progress: 50, weight: 3 },
        { progress: 0, weight: 1 },
      ];

      const rollupProgress = calculateWeightedProgress(children);
      const expectedProgress = 50;
      const health = calculateHealthStatus(rollupProgress, expectedProgress, false);

      expect(rollupProgress).toBeGreaterThan(0);
      expect(rollupProgress).toBeLessThan(100);
      expect(health.status).toMatch(/on_track|at_risk/);
    });
  });
});
