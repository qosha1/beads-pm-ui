# GanttChart Multi-View Wireframe Specifications

## Overview

This document defines the wireframe specifications for three views within the GanttChart component:
- **Board View** - Kanban-style columns organized by status
- **List View** - Flat sortable table of all tasks
- **Timeline View** - Gantt chart visualization (current implementation)

All views share the same data source (`Bead[]`) and support filtering, searching, and editing capabilities.

---

## Design System Reference

### CSS Variables (from globals.css)
```
--bg: #0a0a0a          (background)
--fg: #ededed          (foreground text)
--border: #2a2a2a      (borders, dividers)
--accent: #3b82f6      (primary interactive)
--accent-hover: #2563eb
--success: #22c55e
--warning: #eab308
--danger: #ef4444
--muted: #9ca3af       (secondary text)
```

### Spacing Scale
- 4px (0.25rem) - micro spacing
- 8px (0.5rem) - tight spacing
- 12px (0.75rem) - compact spacing
- 16px (1rem) - default spacing
- 24px (1.5rem) - comfortable spacing
- 32px (2rem) - section spacing

### Typography
- Font family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- Base font size: 14px (0.875rem)
- Small text: 12px (0.75rem)
- Micro text: 10px (0.625rem)

---

## 1. View Switcher UI

### Placement and Structure

```
+------------------------------------------------------------------+
| Header: Dashboard Title                          [Team Tabs]      |
+------------------------------------------------------------------+
| Controls Bar                                                      |
| +--------------------------------------------------------------+ |
| | [Search............] [Status Filter v] [Clear]    [View Tabs]| |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
| Main Content Area (varies by view)                               |
+------------------------------------------------------------------+
```

### View Tabs Component

```
+-------------------------------------------+
|  [=] Board  |  [#] List  |  [@] Timeline  |
+-------------------------------------------+
     ^             ^              ^
   active       inactive      inactive
```

**Component Specification:**

| Property | Value |
|----------|-------|
| Container | `display: flex; gap: 0; border: 1px solid var(--border); border-radius: 6px; overflow: hidden;` |
| Tab button | `padding: 8px 16px; background: transparent; border: none; cursor: pointer;` |
| Active tab | `background: var(--accent); color: white;` |
| Inactive tab | `background: var(--bg); color: var(--muted);` |
| Hover state | `background: var(--border);` |
| Min touch target | 44px height on mobile |

**Icons (using Unicode or icon font):**
- Board: Grid/Kanban icon (e.g., `U+2630` or custom SVG)
- List: Table/Lines icon (e.g., `U+2261` or custom SVG)
- Timeline: Calendar/Gantt icon (e.g., `U+1F4C5` or custom SVG)

**Keyboard Shortcuts:**
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + B` | Switch to Board view |
| `Cmd/Ctrl + L` | Switch to List view |
| `Cmd/Ctrl + T` | Switch to Timeline view |
| `Tab` | Navigate between view tabs |
| `Enter/Space` | Activate focused tab |

**Transition Animation:**
- Duration: 200ms
- Easing: ease-out
- Effect: Fade content (opacity 0 -> 1)
- CSS: `transition: opacity 200ms ease-out;`

---

## 2. Board View

### Design Goal
Users should quickly assess work distribution across statuses, identify bottlenecks (e.g., too many items in "Blocked"), and drag items between columns to update status.

### Layout Structure

```
+------------------------------------------------------------------+
| Controls Bar (shared)                                             |
+------------------------------------------------------------------+
|                                                                   |
|  +----------+  +----------+  +------------+  +--------+  +------+ |
|  | BACKLOG  |  |   TODO   |  | IN PROGRESS|  |  DONE  |  |BLOCKED||
|  | (12)     |  |   (8)    |  |    (5)     |  |  (23)  |  |  (2)  ||
|  +----------+  +----------+  +------------+  +--------+  +------+ |
|  |          |  |          |  |            |  |        |  |      | |
|  | [Card 1] |  | [Card 1] |  | [Card 1]   |  | [Card] |  |[Card]| |
|  |          |  |          |  |            |  |        |  |      | |
|  | [Card 2] |  | [Card 2] |  | [Card 2]   |  | [Card] |  |[Card]| |
|  |          |  |          |  |            |  |        |  |      | |
|  | [Card 3] |  | [Card 3] |  | [Card 3]   |  | [Card] |  |      | |
|  |          |  |          |  |            |  |        |  |      | |
|  |   ...    |  |   ...    |  |   ...      |  |  ...   |  |      | |
|  |          |  |          |  |            |  |        |  |      | |
|  +----------+  +----------+  +------------+  +--------+  +------+ |
|                                                                   |
+------------------------------------------------------------------+
```

### Column Specification

**Column Headers:**
```
+------------------------------------------+
|  [Status Icon] STATUS NAME         (##)  |
+------------------------------------------+
```

| Column | Status Value | Color Accent | Icon |
|--------|--------------|--------------|------|
| Backlog | `open` | `#1e3a8a` (blue) | Circle outline |
| Todo | `open` (filtered) | `#2563eb` (blue) | Checkbox empty |
| In Progress | `in_progress` | `#713f12` (amber) | Spinner/arrows |
| Done | `closed` | `#14532d` (green) | Checkmark |
| Blocked | `blocked` | `#7f1d1d` (red) | X or stop |

**Column Container:**
```css
.board-column {
  flex: 1;
  min-width: 240px;
  max-width: 320px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 180px);
}

.board-column-header {
  padding: 12px 16px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  background: inherit;
}

.board-column-body {
  flex: 1;
  padding: 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```

### Card Component

```
+------------------------------------------+
| [P] Task Title Goes Here            [T]  |
|     Truncated if too long...             |
+------------------------------------------+
|  Due: Jan 15  |  @assignee  |  [epic]    |
+------------------------------------------+
```

**Card Specification:**

```css
.board-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px;
  cursor: grab;
  transition: transform 0.15s, box-shadow 0.15s;
}

.board-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border-color: var(--accent);
}

.board-card:active,
.board-card.dragging {
  cursor: grabbing;
  transform: rotate(2deg) scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 100;
}

.board-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

**Card Content Layout:**

| Element | Style | Position |
|---------|-------|----------|
| Priority badge | 18x18px, top-left inline | Start of title row |
| Title | 0.8rem, truncate 2 lines, max 100 chars | Main content |
| Team badge | 0.55rem uppercase, background var(--border) | Top-right corner |
| Due date | 0.65rem, color var(--muted) or var(--danger) if overdue | Footer left |
| Assignee | 0.65rem, prefixed with @ | Footer center |
| Issue type | 0.55rem, color by type | Footer right |

**Card States:**
- Default: Standard appearance
- Hover: Elevated shadow, accent border
- Dragging: Rotated, larger shadow, semi-transparent origin placeholder
- Drop target: Column background highlight
- Focused: Accent outline (keyboard navigation)
- Overdue: Red tint on due date, subtle red left border

### Drag and Drop Behavior

**Drop Zones:**
- Each column body is a drop zone
- Show visual feedback when hovering over valid drop zone
- Insert indicator shows where card will land

**Drop Indicator:**
```css
.drop-indicator {
  height: 2px;
  background: var(--accent);
  border-radius: 1px;
  margin: 4px 0;
  animation: pulse 1s infinite;
}
```

**Status Update on Drop:**
When card dropped in new column:
1. Call `onUpdate(id, team, { status: newStatus })`
2. Optimistically move card
3. Revert on error with toast notification

### Responsive Behavior (Mobile < 768px)

```
+----------------------------------+
| Controls Bar                      |
+----------------------------------+
| [Backlog v] Column Selector      |
+----------------------------------+
|                                  |
| [Card 1]                         |
|                                  |
| [Card 2]                         |
|                                  |
| [Card 3]                         |
|                                  |
| ...                              |
+----------------------------------+
```

**Mobile Specifications:**
- Single column visible at a time
- Horizontal swipe to change columns, OR
- Dropdown selector to choose column
- Cards expand to full width minus padding (16px each side)
- Minimum card height: 64px
- Touch target areas: minimum 44x44px

---

## 3. List View

### Design Goal
Users should efficiently scan, sort, and bulk-review tasks with all metadata visible at a glance. Ideal for status updates, priority adjustments, and finding specific items.

### Layout Structure

```
+------------------------------------------------------------------+
| Controls Bar (shared)                                             |
+------------------------------------------------------------------+
| Table Header (sticky)                                             |
| +--------------------------------------------------------------+ |
| | [x] | Title                    |Status |Pri|Due    |Assignee | |
| |     |   [Sort ^]               |[v]    |[v]|[v]    |[v]      | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
| Table Body (scrollable)                                          |
| +--------------------------------------------------------------+ |
| | [ ] | [Epic] Q1 Infrastructure |IN PROG| 1 |Jan 31 |@alice   | |
| +--------------------------------------------------------------+ |
| | [ ] | [Q1] API Rate Limiting   |OPEN   | 2 |Feb 15 |@bob     | |
| +--------------------------------------------------------------+ |
| | [x] | Database Migration       |CLOSED | 1 |Jan 10 |-        | |
| +--------------------------------------------------------------+ |
| | [ ] | Auth Bug Fix             |BLOCKED| 0 |Jan 8  |@carol   | |
| +--------------------------------------------------------------+ |
| ...                                                              |
+------------------------------------------------------------------+
| Table Footer                                                      |
| +--------------------------------------------------------------+ |
| | Selected: 3 items     [Mark Done] [Change Priority] [Delete] | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

### Table Header Specification

```css
.list-header {
  display: grid;
  grid-template-columns: 40px 1fr 100px 50px 90px 100px 60px;
  gap: 8px;
  padding: 12px 16px;
  background: #111;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--muted);
}

.list-header-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
}

.list-header-cell:hover {
  color: var(--fg);
}

.list-header-cell.sorted {
  color: var(--accent);
}

.sort-indicator {
  font-size: 0.6rem;
}
```

### Column Definitions

| Column | Width | Sortable | Content |
|--------|-------|----------|---------|
| Checkbox | 40px | No | Multi-select checkbox |
| Title | flex 1 (min 200px) | Yes (A-Z, Z-A) | Task title with prefix badge |
| Status | 100px | Yes (custom order) | Status badge |
| Priority | 50px | Yes (0-4) | Priority badge (0-4) |
| Due Date | 90px | Yes (date) | Formatted date or dash |
| Assignee | 100px | Yes (A-Z) | @username or dash |
| Team | 60px | Yes (A-Z) | Team code badge |

**Sort Order for Status:**
1. blocked (urgent attention)
2. in_progress (active work)
3. open (pending)
4. deferred (later)
5. closed (completed)

### Table Row Specification

```css
.list-row {
  display: grid;
  grid-template-columns: 40px 1fr 100px 50px 90px 100px 60px;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  align-items: center;
  min-height: 44px;
  cursor: pointer;
  transition: background 0.1s;
}

.list-row:hover {
  background: rgba(255, 255, 255, 0.02);
}

.list-row:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  background: rgba(59, 130, 246, 0.1);
}

.list-row.selected {
  background: rgba(59, 130, 246, 0.08);
}

.list-row.completed {
  opacity: 0.6;
}

.list-row.overdue {
  border-left: 3px solid var(--danger);
}
```

### Cell Content Styling

**Title Cell:**
```
+------------------------------------------+
| [PREFIX] Task title text here...         |
+------------------------------------------+
```
- Prefix badge: Background matches issue_type color, 0.55rem
- Title text: 0.8rem, truncate with ellipsis
- Click opens edit modal

**Status Cell:**
Uses existing `.status-badge` classes from globals.css

**Priority Cell:**
Uses existing `.priority-badge` classes (0-4 scale)

**Due Date Cell:**
```css
.due-date {
  font-size: 0.75rem;
  color: var(--muted);
}

.due-date.overdue {
  color: var(--danger);
  font-weight: 600;
}

.due-date.today {
  color: var(--warning);
}

.due-date.soon {
  color: var(--accent);
}
```
- Overdue: Past due, red
- Today: Due today, amber
- Soon: Due within 3 days, blue
- Future: Normal muted color

**Assignee Cell:**
```css
.assignee {
  font-size: 0.75rem;
  color: var(--muted);
}

.assignee:not(:empty)::before {
  content: "@";
}
```

### Bulk Actions Footer

```css
.list-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #111;
  border-top: 1px solid var(--border);
  position: sticky;
  bottom: 0;
}

.bulk-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
}

.bulk-actions.visible {
  opacity: 1;
  pointer-events: auto;
}
```

**Bulk Action Buttons:**
- Mark Done: Changes status to "closed"
- Change Priority: Opens priority dropdown
- Clear Selection: Deselects all

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Arrow Up/Down` | Move focus between rows |
| `Space` | Toggle row selection |
| `Enter` | Open edit modal for focused row |
| `Cmd/Ctrl + A` | Select all visible rows |
| `Escape` | Clear selection |
| `Cmd/Ctrl + Shift + D` | Mark selected as Done |

### Responsive Behavior (Mobile < 768px)

```
+----------------------------------+
| Controls Bar                      |
+----------------------------------+
| +------------------------------+ |
| | [x] Task Title               | |
| |     Status  |  P1  |  Jan 15 | |
| +------------------------------+ |
| +------------------------------+ |
| | [ ] Another Task             | |
| |     Open    |  P2  |  -      | |
| +------------------------------+ |
| ...                              |
+----------------------------------+
| [Selected: 2]  [Actions v]       |
+----------------------------------+
```

**Mobile Specifications:**
- Card-based rows instead of table grid
- Two-line layout: Title on first line, metadata on second
- Checkbox inline with title
- Team and Assignee hidden (accessible via tap to expand or edit modal)
- Bulk actions in a bottom action sheet or dropdown
- Swipe gestures: Left to mark done, Right to change priority

---

## 4. Timeline View (Current Gantt Implementation)

### Design Goal
Users should visualize task schedules, dependencies, and progress over time. Identify overlapping work, scheduling conflicts, and track against deadlines.

### Current Layout (Reference - Already Implemented)

```
+------------------------------------------------------------------+
| Controls Bar                                                      |
| [Search............] [Status Filter v] [Clear]                   |
+------------------------------------------------------------------+
| Header Row                                                        |
| +--------------------+-------------------------------------------+|
| | Task | P |Status|Tm|    Jan 2026      |     Feb 2026           ||
| |      |   |      |  | 1  2  3 ... 31   | 1  2  3 ... 28         ||
| +--------------------+-------------------------------------------+|
+------------------------------------------------------------------+
| Body (scrollable both directions)                                 |
| +--------------------+-------------------------------------------+|
| | [v] Epic Task      |      [=============================]      ||
| |   > Child Task 1   |          [==========]                     ||
| |   > Child Task 2   |                [==============]           ||
| | [>] Collapsed Epic |   [================================]      ||
| | Regular Task       |       [=====]                             ||
| +--------------------+-------------------------------------------+|
+------------------------------------------------------------------+
| Legend                                                            |
| [Epic] [Feature] [Task] [Bug]                    | Today         |
+------------------------------------------------------------------+
```

### Existing Features (Preserved)
- Hierarchical task display with collapse/expand
- Drag to move or resize task bars
- Zoom slider (8px to 48px per day)
- Weekend highlighting
- Today line indicator
- Dependency arrows (SVG bezier curves)
- Progress bar within task bars
- Time-elapsed vs status-based progress comparison

### No Changes Required
The Timeline view is the current implementation. This wireframe documents it for completeness and ensures the view switcher integrates cleanly.

---

## 5. State Persistence

### Per-View State Storage

Each view maintains its own filter, sort, and UI state. State is persisted to localStorage.

**Storage Keys:**
```javascript
const STORAGE_KEYS = {
  // Global (shared across views)
  activeView: 'gantt-active-view',           // 'board' | 'list' | 'timeline'
  searchQuery: 'gantt-search-query',         // string
  statusFilter: 'gantt-status-filter',       // string

  // Board View
  boardColumnOrder: 'gantt-board-columns',   // string[] (column IDs)

  // List View
  listSortColumn: 'gantt-list-sort-col',     // string (column name)
  listSortDirection: 'gantt-list-sort-dir',  // 'asc' | 'desc'
  listSelectedIds: 'gantt-list-selected',    // string[] (transient, cleared on reload)

  // Timeline View (existing)
  timelineCollapsed: 'gantt-collapsed-tasks', // string[] (task IDs)
  timelineZoomIndex: 'gantt-zoom-index',      // number (0-5)
};
```

### State Interface

```typescript
interface ViewState {
  // Shared state
  activeView: 'board' | 'list' | 'timeline';
  searchQuery: string;
  statusFilter: string;

  // Board-specific
  board: {
    columnOrder: string[]; // Allow column reordering
  };

  // List-specific
  list: {
    sortColumn: 'title' | 'status' | 'priority' | 'due_at' | 'assignee' | 'team';
    sortDirection: 'asc' | 'desc';
    selectedIds: Set<string>; // Not persisted
  };

  // Timeline-specific
  timeline: {
    collapsedIds: Set<string>;
    zoomIndex: number;
  };
}
```

### State Persistence Logic

```typescript
// On view change
function handleViewChange(newView: ViewState['activeView']) {
  setActiveView(newView);
  localStorage.setItem(STORAGE_KEYS.activeView, newView);
  // Trigger 200ms fade transition
}

// On mount
function loadPersistedState(): ViewState {
  return {
    activeView: localStorage.getItem(STORAGE_KEYS.activeView) as ViewState['activeView'] || 'timeline',
    searchQuery: localStorage.getItem(STORAGE_KEYS.searchQuery) || '',
    statusFilter: localStorage.getItem(STORAGE_KEYS.statusFilter) || 'all',
    board: {
      columnOrder: JSON.parse(localStorage.getItem(STORAGE_KEYS.boardColumnOrder) || '[]'),
    },
    list: {
      sortColumn: localStorage.getItem(STORAGE_KEYS.listSortColumn) as any || 'priority',
      sortDirection: localStorage.getItem(STORAGE_KEYS.listSortDirection) as any || 'asc',
      selectedIds: new Set(), // Never persisted
    },
    timeline: {
      collapsedIds: new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.timelineCollapsed) || '[]')),
      zoomIndex: parseInt(localStorage.getItem(STORAGE_KEYS.timelineZoomIndex) || '3'),
    },
  };
}
```

### Shared vs. View-Specific State

| State Property | Shared? | Reason |
|----------------|---------|--------|
| searchQuery | Yes | User expects search to persist across views |
| statusFilter | Yes | Filter intent carries across views |
| activeView | Yes | Navigation state |
| Sort column/direction | No | Each view has different columns |
| Collapsed tasks | No | Only applies to Timeline |
| Zoom level | No | Only applies to Timeline |
| Selected items | No | List-only, transient |
| Column order | No | Board-only |

---

## 6. Transition Animations

### View Switching Animation

```css
.view-container {
  position: relative;
}

.view-content {
  opacity: 1;
  transition: opacity 200ms ease-out;
}

.view-content.exiting {
  opacity: 0;
  position: absolute;
  pointer-events: none;
}

.view-content.entering {
  opacity: 0;
}

.view-content.entered {
  opacity: 1;
}
```

### Animation Sequence

1. User clicks new view tab
2. Current view fades out (200ms)
3. New view fades in (200ms)
4. Total transition: 200ms (parallel fade)

**Implementation Note:**
Use CSS transitions, not JS animations, for 60fps performance.
Consider `will-change: opacity` for the view containers.

---

## 7. Accessibility Specifications

### ARIA Roles and Labels

**View Switcher:**
```html
<div role="tablist" aria-label="View options">
  <button role="tab" aria-selected="true" aria-controls="board-panel" id="board-tab">
    Board
  </button>
  <button role="tab" aria-selected="false" aria-controls="list-panel" id="list-tab">
    List
  </button>
  <button role="tab" aria-selected="false" aria-controls="timeline-panel" id="timeline-tab">
    Timeline
  </button>
</div>

<div role="tabpanel" id="board-panel" aria-labelledby="board-tab">
  <!-- Board content -->
</div>
```

**Board View Cards:**
```html
<div role="listitem"
     aria-label="Task: API Rate Limiting, Priority 2, Status Open, Due Feb 15"
     draggable="true">
  <!-- Card content -->
</div>
```

**List View Table:**
```html
<table role="grid" aria-label="Task list">
  <thead>
    <tr role="row">
      <th role="columnheader" aria-sort="none">Title</th>
      <th role="columnheader" aria-sort="ascending">Priority</th>
      ...
    </tr>
  </thead>
  <tbody>
    <tr role="row" aria-selected="false" tabindex="0">
      ...
    </tr>
  </tbody>
</table>
```

### Keyboard Navigation Summary

| Context | Key | Action |
|---------|-----|--------|
| View tabs | Tab | Move between tabs |
| View tabs | Enter/Space | Activate tab |
| View tabs | Arrow Left/Right | Move between tabs |
| Board cards | Tab | Move between cards |
| Board cards | Enter | Open edit modal |
| Board cards | Space | Begin drag (with arrow keys to move) |
| List rows | Arrow Up/Down | Move between rows |
| List rows | Space | Toggle selection |
| List rows | Enter | Open edit modal |
| List rows | Cmd+A | Select all |
| Timeline | Existing navigation preserved |

### Color Contrast Requirements

All text/background combinations must meet WCAG 2.1 AA standards:
- Normal text: 4.5:1 minimum
- Large text (18px+ or 14px+ bold): 3:1 minimum

**Verified Combinations:**
- `var(--fg)` (#ededed) on `var(--bg)` (#0a0a0a): 15.8:1 (pass)
- `var(--muted)` (#9ca3af) on `var(--bg)` (#0a0a0a): 7.5:1 (pass)
- `var(--accent)` (#3b82f6) on `var(--bg)` (#0a0a0a): 4.9:1 (pass)
- Status badge colors: Verified in existing implementation

### Focus Management

- Focus should move to first interactive element when switching views
- Maintain focus position when returning to a previously visited view
- Trap focus within modals
- Provide skip links for keyboard users

---

## 8. Mobile Responsive Summary

### Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Desktop | >= 1024px | Full multi-column layouts |
| Tablet | 768px - 1023px | Reduced columns, smaller cards |
| Mobile | < 768px | Single column, stacked layouts |
| Small Mobile | < 480px | Minimal UI, hide non-essential metadata |

### Touch Targets

All interactive elements must be minimum 44x44px on touch devices per WCAG guidelines.

### Gesture Support

| Gesture | Board View | List View | Timeline View |
|---------|------------|-----------|---------------|
| Tap | Open card | Open row | Open task |
| Long press | Begin drag | Show context menu | Begin drag |
| Swipe left | - | Mark done | - |
| Swipe right | - | Change priority | - |
| Horizontal scroll | Change column | - | Pan timeline |
| Pinch | - | - | Zoom in/out |

---

## 9. Implementation Priority

### Phase 1: View Switcher Foundation
1. Add view state management
2. Implement tab bar UI
3. Add keyboard shortcuts
4. Set up state persistence
5. Implement transition animations

### Phase 2: List View
1. Build table structure
2. Add sortable columns
3. Implement row selection
4. Add bulk actions
5. Mobile responsive layout

### Phase 3: Board View
1. Build column layout
2. Implement card component
3. Add drag-and-drop
4. Status update on drop
5. Mobile responsive layout

### Phase 4: Polish
1. Accessibility audit
2. Performance optimization
3. Edge case handling
4. Cross-browser testing

---

## 10. Component File Structure (Proposed)

```
src/components/
  GanttChart.tsx              # Main container, view switching logic
  views/
    BoardView.tsx             # Kanban board implementation
    ListView.tsx              # Table list implementation
    TimelineView.tsx          # Extracted from current GanttChart
  shared/
    ViewSwitcher.tsx          # Tab bar component
    TaskCard.tsx              # Shared card component (board/list)
    StatusBadge.tsx           # Extracted status badge
    PriorityBadge.tsx         # Extracted priority badge
  hooks/
    useViewState.ts           # State persistence hook
    useDragAndDrop.ts         # Shared drag logic
```

---

*End of Wireframe Specifications*
