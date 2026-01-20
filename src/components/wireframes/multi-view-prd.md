# Multi-View System - Product Requirements Document

## Document Information

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Date | 2026-01-08 |
| Status | Draft |
| Owner | Product Team |

---

## 1. Overview

### 1.1 Feature Summary

The Multi-View System enables users to visualize and interact with CEO Dashboard task data through three distinct views:

- **Board View**: Kanban-style columns organized by task status
- **List View**: Sortable tabular display with inline editing
- **Timeline View**: Gantt chart visualization (current implementation)

All views share the same underlying data (`Bead[]`) and maintain synchronized filter, search, and edit states. Users can seamlessly switch between views while preserving their context and workflow.

### 1.2 Business Goals

1. **Increase user productivity** by providing the optimal view for different workflows (planning vs. execution vs. review)
2. **Reduce context switching** by maintaining state across view transitions
3. **Support diverse work styles** - some users prefer visual timelines, others prefer lists or boards
4. **Improve task discoverability** through multiple data organization paradigms
5. **Enable faster status updates** through drag-and-drop in Board view

### 1.3 Target Users

| User Type | Primary View | Use Case |
|-----------|--------------|----------|
| **Executives** | Timeline | Reviewing quarterly roadmaps, identifying schedule conflicts |
| **Project Managers** | Board | Daily standups, sprint planning, monitoring work distribution |
| **Team Leads** | List | Bulk status updates, priority adjustments, finding specific tasks |
| **Individual Contributors** | Board/List | Managing personal workload, updating task status |

---

## 2. View Types and Data Display

### 2.1 Board View

**Purpose**: Quick visual assessment of work distribution across statuses; drag-and-drop status updates.

#### Column Structure

| Column | Maps to Status | Color Accent |
|--------|----------------|--------------|
| Backlog | `open` (default) | Blue (#1e3a8a) |
| Todo | `open` (filtered) | Blue (#2563eb) |
| In Progress | `in_progress` | Amber (#713f12) |
| Done | `closed` | Green (#14532d) |
| Blocked | `blocked` | Red (#7f1d1d) |

**Note**: "Backlog" and "Todo" both map to `open` status. Differentiation is handled by priority or custom labels if needed in future iterations. MVP treats all `open` items as a single column.

#### Card Content (from GanttTask/Bead)

```
+------------------------------------------+
| [P] Task Title Goes Here            [TM] |
|     Truncated if too long...             |
+------------------------------------------+
|  Due: Jan 15  |  @assignee  |  [epic]    |
+------------------------------------------+
```

| Card Element | Data Source | Display Rule |
|--------------|-------------|--------------|
| Priority Badge | `bead.priority` (0-4) | Always visible, color-coded |
| Title | `bead.title` | Max 2 lines, truncate with ellipsis |
| Team Badge | `bead.team` | 3-4 char code, uppercase |
| Due Date | `bead.due_at` | Format: "MMM d" or "Overdue" if past |
| Assignee | `bead.assignee` | Prefixed with "@", or dash if null |
| Issue Type | `bead.issue_type` | Small badge: Epic/Feature/Task/Bug |

#### Grouping Logic

- Primary grouping: By `status` field
- Within column: Sorted by `priority` ASC, then `due_at` ASC
- Deferred items (`deferred` status) shown in a collapsed "Deferred" section at end

### 2.2 List View

**Purpose**: Efficient scanning, sorting, and bulk operations on tasks.

#### Column Definitions

| Column | Data Source | Width | Sortable | Editable |
|--------|-------------|-------|----------|----------|
| Checkbox | selection state | 40px | No | N/A |
| Title | `bead.title` | flex 1 (min 200px) | Yes (A-Z) | Yes (inline) |
| Status | `bead.status` | 100px | Yes (custom order) | Yes (dropdown) |
| Priority | `bead.priority` | 50px | Yes (0-4) | Yes (dropdown) |
| Due Date | `bead.due_at` | 90px | Yes (date) | Yes (date picker) |
| Assignee | `bead.assignee` | 100px | Yes (A-Z) | Yes (dropdown) |
| Team | `bead.team` | 60px | Yes (A-Z) | No (display only) |

#### Status Sort Order

When sorting by status, use this sequence (most urgent first):
1. `blocked` (requires immediate attention)
2. `in_progress` (active work)
3. `open` (pending)
4. `deferred` (postponed)
5. `closed` (completed)

#### Visible Metadata

- Row highlight for overdue items (red left border)
- Row strikethrough/opacity for closed items
- Selection count in footer when items selected

### 2.3 Timeline View (Current Implementation Reference)

**Purpose**: Visualize task schedules, dependencies, and progress over time.

The Timeline view is the current implementation in `GanttChart.tsx`. It includes:

- Hierarchical task display with collapse/expand
- Drag to move or resize task bars
- Zoom slider (8px to 48px per day)
- Weekend highlighting
- Today line indicator
- Dependency arrows (SVG bezier curves)
- Progress bar within task bars

**No changes required** to Timeline view behavior for MVP. Integration focuses on view switching and state sharing.

### 2.4 Data Mapping: GanttTask/Bead to Views

```typescript
interface ViewDataMapping {
  // Bead fields used across all views
  common: {
    id: 'bead.id',
    title: 'bead.title',
    status: 'bead.status',
    priority: 'bead.priority',
    team: 'bead.team',
    assignee: 'bead.assignee',
    issue_type: 'bead.issue_type',
  },

  // Timeline-specific (GanttTask extensions)
  timeline: {
    start: 'Parsed from title or created_at',
    end: 'Parsed from title, due_at, or calculated',
    progress: 'Derived from status (0/50/100)',
    timeProgress: 'Calculated from elapsed time',
    depth: 'Hierarchy depth from dependencies',
    dependencies: 'From Dependency[] with type="blocks"',
  },

  // Board-specific
  board: {
    columnId: 'Derived from bead.status',
    cardOrder: 'Calculated from priority + due_at',
  },

  // List-specific
  list: {
    isSelected: 'UI state (Set<string>)',
    sortValue: 'Column-specific accessor',
  },
}
```

---

## 3. View Persistence

### 3.1 URL Routing Strategy

Views are controlled via query parameter to support deep linking and browser navigation.

| URL Pattern | Active View |
|-------------|-------------|
| `/dashboard?view=board` | Board View |
| `/dashboard?view=list` | List View |
| `/dashboard?view=timeline` | Timeline View |
| `/dashboard` (no param) | Last viewed or Timeline (default) |

**Query Parameter Behavior**:
- Changing view updates URL without page reload (via `history.pushState`)
- Browser back/forward navigates between views
- Bookmarkable URLs for specific views

### 3.2 localStorage Keys

```typescript
const STORAGE_KEYS = {
  // Global (shared across views)
  activeView: 'gantt-active-view',           // 'board' | 'list' | 'timeline'
  searchQuery: 'gantt-search-query',         // string
  statusFilter: 'gantt-status-filter',       // string | string[]

  // Board View specific
  boardColumnOrder: 'gantt-board-columns',   // string[] (column IDs)
  boardCollapsedColumns: 'gantt-board-collapsed', // string[]

  // List View specific
  listSortColumn: 'gantt-list-sort-col',     // string (column name)
  listSortDirection: 'gantt-list-sort-dir',  // 'asc' | 'desc'
  // Note: selectedIds are NOT persisted (transient)

  // Timeline View specific (existing)
  timelineCollapsed: 'gantt-collapsed-tasks', // string[] (task IDs)
  timelineZoomIndex: 'gantt-zoom-index',      // number (0-5)
};
```

### 3.3 What State Persists

| State | Persisted? | Scope | Rationale |
|-------|------------|-------|-----------|
| Active view | Yes | Global | User preference |
| Search query | Yes | Global | User expects search to persist |
| Status filter | Yes | Global | Filter intent carries across views |
| Sort column/direction | Yes | List only | Different columns per view |
| Collapsed tasks | Yes | Timeline only | Hierarchy state is view-specific |
| Zoom level | Yes | Timeline only | View-specific display preference |
| Column order | Yes | Board only | Custom column arrangement |
| Selected items | No | List only | Transient selection state |
| Scroll position | No | Per-view | Restored within session only |

### 3.4 Deep Linking Support

**Supported Parameters**:
```
/dashboard?view=board&status=in_progress&search=api
```

| Parameter | Description | Valid Values |
|-----------|-------------|--------------|
| `view` | Active view | `board`, `list`, `timeline` |
| `status` | Status filter | `open`, `in_progress`, `closed`, `blocked`, `deferred`, comma-separated |
| `search` | Search query | URL-encoded string |
| `team` | Team filter | Team code (e.g., `eng`, `pm`) |
| `task` | Focus task | Task ID (opens edit modal) |

**Future Consideration**: Additional parameters for sort, date range, assignee filters.

---

## 4. Cross-View Consistency Requirements

### 4.1 Search Query Shared Across Views

- Single search input in control bar
- Query persists when switching views
- Filters tasks by `title` field (case-insensitive contains)
- Same filtered result set displayed regardless of view

### 4.2 Filter State Shared Across Views

- Status filter dropdown affects all views
- Priority filter (future) affects all views
- Team filter (via team tabs) affects all views
- Date range filter (future) affects all views

**Shared Filter State Interface**:
```typescript
interface SharedFilterState {
  searchQuery: string;
  statusFilter: string[];    // Empty = all statuses
  teamFilter: string | null; // null = all teams (from tab selection)
  priorityFilter: number[];  // Empty = all priorities (future)
  dateRange: {               // Future enhancement
    start: Date | null;
    end: Date | null;
  } | null;
}
```

### 4.3 Selection State

**Decision**: Selection is view-specific, not shared.

**Rationale**:
- List view uses checkbox selection for bulk actions
- Board view uses single-card focus for drag operations
- Timeline view uses task bar focus for editing
- Sharing selection across views creates confusion

**Behavior**:
- Switching views clears List view selection
- Each view maintains its own focus/selection model

### 4.4 Edit Changes Reflect Immediately

When a task is edited via the EditModal:
1. All views receive the updated data
2. Board view: Card re-sorts or moves columns if status changed
3. List view: Row updates in place, re-sorts if needed
4. Timeline view: Bar position/duration updates if dates changed

**Implementation Note**: Use React state/context to propagate changes. The `onUpdate` callback already handles persistence; views must subscribe to the same data source.

---

## 5. Feature Parity Matrix

| Feature | Board | List | Timeline | Notes |
|---------|:-----:|:----:|:--------:|-------|
| **View Items** | Y | Y | Y | All views display filtered tasks |
| **Search** | Y | Y | Y | Shared search query |
| **Status Filter** | Y | Y | Y | Shared filter state |
| **Priority Filter** | Y | Y | Y | Future: shared |
| **Team Filter** | Y | Y | Y | Via team tabs |
| **Sort** | - | Y | Y | Board: fixed by priority; List: any column; Timeline: hierarchy |
| **Multi-select** | - | Y | - | List only: checkboxes |
| **Bulk Actions** | - | Y | - | List only: mark done, change priority |
| **Drag to Move** | Y | - | Y | Board: between columns; Timeline: horizontal |
| **Drag to Resize** | - | - | Y | Timeline only: adjust dates |
| **Inline Edit** | Y* | Y | - | Board: title only; List: multiple cells |
| **Click to Edit** | Y | Y | Y | Opens EditModal |
| **Collapse/Expand** | Y* | - | Y | Board: columns; Timeline: parent tasks |
| **Dependencies** | - | - | Y | Timeline only: arrow visualization |
| **Progress Bar** | - | - | Y | Timeline only: in-bar progress |
| **Zoom** | - | - | Y | Timeline only |
| **Keyboard Nav** | Y | Y | Y | Arrow keys, shortcuts |
| **Touch Support** | Y | Y | Y* | Timeline: limited drag support |

*Legend: Y = Supported, - = Not applicable, Y* = Partial/Limited*

---

## 6. Performance Targets

### 6.1 View Switch Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| View switch latency | < 100ms | Time from click to content visible |
| Animation duration | 200ms | CSS transition for fade |
| First meaningful paint | < 100ms | Content starts rendering |

**Implementation Requirements**:
- Pre-render inactive views if < 500 items
- Use CSS opacity transition (GPU accelerated)
- Avoid layout thrashing during transition

### 6.2 Initial Load Performance

| Metric | Target | Dataset |
|--------|--------|---------|
| Time to interactive | < 500ms | 100 tasks |
| Time to interactive | < 1000ms | 500 tasks |
| Time to interactive | < 2000ms | 1000 tasks |

**Implementation Requirements**:
- Lazy load view components
- Defer dependency line rendering in Timeline
- Use virtual scrolling for List view beyond 100 items

### 6.3 Filter Application Performance

| Metric | Target |
|--------|--------|
| Filter response | < 50ms |
| Search debounce | 150ms |
| Result update | < 50ms |

**Implementation Requirements**:
- Memoize filtered results (`useMemo`)
- Debounce search input
- Avoid re-calculating unaffected view data

### 6.4 Virtualization Requirements

| View | Threshold | Strategy |
|------|-----------|----------|
| Board | 50+ cards per column | Virtual scroll within column |
| List | 100+ rows | Virtual list (react-window or similar) |
| Timeline | 200+ tasks | Virtual rows + viewport-based bar rendering |

**Large Dataset Handling (500+ items)**:
- Implement windowing for visible rows only
- Lazy render off-screen content
- Batch DOM updates
- Use `will-change: transform` for animated elements

---

## 7. User Stories

### 7.1 View Navigation

**US-1**: As a project manager, I want to switch between Board and Timeline views without losing my search filters, so that I can see the same filtered data in different formats.

**Acceptance Criteria**:
- View switcher tabs visible in control bar
- Click tab changes view within 100ms
- Search query preserved across views
- Status filter preserved across views

---

**US-2**: As a team lead, I want to bookmark a specific view configuration, so that I can quickly return to my preferred setup.

**Acceptance Criteria**:
- URL reflects current view (query param)
- URL is bookmarkable and shareable
- Opening bookmarked URL restores view and filters

---

### 7.2 Board View Specific

**US-3**: As a PM, I want to view my tasks in a kanban board organized by status, so that I can quickly see the distribution of work across stages.

**Acceptance Criteria**:
- Columns labeled by status
- Cards show task title, priority, team, due date
- Column shows item count in header
- Cards sorted by priority within column

---

**US-4**: As a team member, I want to drag a card from "In Progress" to "Done" to update its status, so that I can quickly mark work complete.

**Acceptance Criteria**:
- Card is draggable between columns
- Dropping card updates status field
- Change persists to database
- Card animates to new position
- Rollback on save failure with error toast

---

**US-5**: As a user, I want to collapse a column to minimize screen clutter, so that I can focus on active work.

**Acceptance Criteria**:
- Collapse button on column header
- Collapsed column shows only header (vertical text)
- Item count still visible when collapsed
- Collapse state persists across sessions

---

### 7.3 List View Specific

**US-6**: As an analyst, I want to sort tasks by due date to identify upcoming deadlines, so that I can prioritize review.

**Acceptance Criteria**:
- Clicking column header sorts by that column
- Sort indicator shows direction (asc/desc)
- Multiple clicks cycle: asc -> desc -> none
- Sort persists within session

---

**US-7**: As a team lead, I want to select multiple tasks and mark them all as "Done", so that I can efficiently update completed work.

**Acceptance Criteria**:
- Checkbox on each row
- Header checkbox for select all
- Footer shows selection count
- "Mark Done" bulk action button
- Action updates all selected tasks
- Undo option via toast notification

---

**US-8**: As a user, I want to inline-edit a task's priority without opening a modal, so that I can make quick adjustments.

**Acceptance Criteria**:
- Double-click priority cell to edit
- Dropdown appears with priority options
- Change saves on selection/blur
- Row highlights during edit mode

---

### 7.4 Cross-View

**US-9**: As a user, I want my search query to persist when I switch from Board to List view, so that I continue working with the same filtered set.

**Acceptance Criteria**:
- Search input in shared control bar
- Query persists across view switches
- Filtered count shown (e.g., "15 of 50 tasks")

---

**US-10**: As an executive, I want changes I make in Board view to immediately reflect in Timeline view, so that I have confidence in data consistency.

**Acceptance Criteria**:
- Edit task status via Board drag
- Switch to Timeline view
- Task bar reflects new status (progress/color)
- No page refresh required

---

## 8. Edge Cases

### 8.1 Empty States

| View | Condition | Display |
|------|-----------|---------|
| Board | No tasks match filters | Empty columns with "No tasks" message |
| Board | Column has no items | Column shown with "No tasks in [status]" |
| List | No tasks match filters | Empty table with illustration and message |
| Timeline | No tasks match filters | Empty timeline with "No tasks to display" |
| All | No data loaded | Skeleton loading state |
| All | Search with no results | "No tasks match '[query]'" with clear button |

**Empty State Message Template**:
```
No tasks found

{condition-specific message}

[Clear Filters] button (if filters active)
```

### 8.2 Error States

| Scenario | User Feedback | Recovery Action |
|----------|---------------|-----------------|
| Network error on load | Error banner with retry | Retry button |
| Network error on save | Toast with error message | Auto-retry with exponential backoff |
| Validation error (edit) | Inline field error | Highlight field, show message |
| Drag drop failure | Card returns to original position | Show error toast |
| Invalid filter params | Ignore invalid, show valid | URL sanitization |

**Error Banner Template**:
```
[Warning Icon] Failed to load tasks. Check your connection and try again.
[Retry] [Dismiss]
```

### 8.3 Large Dataset Handling

| Item Count | Strategy |
|------------|----------|
| < 100 | Full render, no optimization needed |
| 100-500 | Memoization, debounced filters |
| 500-1000 | Virtual scrolling, deferred dependency rendering |
| > 1000 | Pagination or infinite scroll, server-side filtering |

**Performance Degradation Warning**:
If rendering > 500 items takes > 2 seconds, show:
```
Loading large dataset... Consider filtering to improve performance.
```

### 8.4 Concurrent Edits (Multiple Tabs)

**Scenario**: User has dashboard open in two tabs and edits the same task in both.

**Behavior**:
1. Last write wins (standard optimistic update)
2. No real-time sync between tabs (MVP)
3. Refresh shows latest data from server

**Future Enhancement**: WebSocket sync for real-time collaboration

### 8.5 Conflicting Filter States

**Scenario**: URL has `?status=closed` but localStorage has `status=open`.

**Resolution Priority**:
1. URL parameters (highest) - explicit user intent
2. Session state (if URL empty)
3. localStorage (if session empty)
4. Defaults (if nothing stored)

---

## 9. Acceptance Criteria

### 9.1 MVP (v1) Criteria

**View Switching**:
- [ ] View switcher tabs displayed in control bar
- [ ] Clicking tab switches view within 100ms
- [ ] URL updates with `?view=` parameter
- [ ] Browser back/forward works correctly
- [ ] Active tab visually highlighted

**Board View**:
- [ ] Columns render for each status
- [ ] Cards display: title, priority, team, due date
- [ ] Cards draggable between columns
- [ ] Drop updates task status and persists
- [ ] Column collapse/expand works
- [ ] Column item count displayed

**List View**:
- [ ] Table renders with all columns
- [ ] Sorting works on all sortable columns
- [ ] Multi-select with checkboxes works
- [ ] Bulk "Mark Done" action works
- [ ] Inline editing works for editable fields
- [ ] Row click opens edit modal

**State Persistence**:
- [ ] Active view persists to localStorage
- [ ] Search query shared across views
- [ ] Status filter shared across views
- [ ] View-specific state (sort, collapsed) persists

**Performance**:
- [ ] View switch < 100ms
- [ ] Initial load < 500ms (100 tasks)
- [ ] Filter application < 50ms

### 9.2 v2 Criteria (Enhanced Features)

- [ ] Custom column ordering in Board view
- [ ] Column reordering via drag in Board view
- [ ] Multi-column sort in List view
- [ ] Priority filter dropdown
- [ ] Assignee filter dropdown
- [ ] Date range filter
- [ ] Saved filter presets
- [ ] Keyboard shortcuts for view switching
- [ ] Virtual scrolling for 500+ items
- [ ] Touch gesture support on mobile
- [ ] Swipe to change status on mobile Board view

### 9.3 Definition of Done Checklist

For any feature to be considered complete:

- [ ] Code implemented and passes linting
- [ ] TypeScript types defined (no `any` escapes)
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests for critical paths
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] Performance targets met
- [ ] Responsive design verified (mobile, tablet, desktop)
- [ ] Error states handled
- [ ] Loading states implemented
- [ ] Documentation updated
- [ ] Code reviewed and approved

---

## 10. Out of Scope

### 10.1 Explicitly NOT in MVP

| Feature | Reason | Future Consideration |
|---------|--------|---------------------|
| Real-time sync | Complexity, requires WebSocket infra | v3+ |
| Custom views/layouts | MVP focuses on standard patterns | v2+ |
| Export to CSV/PDF | Not core to view switching | v2 |
| Print optimization | Low priority | v2+ |
| Undo/redo stack | Complexity | v2 |
| Offline support | Requires service worker | v3+ |
| Custom fields | Schema changes needed | v3+ |
| Subtask creation inline | Hierarchy complexity | v2 |
| Time tracking | Different feature set | Separate feature |
| Comments/activity | Different feature set | Separate feature |
| File attachments | Different feature set | Separate feature |

### 10.2 Known Limitations

1. **Dependency visualization**: Only Timeline view shows dependency arrows
2. **Hierarchy editing**: Cannot create parent-child relationships from Board/List
3. **Date editing**: Only Timeline supports drag-to-resize dates
4. **Bulk date changes**: Not supported in any view (individual only)
5. **Column customization**: Board columns are fixed to status values

### 10.3 Future Considerations

**v2 Roadmap Items**:
- Saved views (personal and shared)
- Custom Board columns (by priority, team, etc.)
- Swimlanes in Board view
- Compact/comfortable density toggle
- Calendar view (month grid)
- Export functionality

**v3+ Roadmap Items**:
- Real-time collaboration
- Custom fields and views
- Automation rules
- Integrations (Slack, GitHub, etc.)

---

## Appendix A: Related Documents

| Document | Location | Description |
|----------|----------|-------------|
| View Layouts Wireframe | `view-layouts.md` | Detailed wireframes for all views |
| Filter Panel Spec | `filter-panel.md` | Filter UI/UX specification |
| Progress Indicators | `progress-indicators.md` | Progress and health status UI |
| Interaction Patterns | `interaction-patterns.md` | Animation and interaction details |
| Type Definitions | `src/lib/types.ts` | GanttTask, Bead, Dependency types |
| Current Implementation | `src/components/GanttChart.tsx` | Timeline view source |

---

## Appendix B: Technical Notes

### Component Architecture (Proposed)

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
    FilterBar.tsx             # Search and filter controls
  hooks/
    useViewState.ts           # State persistence hook
    useFilterState.ts         # Shared filter state
    useDragAndDrop.ts         # Shared drag logic
```

### State Management Pattern

```typescript
// Top-level state in GanttChart.tsx
const [activeView, setActiveView] = useState<'board' | 'list' | 'timeline'>('timeline');
const [sharedFilters, setSharedFilters] = useState<SharedFilterState>(initialFilters);

// View-specific state managed within each view component
// e.g., ListView manages its own sort state, selection state
// BoardView manages collapsed columns
// TimelineView manages zoom, collapsed tasks

// Data flows down via props, updates flow up via callbacks
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-08 | Product Team | Initial PRD |
