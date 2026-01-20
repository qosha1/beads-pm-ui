# Interaction Patterns Specification

## Overview

This document defines the comprehensive UI/UX interaction patterns for the CEO Dashboard's multi-view system. It covers Board, List, and Timeline views with detailed specifications for animations, keyboard navigation, accessibility, and error handling.

**Related Documents:**
- `view-layouts.md` - Wireframe layouts for all views
- `filter-panel.md` - Filter UI specifications
- `progress-indicators.md` - Progress and health status UI

**Design System Reference:**
```css
--bg: #0a0a0a
--fg: #ededed
--border: #2a2a2a
--accent: #3b82f6
--accent-hover: #2563eb
--success: #22c55e
--warning: #eab308
--danger: #ef4444
--muted: #9ca3af
```

---

## 1. Board View Interactions

### 1.1 Card Drag-and-Drop

Board view uses a Kanban-style layout with draggable cards organized by status columns.

#### Pickup Phase

**Mouse Interaction:**
```
User Action: mousedown on card (hold 150ms or immediate drag)
Visual Response:
1. Card lifts from surface (transform: translateY(-2px))
2. Shadow increases (box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4))
3. Cursor changes to `grabbing`
4. Card rotates slightly (transform: rotate(2deg) scale(1.02))
5. Original position shows ghost placeholder

Timing:
- Lift animation: 100ms ease-out
- Rotation: 50ms ease-out
- Ghost fade-in: 150ms
```

**CSS Implementation:**
```css
.board-card {
  cursor: grab;
  transition: transform 150ms ease-out, box-shadow 150ms ease-out;
}

.board-card:active,
.board-card.dragging {
  cursor: grabbing;
  transform: rotate(2deg) scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 100;
}

.board-card-ghost {
  background: rgba(59, 130, 246, 0.1);
  border: 2px dashed var(--accent);
  border-radius: 6px;
  opacity: 0.5;
}
```

**Framer Motion Implementation:**
```tsx
const cardVariants = {
  idle: {
    scale: 1,
    rotate: 0,
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
  },
  dragging: {
    scale: 1.02,
    rotate: 2,
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    transition: { duration: 0.15, ease: "easeOut" }
  }
};
```

#### Drag Phase

**Visual Feedback During Drag:**
```
1. Dragged card follows cursor with slight offset
2. Card maintains rotation during movement
3. Other cards reorder smoothly as drag position changes
4. Drop zones highlight when card hovers over them
```

**Column Drop Zone Activation:**
```css
.board-column.drop-target {
  background: rgba(59, 130, 246, 0.08);
  border: 2px dashed var(--accent);
  transition: all 150ms ease-out;
}

.board-column.drop-target-invalid {
  background: rgba(239, 68, 68, 0.08);
  border-color: var(--danger);
}
```

**Card Reordering Animation:**
```css
.board-card.reordering {
  transition: transform 200ms cubic-bezier(0.2, 0, 0, 1);
}
```

#### Drop Indicator

Shows precise insertion point within column:

```
+------------------------------------------+
|  [Card Above]                             |
+------------------------------------------+
|  ====================================     |  <-- Drop indicator (2px accent line)
+------------------------------------------+
|  [Card Below]                             |
+------------------------------------------+
```

**CSS:**
```css
.drop-indicator {
  height: 2px;
  background: var(--accent);
  border-radius: 1px;
  margin: 4px 0;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

#### Reorder Within Column

**Behavior:**
1. Card position tracked relative to other cards' midpoints
2. When crossing midpoint, cards above/below shift to make room
3. Shift animation: 200ms cubic-bezier(0.2, 0, 0, 1)
4. Drop indicator appears at new position

**State Update:**
```typescript
// Optimistic reorder
const handleReorder = (cardId: string, newIndex: number) => {
  // 1. Immediately update UI state
  setCards(reorderCards(cards, cardId, newIndex));

  // 2. Persist to backend
  await updateCardOrder(cardId, newIndex).catch(() => {
    // 3. Rollback on failure
    setCards(originalCards);
    showToast({ type: 'error', message: 'Failed to reorder card' });
  });
};
```

#### Move Between Columns

**Behavior:**
1. When card enters new column's drop zone, column highlights
2. Status updates automatically when dropped in new column
3. Card animates to new position with spring physics

**Status Mapping:**
| Column | Status Value |
|--------|-------------|
| Backlog | `open` |
| Todo | `open` |
| In Progress | `in_progress` |
| Done | `closed` |
| Blocked | `blocked` |

**Drop Animation:**
```typescript
const dropVariants = {
  dropping: {
    scale: [1.02, 0.98, 1],
    rotate: [2, -1, 0],
    transition: {
      duration: 0.3,
      ease: [0.2, 0, 0, 1]
    }
  }
};
```

### 1.2 Column Management

#### Column Collapse

**Trigger:** Click column header chevron or double-click header

**Animation:**
```css
.board-column.collapsed {
  width: 48px;
  transition: width 200ms cubic-bezier(0.2, 0, 0, 1);
}

.board-column.collapsed .board-column-body {
  opacity: 0;
  pointer-events: none;
  transition: opacity 100ms ease-out;
}

.board-column.collapsed .board-column-header {
  writing-mode: vertical-rl;
  text-orientation: mixed;
}
```

**Collapsed State Visual:**
```
+----+
| B  |
| A  |
| C  |
| K  |
| L  |
| O  |
| G  |
|    |
|(12)|
+----+
```

#### Column Reorder

**Behavior:**
1. Click and hold column header (200ms threshold)
2. Entire column lifts and becomes draggable
3. Other columns shift to accommodate
4. Drop to reorder

**Visual Feedback:**
```css
.board-column.column-dragging {
  opacity: 0.9;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
  transform: scale(1.02);
}

.board-column-placeholder {
  background: rgba(255, 255, 255, 0.02);
  border: 2px dashed var(--border);
}
```

#### Add Card Button

**Location:** Bottom of each column or column header

**Interaction:**
```
Hover: Background brightens, icon scales up
Click: Inline form appears at column top/bottom
```

**CSS:**
```css
.add-card-btn {
  width: 100%;
  padding: 8px;
  background: transparent;
  border: 1px dashed var(--border);
  border-radius: 6px;
  color: var(--muted);
  cursor: pointer;
  transition: all 150ms ease;
}

.add-card-btn:hover {
  background: rgba(255, 255, 255, 0.02);
  border-color: var(--accent);
  color: var(--fg);
}

.add-card-btn:hover .add-icon {
  transform: scale(1.1);
}
```

### 1.3 Card Quick-Edit

#### Inline Title Edit

**Trigger:** Double-click card title OR press Enter when card focused

**Behavior:**
1. Title transforms into textarea with current value
2. Auto-focus with text selected
3. Save on blur or Enter (Shift+Enter for newline)
4. Cancel on Escape

**Visual:**
```css
.card-title-input {
  background: var(--bg);
  border: 1px solid var(--accent);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: inherit;
  color: var(--fg);
  width: 100%;
  resize: none;
  outline: none;
}
```

#### Status Change via Drop

When card dropped in different column:
1. Status badge updates immediately (optimistic)
2. Brief pulse animation on badge
3. Toast notification confirms change
4. Rollback if API call fails

**Badge Animation:**
```css
@keyframes status-update-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); background-brightness: 1.2; }
  100% { transform: scale(1); }
}

.status-badge.updating {
  animation: status-update-pulse 300ms ease-out;
}
```

### 1.4 Touch Interactions for Mobile

#### Touch Drag Initiation

**Trigger:** Long press (500ms) on card

**Feedback:**
1. Haptic feedback (if available)
2. Card lifts with larger elevation for thumb visibility
3. Touch point offset applied so card doesn't obscure finger

**Implementation:**
```typescript
const LONG_PRESS_DURATION = 500;
const TOUCH_OFFSET = { x: 0, y: -40 }; // Lift above finger

const handleTouchStart = (e: TouchEvent) => {
  longPressTimer = setTimeout(() => {
    setDragState({
      isDragging: true,
      touchOffset: TOUCH_OFFSET
    });
    // Trigger haptic if available
    if (navigator.vibrate) navigator.vibrate(50);
  }, LONG_PRESS_DURATION);
};
```

#### Swipe Column Navigation (Mobile)

**Horizontal Swipe:**
- Swipe left/right to navigate between columns
- Velocity-based: fast swipe = skip to next column
- Snap points at each column center

**CSS:**
```css
.board-container-mobile {
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}

.board-column-mobile {
  scroll-snap-align: center;
  scroll-snap-stop: always;
}
```

#### Card Actions via Swipe

**Swipe Right:** Quick status change (cycle forward)
**Swipe Left:** Archive/Delete confirmation

```css
.card-swipe-action {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-swipe-action.right {
  right: 0;
  background: var(--success);
}

.card-swipe-action.left {
  left: 0;
  background: var(--danger);
}
```

---

## 2. List View Interactions

### 2.1 Column Sorting

#### Click to Sort

**Single Click on Column Header:**
1. First click: Sort ascending
2. Second click: Sort descending
3. Third click: Remove sort (return to default)

**Visual Indicators:**
```
+------------------------------------------+
| Title          [^] | Status | Priority   |
+------------------------------------------+
                 ^-- Sort indicator (arrow up/down)
```

**CSS:**
```css
.list-header-cell {
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 4px;
}

.list-header-cell:hover {
  color: var(--fg);
}

.list-header-cell.sorted {
  color: var(--accent);
}

.sort-indicator {
  font-size: 0.6rem;
  transition: transform 150ms ease;
}

.sort-indicator.desc {
  transform: rotate(180deg);
}
```

#### Multi-Column Sort

**Trigger:** Shift+Click on additional column headers

**Behavior:**
1. Primary sort column shows "1" badge
2. Secondary sort column shows "2" badge
3. Up to 3 levels of sorting supported
4. Clear all sorts: Click primary column header 3x OR press Escape

**Visual:**
```
+------------------------------------------+
| Title [1^] | Status | Priority [2v] | Due|
+------------------------------------------+
```

**Implementation:**
```typescript
interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
  priority: number;
}

const handleColumnClick = (column: string, e: MouseEvent) => {
  if (e.shiftKey && sortConfigs.length < 3) {
    // Add secondary sort
    addSecondarySort(column);
  } else {
    // Primary sort cycling
    cyclePrimarySort(column);
  }
};
```

### 2.2 Row Selection

#### Single Selection

**Click on Row:**
1. Row background highlights
2. Checkbox becomes checked
3. Selection count updates in footer

**CSS:**
```css
.list-row.selected {
  background: rgba(59, 130, 246, 0.08);
}

.list-row.selected .row-checkbox {
  background: var(--accent);
  border-color: var(--accent);
}
```

#### Multi-Selection

**Ctrl/Cmd + Click:**
- Toggle individual row selection without affecting others

**Shift + Click:**
- Select range from last selected row to clicked row
- All rows in between become selected

**Implementation:**
```typescript
const handleRowClick = (rowIndex: number, e: MouseEvent) => {
  if (e.shiftKey && lastSelectedIndex !== null) {
    // Range select
    const start = Math.min(lastSelectedIndex, rowIndex);
    const end = Math.max(lastSelectedIndex, rowIndex);
    setSelectedIds(new Set([
      ...selectedIds,
      ...rows.slice(start, end + 1).map(r => r.id)
    ]));
  } else if (e.ctrlKey || e.metaKey) {
    // Toggle single
    toggleSelection(rowIndex);
  } else {
    // Single select
    setSelectedIds(new Set([rows[rowIndex].id]));
  }
  setLastSelectedIndex(rowIndex);
};
```

#### Checkbox Selection

**Header Checkbox States:**
- Unchecked: No rows selected
- Checked: All visible rows selected
- Indeterminate: Some rows selected

**CSS:**
```css
.row-checkbox {
  width: 16px;
  height: 16px;
  border: 2px solid var(--muted);
  border-radius: 3px;
  cursor: pointer;
  transition: all 100ms ease;
}

.row-checkbox:hover {
  border-color: var(--accent);
}

.row-checkbox.checked {
  background: var(--accent);
  border-color: var(--accent);
}

.row-checkbox.indeterminate {
  background: var(--accent);
  border-color: var(--accent);
}

.row-checkbox.indeterminate::after {
  content: "";
  width: 8px;
  height: 2px;
  background: white;
}
```

### 2.3 Bulk Actions

#### Action Bar Appearance

**Trigger:** 1+ rows selected

**Animation:**
```css
.bulk-actions-bar {
  position: sticky;
  bottom: 0;
  background: #111;
  border-top: 1px solid var(--border);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  transform: translateY(100%);
  opacity: 0;
  transition: transform 200ms ease-out, opacity 150ms ease;
}

.bulk-actions-bar.visible {
  transform: translateY(0);
  opacity: 1;
}
```

#### Available Bulk Actions

| Action | Icon | Keyboard Shortcut |
|--------|------|------------------|
| Mark Done | Checkmark | Cmd+Shift+D |
| Change Priority | Flag | Cmd+Shift+P |
| Change Status | Circle | Cmd+Shift+S |
| Delete | Trash | Delete/Backspace |
| Clear Selection | X | Escape |

**Confirmation Pattern:**
- Destructive actions (Delete) require confirmation modal
- Non-destructive actions apply immediately with undo option

**Undo Toast:**
```
+------------------------------------------+
| [Undo icon] 5 tasks marked as done  [Undo]|
+------------------------------------------+
                                        ^
                                   Undo button (5s timeout)
```

### 2.4 Inline Editing

#### Cell Edit Trigger

**Double-click Cell OR Press Enter when cell focused**

**Editable Cells:**
- Title: Text input
- Status: Dropdown select
- Priority: Dropdown select (0-4)
- Due Date: Date picker
- Assignee: Searchable dropdown

**Non-editable Cells:**
- Team (display only in list view)
- Created date

#### Edit Mode Visual

```css
.list-cell.editing {
  padding: 0;
}

.list-cell-input {
  width: 100%;
  height: 100%;
  padding: 8px 12px;
  background: var(--bg);
  border: 2px solid var(--accent);
  border-radius: 0;
  color: var(--fg);
  font-size: inherit;
  outline: none;
}

.list-cell-select {
  appearance: none;
  background: var(--bg);
  border: 2px solid var(--accent);
  color: var(--fg);
  width: 100%;
  padding: 8px 12px;
}
```

#### Save/Cancel Behavior

| Action | Result |
|--------|--------|
| Enter | Save and move to next editable cell |
| Tab | Save and move to next cell |
| Shift+Tab | Save and move to previous cell |
| Escape | Cancel edit, restore original value |
| Click outside | Save changes |

---

## 3. Timeline View Interactions

### 3.1 Task Bar Dragging

#### Move (Horizontal Drag)

**Trigger:** Click and drag task bar center

**Behavior:**
1. Bar follows cursor horizontally
2. Dates update in real-time tooltip
3. Grid snaps to day boundaries
4. Dependencies redraw dynamically

**Visual Feedback:**
```css
.gantt-bar.dragging {
  z-index: 10;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  opacity: 0.9;
  cursor: grabbing;
}

.gantt-drag-tooltip {
  position: absolute;
  top: -28px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.65rem;
  white-space: nowrap;
}
```

#### Resize from Edges

**Trigger:** Hover near bar edge (8px zone), click and drag

**Cursor Changes:**
```css
.gantt-bar-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  opacity: 0;
  transition: opacity 150ms ease;
}

.gantt-bar:hover .gantt-bar-handle {
  opacity: 1;
}

.gantt-bar-handle::after {
  content: "";
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 12px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 1px;
}
```

**Constraints:**
- Minimum bar width: 1 day (dayWidth pixels)
- Start cannot exceed end
- End cannot precede start

### 3.2 Time Navigation

#### Pan (Horizontal Scroll)

**Mouse:** Horizontal scroll wheel OR click-drag on empty timeline area
**Trackpad:** Two-finger horizontal swipe
**Touch:** Single finger horizontal swipe

**Momentum Scrolling:**
```css
.gantt-body-scroll {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}
```

#### Zoom with Slider

**Zoom Levels:**
| Index | Day Width | Use Case |
|-------|-----------|----------|
| 0 | 8px | Full year view |
| 1 | 12px | Quarter view |
| 2 | 16px | Month view |
| 3 | 24px | Default (weeks) |
| 4 | 32px | Week detail |
| 5 | 48px | Day detail |

**Slider Interaction:**
```css
.zoom-slider {
  width: 100px;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  appearance: none;
  cursor: pointer;
}

.zoom-slider::-webkit-slider-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  transition: transform 150ms ease;
}

.zoom-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}
```

**Zoom Behavior:**
1. Zoom centers on current scroll position
2. Maintain relative position of "today" line
3. Smooth transition between zoom levels (200ms)

#### Scroll to Today

**Trigger:** Double-click "Today" legend item OR press "T" key

**Animation:**
```typescript
const scrollToToday = () => {
  const today = new Date();
  const daysFromStart = differenceInDays(today, startDate);
  const targetScroll = Math.max(0, daysFromStart * dayWidth - viewportWidth / 2);

  bodyScrollRef.current?.scrollTo({
    left: targetScroll,
    behavior: 'smooth'
  });
};
```

### 3.3 Dependency Line Interactions

#### Hover Highlight

**Behavior:**
1. Hovering over dependency line highlights it
2. Connected task bars glow
3. Tooltip shows relationship info

**CSS:**
```css
.gantt-dep-line {
  stroke: #666;
  stroke-width: 1.5;
  fill: none;
  opacity: 0.6;
  transition: all 150ms ease;
  cursor: pointer;
}

.gantt-dep-line:hover {
  stroke: var(--accent);
  stroke-width: 2;
  opacity: 1;
}

.gantt-bar.dependency-highlight {
  box-shadow: 0 0 0 2px var(--accent);
}
```

#### Click to Navigate

**Click on Dependency Line:**
1. Scroll to bring both connected tasks into view
2. Briefly highlight both tasks (pulse animation)
3. Show mini-popup with relationship details

**Popup Content:**
```
+--------------------------------+
| Dependency                     |
| Parent: Epic Q1 Infra          |
| Child: API Rate Limiting       |
| Type: blocks                   |
+--------------------------------+
```

### 3.4 Swimlane Collapse/Expand

#### Toggle Behavior

**Trigger:** Click chevron icon in task info column

**Animation:**
```css
.gantt-row.collapsing {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 200ms ease-out, opacity 150ms ease;
}

.gantt-collapse-btn {
  transition: transform 150ms ease;
}

.gantt-collapse-btn.collapsed {
  transform: rotate(-90deg);
}
```

**Child Row Animation:**
- Stagger children: 30ms delay between each
- Collapse from bottom to top
- Expand from top to bottom

**Framer Motion:**
```tsx
const childVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.2 }
  },
  expanded: (i: number) => ({
    height: ROW_HEIGHT,
    opacity: 1,
    transition: {
      duration: 0.2,
      delay: i * 0.03
    }
  })
};
```

---

## 4. Cross-View Patterns

### 4.1 View Switching Transitions

#### Animation Specification

**Duration:** 200-300ms (200ms recommended for snappy feel)
**Easing:** ease-out (CSS) or [0.2, 0, 0, 1] (cubic-bezier)

**Transition Types:**

**Fade Cross-Dissolve (Default):**
```css
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

**Slide (Alternative):**
```css
.view-content.slide-exit {
  transform: translateX(0);
  opacity: 1;
}

.view-content.slide-exit-active {
  transform: translateX(-20px);
  opacity: 0;
  transition: all 200ms ease-out;
}

.view-content.slide-enter {
  transform: translateX(20px);
  opacity: 0;
}

.view-content.slide-enter-active {
  transform: translateX(0);
  opacity: 1;
  transition: all 200ms ease-out;
}
```

#### Sequence

1. User clicks view tab
2. Current view fades/slides out (200ms)
3. New view fades/slides in (200ms parallel or 50ms overlap)
4. Focus moves to first interactive element in new view

### 4.2 Filter State Persistence

**Shared State (persists across views):**
- Search query
- Status filter
- Priority filter
- Team filter
- Date range filter

**View-Specific State (not shared):**
- List: Sort column, sort direction, selected rows
- Board: Column order, collapsed columns
- Timeline: Zoom level, collapsed tasks, scroll position

**Storage Implementation:**
```typescript
const STORAGE_KEYS = {
  // Shared
  searchQuery: 'gantt-search-query',
  statusFilter: 'gantt-status-filter',
  activeView: 'gantt-active-view',

  // View-specific
  listSortColumn: 'gantt-list-sort-col',
  listSortDirection: 'gantt-list-sort-dir',
  boardColumnOrder: 'gantt-board-columns',
  timelineZoomIndex: 'gantt-zoom-index',
  timelineCollapsed: 'gantt-collapsed-tasks',
};
```

### 4.3 Keyboard Shortcuts

#### Global Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Cmd/Ctrl + B` | Switch to Board view | Any |
| `Cmd/Ctrl + L` | Switch to List view | Any |
| `Cmd/Ctrl + T` | Switch to Timeline view | Any |
| `/` or `Cmd/Ctrl + K` | Focus search | Any |
| `Escape` | Clear search/filters, close modal | Any |
| `?` | Show keyboard shortcuts help | Any |

#### Board View Shortcuts

| Shortcut | Action |
|----------|--------|
| `Arrow Keys` | Navigate between cards |
| `Enter` | Open card detail modal |
| `Space` | Start drag mode (use arrows to move) |
| `1-5` | Move card to column 1-5 |
| `N` | New card in current column |

#### List View Shortcuts

| Shortcut | Action |
|----------|--------|
| `Arrow Up/Down` | Move between rows |
| `Space` | Toggle row selection |
| `Shift + Arrow` | Extend selection |
| `Cmd/Ctrl + A` | Select all visible rows |
| `Enter` | Open row detail modal |
| `E` | Edit focused cell |
| `Cmd/Ctrl + Shift + D` | Mark selected as done |

#### Timeline View Shortcuts

| Shortcut | Action |
|----------|--------|
| `Arrow Up/Down` | Navigate between tasks |
| `Arrow Left/Right` | Move task by 1 day |
| `Shift + Arrow L/R` | Resize task by 1 day |
| `+` / `-` | Zoom in/out |
| `T` | Scroll to today |
| `Enter` | Open task detail modal |
| `[` / `]` | Collapse/expand focused task |

### 4.4 Focus Management

#### View Switch Focus

**When switching views:**
1. Focus moves to first focusable element in new view
2. Previous focus position stored per-view
3. Returning to view restores previous focus

**Implementation:**
```typescript
const useFocusRestoration = (viewId: string) => {
  const focusMapRef = useRef<Map<string, HTMLElement>>(new Map());

  const storeFocus = () => {
    if (document.activeElement instanceof HTMLElement) {
      focusMapRef.current.set(viewId, document.activeElement);
    }
  };

  const restoreFocus = () => {
    const element = focusMapRef.current.get(viewId);
    if (element && document.body.contains(element)) {
      element.focus();
    } else {
      // Focus first focusable element
      const firstFocusable = containerRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (firstFocusable as HTMLElement)?.focus();
    }
  };

  return { storeFocus, restoreFocus };
};
```

#### Modal Focus Trap

**When modal opens:**
1. Focus moves to first focusable element in modal
2. Tab cycles within modal only
3. Escape closes modal
4. Focus returns to trigger element on close

**Implementation:**
```typescript
const useFocusTrap = (isOpen: boolean, containerRef: RefObject<HTMLElement>) => {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    firstElement?.focus();
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);
};
```

---

## 5. Micro-animations

### 5.1 Hover States

#### Card/Row Lift

```css
.board-card:hover,
.list-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: transform 150ms ease-out, box-shadow 150ms ease-out;
}
```

#### Shadow Elevation

**Elevation Levels:**
| State | Box Shadow |
|-------|-----------|
| Default | `0 2px 4px rgba(0,0,0,0.1)` |
| Hover | `0 4px 12px rgba(0,0,0,0.3)` |
| Active/Dragging | `0 8px 24px rgba(0,0,0,0.4)` |
| Modal | `0 16px 48px rgba(0,0,0,0.5)` |

#### Border Glow

```css
.interactive-element:hover {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3);
  transition: all 150ms ease;
}

.interactive-element:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

### 5.2 Click Feedback

#### Ripple Effect (Optional)

```css
.btn-ripple {
  position: relative;
  overflow: hidden;
}

.btn-ripple::after {
  content: "";
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 60%);
  transform: scale(0);
  opacity: 0;
  transition: transform 0.4s ease-out, opacity 0.4s ease-out;
}

.btn-ripple:active::after {
  transform: scale(2);
  opacity: 0;
  transition: 0s;
}
```

#### Scale Feedback

```css
.clickable:active {
  transform: scale(0.98);
  transition: transform 50ms ease;
}
```

**Touch Devices:**
```css
@media (hover: none) {
  .clickable:active {
    transform: scale(0.96);
    transition: transform 100ms ease;
  }
}
```

### 5.3 Drag States

#### Dragged Element

```css
.dragging {
  /* Rotation */
  transform: rotate(2deg) scale(1.02);

  /* Elevated shadow */
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);

  /* Slight opacity */
  opacity: 0.9;

  /* Transitions */
  transition: transform 100ms ease-out, box-shadow 100ms ease-out;
}
```

#### Ghost Placeholder

```css
.drag-placeholder {
  background: rgba(59, 130, 246, 0.1);
  border: 2px dashed var(--accent);
  border-radius: 6px;
  opacity: 0.5;
  animation: placeholder-pulse 1.5s infinite;
}

@keyframes placeholder-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}
```

#### Drop Zone Highlight

```css
.drop-zone-active {
  background: rgba(59, 130, 246, 0.08);
  border: 2px dashed var(--accent);
  transition: all 150ms ease-out;
}

.drop-zone-invalid {
  background: rgba(239, 68, 68, 0.08);
  border-color: var(--danger);
}
```

### 5.4 Success/Error Feedback

#### Success Animation

```css
@keyframes success-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
  }
}

.success-feedback {
  animation: success-pulse 0.6s ease-out;
}
```

#### Error Shake

```css
@keyframes error-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}

.error-feedback {
  animation: error-shake 0.4s ease-out;
  border-color: var(--danger) !important;
}
```

#### Checkmark Animation

```css
@keyframes checkmark-draw {
  0% { stroke-dashoffset: 24; }
  100% { stroke-dashoffset: 0; }
}

.checkmark-icon {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  animation: checkmark-draw 0.3s ease-out forwards;
}
```

### 5.5 Loading States

#### Skeleton Loading

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--border) 25%,
    rgba(255, 255, 255, 0.05) 50%,
    var(--border) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

**Skeleton Variants:**
```css
.skeleton-text { height: 14px; width: 60%; }
.skeleton-title { height: 18px; width: 80%; }
.skeleton-badge { height: 18px; width: 60px; }
.skeleton-bar { height: 24px; width: 100%; }
```

#### Spinner Placement

**Button Loading:**
```css
.btn-loading {
  position: relative;
  color: transparent;
}

.btn-loading::after {
  content: "";
  position: absolute;
  width: 16px;
  height: 16px;
  top: 50%;
  left: 50%;
  margin: -8px 0 0 -8px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

**Inline Loading:**
```css
.inline-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-left: 8px;
}
```

---

## 6. Error Handling

### 6.1 Optimistic Updates with Rollback

**Pattern:**
1. Apply change immediately to UI
2. Send request to backend
3. On success: confirm change
4. On failure: rollback UI, show error toast

**Implementation:**
```typescript
const useOptimisticUpdate = <T>(
  initialData: T,
  updateFn: (data: T) => Promise<void>
) => {
  const [data, setData] = useState(initialData);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = async (newData: T) => {
    const previousData = data;

    // Optimistic update
    setData(newData);
    setIsUpdating(true);
    setError(null);

    try {
      await updateFn(newData);
    } catch (err) {
      // Rollback
      setData(previousData);
      setError(err as Error);

      // Show error toast
      showToast({
        type: 'error',
        message: 'Failed to save changes',
        action: {
          label: 'Retry',
          onClick: () => update(newData)
        }
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return { data, update, isUpdating, error };
};
```

### 6.2 Network Error States

**Connection Lost Banner:**
```
+------------------------------------------------------------------+
| [!] Connection lost. Changes will sync when reconnected.  [Retry] |
+------------------------------------------------------------------+
```

**CSS:**
```css
.network-error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border-bottom: 1px solid var(--danger);
  color: #fca5a5;
  font-size: 0.875rem;
}
```

**Offline Mode Indicator:**
```css
.offline-indicator {
  position: fixed;
  bottom: 16px;
  left: 16px;
  padding: 8px 16px;
  background: var(--warning);
  color: #000;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  z-index: 1000;
  animation: fade-in 200ms ease-out;
}
```

### 6.3 Validation Error Display

#### Inline Validation

**Field Error:**
```css
.form-field.error input {
  border-color: var(--danger);
  background: rgba(239, 68, 68, 0.05);
}

.form-field.error .error-message {
  display: block;
  color: var(--danger);
  font-size: 0.75rem;
  margin-top: 4px;
}
```

**Visual:**
```
+------------------------------------------+
| Title                                    |
| [                                    ]   |
|   ^-- Red border                         |
| Title is required                        |
|   ^-- Error message in red               |
+------------------------------------------+
```

#### Form-Level Validation

```css
.validation-summary {
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--danger);
  border-radius: 6px;
  margin-bottom: 16px;
}

.validation-summary h4 {
  color: var(--danger);
  font-size: 0.875rem;
  margin-bottom: 8px;
}

.validation-summary ul {
  margin: 0;
  padding-left: 20px;
  font-size: 0.8rem;
  color: #fca5a5;
}
```

### 6.4 Toast Notifications

#### Toast Types

| Type | Icon | Border Color | Duration |
|------|------|-------------|----------|
| Success | Checkmark | `var(--success)` | 3000ms |
| Error | X Circle | `var(--danger)` | 5000ms (manual dismiss) |
| Warning | Triangle | `var(--warning)` | 4000ms |
| Info | Info Circle | `var(--accent)` | 3000ms |

#### Toast Animation

```css
.toast {
  animation: toast-slide-in 200ms ease-out;
}

.toast.exit {
  animation: toast-slide-out 200ms ease-in forwards;
}

@keyframes toast-slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes toast-slide-out {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}
```

#### Toast with Undo Action

```
+------------------------------------------+
| [Check] Task marked as done        [Undo]|
|         |--------------|                 |
|              ^-- Progress bar (5s)       |
+------------------------------------------+
```

**Implementation:**
```tsx
interface ToastWithUndo {
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number;
  onUndo?: () => void;
  undoLabel?: string;
}

const ToastWithUndo = ({ message, duration, onUndo, undoLabel = 'Undo' }) => {
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(r => Math.max(0, r - 100));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="toast">
      <span>{message}</span>
      {onUndo && (
        <button onClick={onUndo}>{undoLabel}</button>
      )}
      <div
        className="toast-progress"
        style={{ width: `${(remaining / duration) * 100}%` }}
      />
    </div>
  );
};
```

---

## 7. Accessibility Requirements

### 7.1 WCAG 2.1 AA Compliance

#### Success Criteria Checklist

| Criterion | Description | Implementation |
|-----------|-------------|----------------|
| 1.4.3 | Contrast (Minimum) 4.5:1 | All text meets contrast requirements |
| 1.4.11 | Non-text Contrast 3:1 | UI components and graphics |
| 2.1.1 | Keyboard | All functionality available via keyboard |
| 2.1.2 | No Keyboard Trap | Focus can move freely |
| 2.4.3 | Focus Order | Logical focus sequence |
| 2.4.7 | Focus Visible | Clear focus indicators |
| 4.1.2 | Name, Role, Value | Proper ARIA attributes |

### 7.2 Keyboard Navigation Patterns

#### Tab Order

```
Header -> Team Tabs -> Search -> Filters -> View Tabs -> Main Content
```

**Within Board View:**
```
Column 1 Cards -> Column 2 Cards -> ... -> Column N Cards
```

**Within List View:**
```
Header Row (sortable columns) -> Table Rows (sequential)
```

**Within Timeline View:**
```
Zoom Controls -> Task Rows (sequential) -> Task Bars
```

#### Arrow Key Navigation

**Board View:**
- Up/Down: Navigate between cards in column
- Left/Right: Move between columns

**List View:**
- Up/Down: Navigate between rows
- Tab: Move between cells

**Timeline View:**
- Up/Down: Navigate between task rows
- Left/Right: Adjust dates (when editing)

### 7.3 Screen Reader Announcements

#### Live Regions

**Filter Changes:**
```html
<div aria-live="polite" aria-atomic="true">
  Showing 15 tasks matching current filters
</div>
```

**Selection Changes:**
```html
<div aria-live="polite">
  5 items selected
</div>
```

**Drag and Drop:**
```html
<div aria-live="assertive">
  Task "API Integration" moved to In Progress column
</div>
```

#### ARIA Labels

**Board Column:**
```html
<div
  role="region"
  aria-label="In Progress column, 5 items"
  aria-describedby="column-instructions"
>
  <span id="column-instructions" class="sr-only">
    Use arrow keys to navigate between cards.
    Press Space to pick up a card for dragging.
  </span>
</div>
```

**List Row:**
```html
<tr
  role="row"
  aria-selected="false"
  aria-label="Task: API Integration, Priority 2, Status In Progress, Due Jan 15"
>
```

**Timeline Bar:**
```html
<div
  role="button"
  aria-label="API Integration, January 10 to January 20, 50% complete"
  aria-describedby="bar-instructions"
>
```

### 7.4 Focus Indicators

**Standard Focus:**
```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

**High Contrast Focus:**
```css
@media (prefers-contrast: more) {
  :focus-visible {
    outline: 3px solid currentColor;
    outline-offset: 3px;
  }
}
```

**Custom Focus Styles:**
```css
.board-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
}

.list-row:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  background: rgba(59, 130, 246, 0.1);
}

.gantt-bar:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  z-index: 4;
}
```

### 7.5 Reduced Motion Support

**Detection:**
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Motion-Safe Utilities:**
```css
/* Only animate when motion is acceptable */
@media (prefers-reduced-motion: no-preference) {
  .animate-on-hover:hover {
    transform: translateY(-2px);
    transition: transform 150ms ease-out;
  }

  .toast-enter {
    animation: toast-slide-in 200ms ease-out;
  }
}

/* Always provide non-motion feedback */
.animate-on-hover:hover {
  background: rgba(255, 255, 255, 0.05);
}
```

**JavaScript Check:**
```typescript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

const animationDuration = prefersReducedMotion ? 0 : 200;
```

---

## 8. Design Tokens Summary

### 8.1 Animation Timing

```css
:root {
  /* Durations */
  --duration-instant: 50ms;
  --duration-fast: 100ms;
  --duration-normal: 150ms;
  --duration-slow: 200ms;
  --duration-slower: 300ms;

  /* Easings */
  --ease-out: ease-out;
  --ease-in-out: ease-in-out;
  --ease-spring: cubic-bezier(0.2, 0, 0, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### 8.2 Interaction States

```css
:root {
  /* Hover */
  --hover-lift: translateY(-2px);
  --hover-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  --hover-bg: rgba(255, 255, 255, 0.02);

  /* Active */
  --active-scale: scale(0.98);
  --active-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

  /* Drag */
  --drag-rotate: rotate(2deg);
  --drag-scale: scale(1.02);
  --drag-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  --drag-opacity: 0.9;

  /* Focus */
  --focus-ring: 2px solid var(--accent);
  --focus-ring-offset: 2px;
}
```

### 8.3 Z-Index Scale

```css
:root {
  --z-base: 0;
  --z-dropdown: 10;
  --z-sticky: 20;
  --z-fixed: 30;
  --z-modal-backdrop: 40;
  --z-modal: 50;
  --z-popover: 60;
  --z-tooltip: 70;
  --z-toast: 80;
  --z-drag: 100;
}
```

---

## Appendix A: Framer Motion Recipes

### Card Drag Animation

```tsx
import { motion, useDragControls } from 'framer-motion';

const DraggableCard = ({ card, onDragEnd }) => {
  const controls = useDragControls();

  return (
    <motion.div
      drag
      dragControls={controls}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.1}
      whileDrag={{
        scale: 1.02,
        rotate: 2,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        zIndex: 100
      }}
      onDragEnd={(_, info) => onDragEnd(card.id, info)}
      layout
      layoutId={card.id}
      transition={{
        layout: { duration: 0.2, ease: [0.2, 0, 0, 1] }
      }}
    >
      {/* Card content */}
    </motion.div>
  );
};
```

### View Transition

```tsx
import { AnimatePresence, motion } from 'framer-motion';

const ViewContainer = ({ activeView, children }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeView}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
```

### Staggered List Animation

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" }
  }
};

const StaggeredList = ({ items }) => (
  <motion.ul variants={containerVariants} initial="hidden" animate="visible">
    {items.map(item => (
      <motion.li key={item.id} variants={itemVariants}>
        {item.content}
      </motion.li>
    ))}
  </motion.ul>
);
```

---

## Appendix B: Implementation Checklist

### Board View
- [ ] Card drag initiation (mouse + touch)
- [ ] Ghost placeholder during drag
- [ ] Drop zone highlighting
- [ ] Reorder animation within column
- [ ] Cross-column move with status update
- [ ] Column collapse/expand
- [ ] Add card inline form
- [ ] Mobile swipe navigation

### List View
- [ ] Single column sort
- [ ] Multi-column sort (Shift+click)
- [ ] Single row selection
- [ ] Multi-select (Ctrl/Cmd+click)
- [ ] Range select (Shift+click)
- [ ] Bulk action bar appearance
- [ ] Inline cell editing
- [ ] Checkbox states (all, some, none)

### Timeline View
- [ ] Task bar horizontal drag
- [ ] Task bar edge resize
- [ ] Zoom slider with smooth scaling
- [ ] Scroll to today
- [ ] Dependency line hover highlight
- [ ] Swimlane collapse/expand
- [ ] Drag tooltip with live dates

### Cross-View
- [ ] View switcher tabs
- [ ] Fade transition animation
- [ ] Filter state persistence
- [ ] Keyboard shortcut handler
- [ ] Focus restoration on view switch
- [ ] Modal focus trap

### Micro-animations
- [ ] Hover lift effect
- [ ] Click scale feedback
- [ ] Drag rotation and shadow
- [ ] Success pulse animation
- [ ] Error shake animation
- [ ] Skeleton loading states
- [ ] Toast slide-in/out

### Accessibility
- [ ] Focus indicators all elements
- [ ] Screen reader live regions
- [ ] ARIA labels for complex components
- [ ] Keyboard navigation complete
- [ ] Reduced motion support
- [ ] Color contrast verification

### Error Handling
- [ ] Optimistic update with rollback
- [ ] Network error banner
- [ ] Inline validation errors
- [ ] Toast notifications
- [ ] Undo functionality

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-08 | UI/UX Wizard | Initial specification |
