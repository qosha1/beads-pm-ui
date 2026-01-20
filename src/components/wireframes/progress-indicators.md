# Progress Indicators and Health Status UI Wireframe Specification

## Overview

This document specifies the visual design, interaction patterns, and component specifications for progress indicators and health status UI elements in the CEO Dashboard. These components provide real-time visibility into project health, epic/feature completion status, and schedule adherence.

---

## 1. Progress Bar Design

### 1.1 Standard Progress Bar (Inline)

Used for individual tasks, features, and epics in Gantt chart rows.

```
+------------------------------------------+
|[=========>                    ] 35%      |
+------------------------------------------+
     ^filled        ^empty         ^label
```

**Dimensions:**
- Height: 6px (tasks), 8px (features), 10px (epics)
- Width: Fills available container width, minimum 60px
- Border radius: 3px (all sizes)
- Label area: 36px fixed width, right-aligned

**Colors (CSS variables from design system):**
- Track background: `var(--border)` (#2a2a2a)
- Fill (default): `var(--accent)` (#3b82f6)
- Fill (ahead of schedule): `var(--success)` (#22c55e)
- Fill (behind schedule): `var(--warning)` (#eab308)
- Fill (blocked/critical): `var(--danger)` (#ef4444)
- Label text: `var(--fg)` (#ededed)

**Typography:**
- Percentage label: 11px, font-weight 600, monospace
- Hidden when bar width < 60px

**States:**
| State | Fill Color | Track Color | Label |
|-------|------------|-------------|-------|
| Not started (0%) | None | `var(--border)` | "0%" |
| In progress | `var(--accent)` | `var(--border)` | "35%" |
| Ahead of schedule | `var(--success)` | `var(--border)` | "35%" |
| Behind schedule | `var(--warning)` | `var(--border)` | "35%" |
| Blocked | `var(--danger)` | `var(--border)` | "35%" |
| Complete (100%) | `var(--success)` | `var(--success)` | "100%" |

**Animation:**
- Fill width transition: 300ms ease-out
- Color transition: 200ms ease

### 1.2 Circular Progress (Compact)

Used in dashboard summary cards and space-constrained layouts.

```
    ╭───────╮
   ╱   75%   ╲
  │           │
   ╲         ╱
    ╰───────╯
```

**Dimensions:**
- Small: 32px diameter, 3px stroke
- Medium: 48px diameter, 4px stroke
- Large: 64px diameter, 5px stroke

**Visual Specifications:**
- SVG-based ring with rounded linecaps
- Track: `var(--border)` at 30% opacity
- Fill: Uses same color logic as linear progress bar
- Center text: percentage value, font-weight 700
- Font sizes: 10px (small), 13px (medium), 16px (large)

**Animation:**
- Stroke-dashoffset transition: 400ms cubic-bezier(0.4, 0, 0.2, 1)

---

## 2. Health Status Badge

### 2.1 Traffic Light System

Three-state health indicator combining icon and text label.

```
Inline Format:
[o] On Track    [!] At Risk    [x] Blocked

Expanded Format:
+----------------+
| o  On Track    |
+----------------+
```

**Dimensions:**
- Inline badge: auto width, height 22px, padding 4px 8px
- Icon: 12px diameter circle or 12px icon
- Gap between icon and text: 6px
- Border radius: 11px (pill shape)

**Color Specifications:**

| Status | Background | Text/Icon | Border |
|--------|------------|-----------|--------|
| On Track (Green) | rgba(34, 197, 94, 0.15) | #22c55e | rgba(34, 197, 94, 0.3) |
| At Risk (Yellow) | rgba(234, 179, 8, 0.15) | #eab308 | rgba(234, 179, 8, 0.3) |
| Blocked (Red) | rgba(239, 68, 68, 0.15) | #ef4444 | rgba(239, 68, 68, 0.3) |
| Not Started (Gray) | rgba(156, 163, 175, 0.1) | #9ca3af | rgba(156, 163, 175, 0.2) |

**Typography:**
- Font size: 11px
- Font weight: 600
- Text transform: uppercase
- Letter spacing: 0.02em

**Icon Options:**
- Circle with fill (default): Solid circle matching status color
- Checkmark icon (on track): SVG checkmark
- Warning triangle (at risk): SVG triangle with exclamation
- X circle (blocked): SVG circle with X

### 2.2 Tooltip Content

On hover, display expanded health information.

```
+----------------------------------+
| Health: At Risk                  |
| -------------------------------- |
| Progress: 35% (expected 50%)     |
| Days remaining: 12               |
| Blockers: 2 dependency issues    |
| Last updated: 2h ago             |
+----------------------------------+
```

**Tooltip Specifications:**
- Width: 220px fixed
- Background: #1a1a1a
- Border: 1px solid var(--border)
- Border radius: 8px
- Padding: 12px
- Box shadow: 0 4px 16px rgba(0, 0, 0, 0.4)
- Arrow: 6px pointing to badge

**Content Typography:**
- Header: 12px, font-weight 600, status color
- Divider: 1px solid var(--border), margin 8px 0
- Labels: 11px, color var(--muted)
- Values: 11px, color var(--fg)
- Line height: 1.5

---

## 3. Epic/Feature Rollup Display

### 3.1 Weighted Rollup Calculation

Formula displayed in tooltip:
```
Epic Progress = Sum(child_progress x child_weight) / Sum(weights)
```

### 3.2 Parent Item Progress Bar (Rollup)

For items with children, show aggregated progress with visual indication.

```
+--------------------------------------------------+
| [Epic Name]                                       |
| [===========>                        ] 42%       |
|  ^gradient fill showing child distribution        |
|                                                   |
| Children: 3/7 complete  |  Weighted: 42%         |
+--------------------------------------------------+
```

**Visual Specifications:**
- Base progress bar uses same specs as Section 1.1
- Fill uses subtle gradient showing child distribution
- Small child indicator dots below bar (optional)

**Gradient Fill Pattern:**
```css
background: linear-gradient(
  90deg,
  var(--success) 0%,      /* Completed children */
  var(--accent) 60%,      /* In progress children */
  var(--border) 100%      /* Not started children */
);
```

**Child Distribution Indicator:**
```
[===========|====|===|     ]
    ^done    ^prog ^todo
```

- Segmented bar showing distribution
- Segment width proportional to child weight
- Colors: Success (done), Accent (in progress), Border (todo)

### 3.3 Rollup Tooltip Content

```
+----------------------------------------+
| Progress Breakdown                      |
| -------------------------------------- |
| [x] API Integration      100%  w:3     |
| [~] Database Schema       60%  w:2     |
| [ ] UI Components          0%  w:2     |
| [ ] Testing                0%  w:1     |
| -------------------------------------- |
| Weighted Total: 42%                     |
| Formula: (3x100 + 2x60 + 2x0 + 1x0) /8 |
+----------------------------------------+
```

**Specifications:**
- Width: 280px
- Child items: checkbox style indicator, name, progress, weight
- Formula row: monospace font, smaller size (10px)
- Scrollable if > 8 children, max-height 300px

---

## 4. Schedule Status

### 4.1 Schedule Status Badges

Four states for schedule adherence.

```
Ahead:    [>>] Ahead      Green, double chevron right
On Track: [--] On Track   Gray, horizontal line
Behind:   [!!] Behind     Yellow, double exclamation
Overdue:  [XX] Overdue    Red, double X
```

**Dimensions:**
- Same as health badges (Section 2.1)
- Icon: 12px width, custom SVG

**Color Specifications:**

| Status | Background | Text/Icon | Indicator |
|--------|------------|-----------|-----------|
| Ahead | rgba(34, 197, 94, 0.15) | #22c55e | >> |
| On Track | rgba(156, 163, 175, 0.1) | #9ca3af | -- |
| Behind | rgba(234, 179, 8, 0.15) | #eab308 | !! |
| Overdue | rgba(239, 68, 68, 0.15) | #ef4444 | XX |

**Calculation Logic:**
```
if (current_date > end_date && progress < 100):
    status = "Overdue"
elif (time_elapsed_percent > progress + 15):
    status = "Behind"
elif (progress > time_elapsed_percent + 15):
    status = "Ahead"
else:
    status = "On Track"
```

### 4.2 Schedule Timeline Indicator

Visual marker on Gantt bar showing expected vs actual position.

```
Gantt Bar with Schedule Indicator:
+------------------------------------------+
|[========|==>                    ]        |
|         ^ expected position (time marker)|
|              ^ actual progress position  |
+------------------------------------------+
```

**Specifications:**
- Time marker: 2px wide vertical line
- Color: rgba(255, 255, 255, 0.5)
- Top arrow indicator: 8px wide, 4px tall triangle
- Position: calculated as (elapsed_days / total_days) * bar_width

**Behind Schedule Visual:**
- Progress fill turns warning color when behind marker
- Marker has red accent when significantly behind (>15%)

**Ahead of Schedule Visual:**
- Progress fill turns success color when ahead of marker
- Subtle glow effect on progress fill

---

## 5. Dashboard Summary Panel

### 5.1 Project Health Overview

Summary panel showing aggregate health across all items.

```
+------------------------------------------------------------+
|  PROJECT HEALTH OVERVIEW                                    |
+------------------------------------------------------------+
|                                                             |
|   [=================]  [=====]  [==]  [ ]                  |
|   On Track: 45       At Risk: 12   Blocked: 5   N/A: 8     |
|                                                             |
|   +----------+  +----------+  +----------+  +----------+   |
|   |   72%    |  |    85%   |  |    45%   |  |    30%   |   |
|   | Overall  |  |  Epics   |  | Features |  |  Tasks   |   |
|   +----------+  +----------+  +----------+  +----------+   |
|                                                             |
|   Schedule: 68% on track | 22% behind | 10% overdue        |
|                                                             |
+------------------------------------------------------------+
```

### 5.2 Summary Cards

Individual metric cards within the overview panel.

**Dimensions:**
- Card size: 120px x 100px
- Border radius: 8px
- Padding: 16px
- Gap between cards: 16px

**Visual Specifications:**
- Background: rgba(255, 255, 255, 0.03)
- Border: 1px solid var(--border)
- Hover: border-color var(--accent), subtle lift

**Content Layout:**
```
+------------------+
|       72%        |  <- Large number, 28px, font-weight 700
|    Overall       |  <- Label, 11px, var(--muted)
|  [progress bar]  |  <- Mini progress bar, 4px height
+------------------+
```

### 5.3 Health Distribution Bar

Horizontal stacked bar showing distribution of health statuses.

```
+------------------------------------------------------------+
| [=========Green=========][==Yellow==][=Red=][Gray]         |
+------------------------------------------------------------+
        ^64%                  ^18%       ^12%   ^6%
```

**Specifications:**
- Height: 8px
- Border radius: 4px
- Segments: proportional width, no gaps
- Segment colors: match traffic light system
- Minimum segment width: 4px (if percentage > 0)

**Hover Behavior:**
- Segment expands vertically to 12px
- Tooltip shows count and percentage
- Other segments fade to 50% opacity

---

## 6. Inline vs Expanded Views

### 6.1 Inline/Compact View (Row)

Default display in Gantt chart rows.

```
Row Layout (420px info column):
+--------------------------------------------------------------------+
| [>] Task Title...    [P2] [In Prog] [eng]  [====>    ] 45% [o]     |
|  ^collapse  ^title    ^pri ^status  ^team   ^progress bar  ^health |
+--------------------------------------------------------------------+
```

**Column Widths:**
| Element | Width | Notes |
|---------|-------|-------|
| Collapse toggle | 16px | Fixed |
| Indent | 0-80px | 20px per level |
| Title | flex: 1 | min-width 100px, ellipsis |
| Priority | 18px | Square badge |
| Status | 70px | Fixed width badge |
| Team | 40px | Fixed width badge |
| Progress | 80px | Bar + percentage |
| Health | 22px | Icon only, tooltip on hover |

**Compact Progress Bar Specs:**
- Width: 50px
- Height: 4px
- No percentage label (shown separately)
- Border radius: 2px

### 6.2 Expanded View (Detail Panel)

Shown when clicking on a row or in edit modal.

```
+------------------------------------------------------------------+
| [Epic Name]                                            [x] Close  |
+------------------------------------------------------------------+
|                                                                   |
|  PROGRESS                                                         |
|  +--------------------------------------------------+            |
|  |[===================>                    ] 58%    |            |
|  +--------------------------------------------------+            |
|                                                                   |
|  HEALTH STATUS                           SCHEDULE STATUS          |
|  +---------------------+                 +---------------------+  |
|  | [o] On Track        |                 | [>>] Ahead          |  |
|  | Expected: 55%       |                 | 3 days ahead        |  |
|  | Actual: 58%         |                 | Due: Jan 15, 2026   |  |
|  +---------------------+                 +---------------------+  |
|                                                                   |
|  CHILD ITEMS (4)                                                  |
|  +-----------------------------------------------------------+   |
|  | [ ] Item 1                     [====    ] 40%  At Risk    |   |
|  | [x] Item 2                     [========] 100% Complete   |   |
|  | [ ] Item 3                     [        ] 0%   Not Started|   |
|  | [~] Item 4                     [=====   ] 60%  On Track   |   |
|  +-----------------------------------------------------------+   |
|                                                                   |
|  ROLLUP CALCULATION                                               |
|  Weighted Progress: (1x40 + 1x100 + 1x0 + 1x60) / 4 = 50%        |
|                                                                   |
+------------------------------------------------------------------+
```

**Panel Dimensions:**
- Width: 400px (slide-out) or modal width
- Padding: 24px
- Section gap: 20px

**Section Styling:**
- Section headers: 10px, uppercase, var(--muted), letter-spacing 0.1em
- Content background: rgba(255, 255, 255, 0.02)
- Content border radius: 6px
- Content padding: 12px

---

## 7. Mobile Adaptation

### 7.1 Breakpoints

| Breakpoint | Width | Adaptation |
|------------|-------|------------|
| Desktop | > 1024px | Full layout |
| Tablet | 768px - 1024px | Condensed info column |
| Mobile | < 768px | Simplified indicators |
| Small Mobile | < 480px | Icon-only mode |

### 7.2 Mobile Progress Indicator

```
Mobile Row (< 768px):
+-----------------------------------------------+
| [>] Task Title...          [45%] [o]          |
|  ^collapse  ^title          ^prog ^health     |
+-----------------------------------------------+
```

**Changes from Desktop:**
- Progress bar replaced with percentage badge
- Health badge: icon only, no text
- Status badge hidden (accessible via tap)
- Team badge hidden
- Priority: color-coded dot instead of badge

**Percentage Badge Specs:**
- Width: 36px
- Height: 20px
- Background: color based on health status
- Font size: 11px
- Font weight: 600
- Border radius: 10px

### 7.3 Mobile Health Indicator

Icon-only format with tap-to-expand tooltip.

```
Icon Only:       Tap Expanded:
   [o]           +----------------+
                 | On Track       |
                 | Progress: 45%  |
                 +----------------+
```

**Touch Target:**
- Minimum size: 44px x 44px
- Icon centered within touch target
- Tap shows tooltip positioned above

### 7.4 Mobile Summary Panel

Collapsed card view for dashboard overview.

```
+-------------------------------------------+
| PROJECT HEALTH                      [v]   |
| 72% Overall  |  45 On Track  |  5 Blocked |
+-------------------------------------------+
```

**Collapsed State:**
- Single row showing key metrics
- Expand chevron to show full panel
- Swipeable cards for detailed views

**Expanded State:**
- Full-width stacked cards
- Vertical layout for metric cards
- Touch-scrollable child lists

---

## 8. Accessibility Specifications

### 8.1 ARIA Attributes

**Progress Bars:**
```html
<div role="progressbar"
     aria-valuenow="45"
     aria-valuemin="0"
     aria-valuemax="100"
     aria-label="Task progress: 45 percent">
```

**Health Status:**
```html
<div role="status" aria-live="polite" aria-label="Health status: On Track">
  <span aria-hidden="true">[icon]</span>
  <span class="sr-only">On Track</span>
</div>
```

### 8.2 Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move between interactive indicators |
| Enter/Space | Open expanded view or tooltip |
| Escape | Close tooltip/expanded view |
| Arrow keys | Navigate within expanded child lists |

### 8.3 Color Contrast Requirements

| Element | Foreground | Background | Contrast Ratio |
|---------|------------|------------|----------------|
| Progress text | #ededed | #0a0a0a | 15.3:1 |
| Green status | #22c55e | rgba(34,197,94,0.15) | 4.8:1 |
| Yellow status | #eab308 | rgba(234,179,8,0.15) | 4.5:1 |
| Red status | #ef4444 | rgba(239,68,68,0.15) | 4.6:1 |

All contrast ratios meet WCAG AA standards (4.5:1 minimum for normal text).

### 8.4 Screen Reader Announcements

- Progress changes: Announce when crossing 25%, 50%, 75%, 100% thresholds
- Health status changes: Announce immediately with context
- Schedule status: Include days ahead/behind in announcement

---

## 9. Design Tokens Reference

### 9.1 Colors

```css
/* Progress Colors */
--progress-track: var(--border);           /* #2a2a2a */
--progress-fill-default: var(--accent);    /* #3b82f6 */
--progress-fill-success: var(--success);   /* #22c55e */
--progress-fill-warning: var(--warning);   /* #eab308 */
--progress-fill-danger: var(--danger);     /* #ef4444 */

/* Health Status Colors */
--health-green-bg: rgba(34, 197, 94, 0.15);
--health-green-fg: #22c55e;
--health-green-border: rgba(34, 197, 94, 0.3);

--health-yellow-bg: rgba(234, 179, 8, 0.15);
--health-yellow-fg: #eab308;
--health-yellow-border: rgba(234, 179, 8, 0.3);

--health-red-bg: rgba(239, 68, 68, 0.15);
--health-red-fg: #ef4444;
--health-red-border: rgba(239, 68, 68, 0.3);

--health-gray-bg: rgba(156, 163, 175, 0.1);
--health-gray-fg: #9ca3af;
--health-gray-border: rgba(156, 163, 175, 0.2);
```

### 9.2 Dimensions

```css
/* Progress Bar Heights */
--progress-height-sm: 4px;   /* Tasks, compact */
--progress-height-md: 6px;   /* Features, default */
--progress-height-lg: 8px;   /* Epics */
--progress-height-xl: 10px;  /* Summary */

/* Badge Sizes */
--badge-height: 22px;
--badge-padding: 4px 8px;
--badge-radius: 11px;
--badge-icon-size: 12px;
--badge-gap: 6px;

/* Circular Progress Sizes */
--circle-sm: 32px;
--circle-md: 48px;
--circle-lg: 64px;
```

### 9.3 Typography

```css
/* Progress Labels */
--progress-label-size: 11px;
--progress-label-weight: 600;
--progress-label-family: ui-monospace, monospace;

/* Badge Text */
--badge-text-size: 11px;
--badge-text-weight: 600;
--badge-text-transform: uppercase;
--badge-letter-spacing: 0.02em;

/* Tooltip */
--tooltip-header-size: 12px;
--tooltip-body-size: 11px;
--tooltip-line-height: 1.5;
```

### 9.4 Transitions

```css
/* Progress Animations */
--progress-fill-duration: 300ms;
--progress-fill-easing: ease-out;
--progress-color-duration: 200ms;

/* Circle Progress */
--circle-stroke-duration: 400ms;
--circle-stroke-easing: cubic-bezier(0.4, 0, 0.2, 1);

/* Tooltips */
--tooltip-fade-duration: 150ms;
--tooltip-delay: 300ms;
```

---

## 10. Implementation Notes

### 10.1 Data Structure for Progress

```typescript
interface ProgressData {
  current: number;           // 0-100
  expected: number;          // Based on time elapsed
  weighted?: number;         // For rollup calculations
  children?: ProgressData[]; // For parent items
}

interface HealthStatus {
  status: 'on_track' | 'at_risk' | 'blocked' | 'not_started';
  reason?: string;
  blockers?: string[];
  lastUpdated: Date;
}

interface ScheduleStatus {
  status: 'ahead' | 'on_track' | 'behind' | 'overdue';
  daysDelta: number;         // Positive = ahead, negative = behind
  dueDate: Date;
}
```

### 10.2 Rollup Calculation Function

```typescript
function calculateWeightedProgress(children: Array<{progress: number, weight: number}>): number {
  const totalWeight = children.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = children.reduce((sum, c) => sum + (c.progress * c.weight), 0);
  return Math.round(weightedSum / totalWeight);
}
```

### 10.3 Health Status Determination

```typescript
function determineHealthStatus(
  progress: number,
  expectedProgress: number,
  hasBlockers: boolean
): HealthStatus {
  if (hasBlockers) return { status: 'blocked' };
  if (progress === 0) return { status: 'not_started' };

  const delta = progress - expectedProgress;
  if (delta >= -10) return { status: 'on_track' };
  return { status: 'at_risk' };
}
```

---

## Appendix: Visual Reference Grid

```
PROGRESS BARS
=============
Default:  [===========>                    ] 45%
Success:  [==============================>] 100%
Warning:  [=====>                          ] 25%  (behind)
Danger:   [==>                             ] 12%  (blocked)

HEALTH BADGES
=============
[o] On Track     [!] At Risk     [x] Blocked     [-] N/A

SCHEDULE BADGES
===============
[>>] Ahead       [--] On Track   [!!] Behind     [XX] Overdue

CIRCULAR PROGRESS
=================
   ╭───╮        ╭─────╮        ╭───────╮
  │45%│        │ 72%  │       │  85%   │
   ╰───╯        ╰─────╯        ╰───────╯
   32px          48px           64px
```
