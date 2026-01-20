# Shared Progress Components

This directory contains reusable UI components for displaying progress, health status, and schedule adherence throughout the dashboard.

## Components

### ProgressBar

A horizontal progress bar with optional label and health-based coloring.

**Usage:**
```tsx
import { ProgressBar } from '@/components/shared';
import { calculateWeightedProgress } from '@/lib/progress';

// Simple usage
<ProgressBar progress={75} />

// With status coloring
<ProgressBar
  progress={35}
  status="at_risk"
  size="lg"
/>

// Rollup progress example
const children = [
  { progress: 100, weight: 3 },
  { progress: 60, weight: 2 },
  { progress: 0, weight: 1 }
];
const rollupProgress = calculateWeightedProgress(children);

<ProgressBar
  progress={rollupProgress}
  showLabel={true}
/>
```

**Props:**
- `progress`: number (0-100) - Progress percentage
- `size`: 'sm' | 'md' | 'lg' - Bar height (default: 'md')
- `showLabel`: boolean - Show percentage label (default: true)
- `status`: HealthStatus - Color theme (default: 'on_track')
- `className`: string - Additional CSS classes

### HealthBadge

Traffic-light style health status indicator.

**Usage:**
```tsx
import { HealthBadge } from '@/components/shared';
import { calculateHealthStatus } from '@/lib/progress';

// Simple usage
<HealthBadge status="on_track" />

// Compact mode (icon only)
<HealthBadge status="blocked" compact />

// With health calculation
const health = calculateHealthStatus(
  actualProgress,
  expectedProgress,
  hasBlockers
);

<HealthBadge status={health.status} />
```

**Props:**
- `status`: 'on_track' | 'at_risk' | 'blocked' | 'not_started'
- `compact`: boolean - Icon-only mode (default: false)
- `className`: string - Additional CSS classes

**Status Colors:**
- `on_track`: Green (progress is on schedule)
- `at_risk`: Yellow (progress is >10% behind)
- `blocked`: Red (has active blockers)
- `not_started`: Gray (no progress yet)

### ScheduleBadge

Schedule adherence status with optional days delta.

**Usage:**
```tsx
import { ScheduleBadge } from '@/components/shared';
import { calculateScheduleStatus } from '@/lib/progress';

// Simple usage
<ScheduleBadge status="ahead" />

// With days delta
<ScheduleBadge
  status="ahead"
  daysDelta={5}
/>

// With schedule calculation
const schedule = calculateScheduleStatus(
  progress,
  timeElapsedPercent,
  dueDate
);

<ScheduleBadge
  status={schedule.status}
  daysDelta={schedule.daysDelta}
/>
```

**Props:**
- `status`: 'ahead' | 'on_track' | 'behind' | 'overdue'
- `daysDelta`: number - Days ahead (positive) or behind (negative)
- `compact`: boolean - Icon-only mode (default: false)
- `className`: string - Additional CSS classes

**Status Rules:**
- `ahead`: progress > time elapsed + 15%
- `on_track`: within ±15% of expected
- `behind`: time elapsed > progress + 15%
- `overdue`: past due date and incomplete

## Progress Calculation Utilities

The `@/lib/progress` module provides utility functions for calculating progress metrics.

### calculateWeightedProgress

Calculate weighted average progress from child items.

```tsx
import { calculateWeightedProgress } from '@/lib/progress';

const children = [
  { progress: 100, weight: 3 }, // Completed, high weight
  { progress: 60, weight: 2 },  // In progress
  { progress: 0, weight: 1 }    // Not started, low weight
];

const result = calculateWeightedProgress(children);
// Returns: 70 (weighted average)
```

### calculateHealthStatus

Determine health status based on progress and blockers.

```tsx
import { calculateHealthStatus } from '@/lib/progress';

const health = calculateHealthStatus(
  35,    // actual progress
  50,    // expected progress
  false  // has blockers
);

console.log(health.status);  // "at_risk"
console.log(health.reason);  // "Behind schedule"
```

### calculateScheduleStatus

Evaluate schedule adherence based on time elapsed.

```tsx
import { calculateScheduleStatus } from '@/lib/progress';

const schedule = calculateScheduleStatus(
  75,                           // progress %
  50,                           // time elapsed %
  new Date('2025-12-31'),      // due date
  new Date()                    // current date
);

console.log(schedule.status);     // "ahead"
console.log(schedule.daysDelta);  // 25 (days ahead)
```

### calculateExpectedProgress

Calculate expected progress based on time elapsed.

```tsx
import { calculateExpectedProgress } from '@/lib/progress';

const expected = calculateExpectedProgress(
  new Date('2025-01-01'),  // start date
  new Date('2025-01-31'),  // end date
  new Date('2025-01-16')   // current date
);

console.log(expected);  // ~50 (halfway through)
```

## Complete Integration Example

Here's a complete example showing how to use all components together:

```tsx
import {
  ProgressBar,
  HealthBadge,
  ScheduleBadge
} from '@/components/shared';
import {
  calculateWeightedProgress,
  calculateHealthStatus,
  calculateScheduleStatus,
  calculateExpectedProgress
} from '@/lib/progress';

function TaskStatusDisplay({ task, children }) {
  // Calculate rollup progress from children
  const rollupProgress = calculateWeightedProgress(
    children.map(child => ({
      progress: child.progress,
      weight: child.weight
    }))
  );

  // Calculate expected progress based on dates
  const expectedProgress = calculateExpectedProgress(
    task.startDate,
    task.endDate
  );

  // Calculate health status
  const health = calculateHealthStatus(
    rollupProgress,
    expectedProgress,
    task.blockers.length > 0
  );

  // Calculate schedule status
  const timeElapsed = calculateExpectedProgress(
    task.startDate,
    task.endDate
  );

  const schedule = calculateScheduleStatus(
    rollupProgress,
    timeElapsed,
    task.endDate
  );

  return (
    <div className="task-status">
      <div className="flex items-center gap-4">
        <ProgressBar
          progress={rollupProgress}
          status={health.status}
          size="md"
        />
        <HealthBadge status={health.status} />
        <ScheduleBadge
          status={schedule.status}
          daysDelta={schedule.daysDelta}
        />
      </div>
    </div>
  );
}
```

## Testing

All components have comprehensive unit tests in `__tests__/` directory.

Run tests:
```bash
npm test -- src/components/shared/__tests__
npm test -- src/lib/__tests__/progress.test.ts
```

Test coverage:
- Progress utilities: 68 tests
- ProgressBar: 31 tests
- HealthBadge: 35 tests
- ScheduleBadge: 51 tests
- **Total: 185 tests**

## Accessibility

All components follow WCAG AA accessibility standards:

- Proper ARIA roles and attributes
- Screen reader support
- Keyboard navigation
- Color contrast compliance (4.5:1 minimum)
- Live regions for status updates

## Design System

Components use CSS variables from the design system:

```css
/* Colors */
--accent: #3b82f6    (blue - on track)
--success: #22c55e   (green - ahead/complete)
--warning: #eab308   (yellow - at risk/behind)
--danger: #ef4444    (red - blocked/overdue)
--border: #2a2a2a    (gray - not started)

/* Typography */
--fg: #ededed        (foreground text)
--muted: #9ca3af    (muted text)
```

## Performance

- Components use React best practices (memoization where needed)
- Minimal re-renders
- Smooth CSS transitions (300ms)
- No external dependencies

## Browser Support

Tested and supported in:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)
