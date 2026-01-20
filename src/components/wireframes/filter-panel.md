# Filter Panel and Saved Views - Wireframe Specification

## Overview

This specification defines the UI/UX design for an enhanced filtering system in the CEO Dashboard Gantt chart. The design follows Linear-style patterns with horizontal filter chips, quick presets, and persistent saved views.

---

## 1. Filter Bar Layout

### Design Goal
Users should quickly filter tasks without interrupting their workflow. The filter bar must feel lightweight and non-intrusive while providing powerful filtering capabilities.

### Visual Layout

```
+-----------------------------------------------------------------------------------+
|  [Search icon] Search tasks...  | [Status v] [Priority v] [Assignee v] [+] | [Clear All] |  [Saved Views v] [Save]  |
+-----------------------------------------------------------------------------------+
|  Active Filters: [Status: In Progress x] [Priority: 0-1 x] [Due: This Week x]     |
+-----------------------------------------------------------------------------------+
```

### Component Structure

```
.filter-bar                         // Full-width container, fixed below header
  .filter-bar-left                  // Search + filter dropdowns
    .filter-search                  // Search input with icon
    .filter-dropdowns               // Filter dropdown buttons
      .filter-dropdown              // Individual dropdown trigger
    .filter-add-btn                 // "+" button for additional filters
  .filter-bar-right                 // Clear all + Saved views
    .filter-clear-all               // Clear all filters button
    .filter-divider                 // Visual separator
    .saved-views-section            // Saved views dropdown + save button

.active-filters-row                 // Second row showing active filter chips
  .filter-chip                      // Individual active filter
```

### Spacing and Dimensions

| Element | Height | Padding | Gap |
|---------|--------|---------|-----|
| Filter Bar | 48px | 12px 16px | - |
| Search Input | 36px | 8px 12px | - |
| Dropdown Button | 32px | 6px 12px | 8px between |
| Active Filters Row | 40px | 8px 16px | - |
| Filter Chip | 28px | 4px 10px | 6px between |

### Visual Hierarchy Rationale

1. **Search input** takes left position and flex-grows to accommodate longer queries
2. **Filter dropdowns** are grouped together as secondary controls
3. **Saved views** positioned on the right as a utility action
4. **Active filters row** appears conditionally only when filters are active, providing clear feedback

---

## 2. Filter Types

### 2.1 Status Filter

**Options:**
- All Statuses (default)
- Open
- In Progress
- Closed
- Blocked
- Deferred

**Multi-select:** Yes - users can select multiple statuses

**Visual Indicator:** Color-coded dots matching status badge colors

```
+------------------------+
| Status            [v]  |
+------------------------+
|  [ ] All Statuses      |
|  [x] Open         (12) |  <- Blue dot
|  [x] In Progress   (8) |  <- Yellow dot
|  [ ] Closed       (24) |  <- Green dot
|  [ ] Blocked       (3) |  <- Red dot
|  [ ] Deferred      (5) |  <- Gray dot
+------------------------+
```

### 2.2 Priority Filter

**Options:**
- All Priorities (default)
- P0 - Critical
- P1 - High
- P2 - Medium
- P3 - Low
- P4 - None

**Multi-select:** Yes - range selection supported (e.g., P0-P2)

**Visual Indicator:** Priority badge colors

```
+------------------------+
| Priority          [v]  |
+------------------------+
|  [ ] All Priorities    |
|  [x] P0 Critical   (2) |  <- Red badge
|  [x] P1 High       (5) |  <- Orange badge
|  [ ] P2 Medium    (15) |  <- Yellow badge
|  [ ] P3 Low       (20) |  <- Blue badge
|  [ ] P4 None      (10) |  <- Gray badge
+------------------------+
```

### 2.3 Assignee Filter

**Options:**
- All Assignees (default)
- Unassigned
- [Dynamic list of assignees from data]

**Multi-select:** Yes

**Visual Indicator:** Avatar initials or placeholder

```
+------------------------+
| Assignee          [v]  |
+------------------------+
|  [Search assignees...] |
|  [ ] All Assignees     |
|  [ ] Unassigned   (12) |
|  --------------------- |
|  [x] Alice Chen    (8) |  <- AC avatar
|  [ ] Bob Smith     (5) |  <- BS avatar
|  [ ] Carol Wu     (10) |  <- CW avatar
+------------------------+
```

### 2.4 Due Date Filter

**Options:**
- Any Date (default)
- Overdue
- Due Today
- Due This Week
- Due This Month
- Due This Quarter
- Custom Range...

**Multi-select:** No - single selection

**Visual Indicator:** Calendar icon for custom range

```
+------------------------+
| Due Date          [v]  |
+------------------------+
|  ( ) Any Date          |
|  ( ) Overdue       (3) |  <- Red indicator
|  ( ) Due Today     (2) |
|  (*) Due This Week (8) |
|  ( ) Due This Month(15)|
|  ( ) Due This Quarter  |
|  --------------------- |
|  [ ] Custom Range...   |  <- Opens date picker
+------------------------+
```

**Custom Range Picker:**
```
+--------------------------------+
| Custom Date Range              |
+--------------------------------+
|  From: [Jan 15, 2026    ] [C]  |
|  To:   [Jan 31, 2026    ] [C]  |
+--------------------------------+
|        [Cancel]  [Apply]       |
+--------------------------------+
```

### 2.5 Labels/Tags Filter (Expandable)

**Options:** Dynamic from data

**Multi-select:** Yes

```
+------------------------+
| Labels            [v]  |
+------------------------+
|  [Search labels...]    |
|  [ ] All Labels        |
|  --------------------- |
|  [x] frontend      (8) |
|  [ ] backend      (12) |
|  [ ] infrastructure(5) |
|  [ ] documentation (3) |
+------------------------+
```

### 2.6 Issue Type Filter

**Options:**
- All Types (default)
- Epic
- Feature
- Task
- Bug

**Multi-select:** Yes

```
+------------------------+
| Type              [v]  |
+------------------------+
|  [ ] All Types         |
|  [x] Epic          (4) |  <- Purple indicator
|  [ ] Feature      (12) |  <- Blue indicator
|  [x] Task         (30) |  <- Green indicator
|  [ ] Bug           (8) |  <- Red indicator
+------------------------+
```

### 2.7 Team Filter

**Options:** Dynamic from available teams

**Multi-select:** Yes (for cross-team views)

```
+------------------------+
| Team              [v]  |
+------------------------+
|  [ ] All Teams         |
|  [x] eng          (20) |
|  [ ] pm           (15) |
|  [ ] gtm          (12) |
|  [ ] fin           (8) |
+------------------------+
```

---

## 3. Filter Chips

### Design Goal
Active filters should be highly visible and easy to remove. Chips provide at-a-glance understanding of current filter state.

### Chip Anatomy

```
+----------------------------------+
|  [icon] Label: Value(s)    [x]  |
+----------------------------------+
     ^        ^        ^       ^
     |        |        |       |
   Type    Filter   Active   Remove
   Icon    Name     Values   Button
```

### States

**Default State:**
```css
.filter-chip {
  background: var(--border);          /* #2a2a2a */
  border: 1px solid var(--border);
  color: var(--fg);                   /* #ededed */
  border-radius: 14px;
  height: 28px;
  padding: 4px 10px 4px 8px;
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
```

**Hover State:**
```css
.filter-chip:hover {
  background: rgba(59, 130, 246, 0.15);
  border-color: var(--accent);
}
```

**Active/Focused State:**
```css
.filter-chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

**Remove Button Hover:**
```css
.filter-chip-remove:hover {
  background: rgba(239, 68, 68, 0.3);
  color: var(--danger);
}
```

### Chip Variations

**Single Value:**
```
[Status: In Progress x]
```

**Multiple Values (2-3):**
```
[Priority: P0, P1 x]
```

**Multiple Values (4+):**
```
[Status: 4 selected x]
```

**Date Range:**
```
[Due: Jan 15 - Jan 31 x]
```

**Relative Date:**
```
[Due: This Week x]
```

### Interaction Behavior

| Action | Behavior |
|--------|----------|
| Click chip body | Opens dropdown to edit filter |
| Click remove (x) | Removes filter immediately |
| Keyboard Enter on chip | Opens dropdown |
| Keyboard Delete/Backspace | Removes filter |
| Tab navigation | Moves between chips |

---

## 4. Quick Filter Presets

### Design Goal
Provide one-click access to commonly used filter combinations, reducing cognitive load for frequent operations.

### Visual Layout

```
+-----------------------------------------------------------------------------------+
|  Quick Filters:  [My Tasks] [Due This Week] [Blocked Items] [High Priority]  [...]|
+-----------------------------------------------------------------------------------+
```

### Preset Definitions

| Preset | Filters Applied | Icon |
|--------|----------------|------|
| My Tasks | assignee = current_user | User icon |
| Due This Week | due_date = this_week | Calendar icon |
| Blocked Items | status = blocked | Stop icon |
| High Priority | priority in [0, 1] | Flag icon |
| Overdue | due_date < today, status != closed | Warning icon |
| In Progress | status = in_progress | Play icon |

### Preset Button States

**Default:**
```css
.quick-filter-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
  border-radius: 16px;
  height: 28px;
  padding: 4px 12px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}
```

**Hover:**
```css
.quick-filter-btn:hover {
  background: var(--border);
  color: var(--fg);
  border-color: var(--muted);
}
```

**Active (filter applied):**
```css
.quick-filter-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}
```

### Interaction Behavior

| Action | Behavior |
|--------|----------|
| Click inactive preset | Applies preset filters, replaces current filters |
| Click active preset | Removes preset filters |
| Shift+Click | Adds preset filters to existing (AND logic) |
| Right-click | Context menu: Edit, Duplicate, Delete (for custom presets) |

---

## 5. Saved Views

### Design Goal
Allow users to save, name, and recall complex filter combinations. Support sharing views with team members.

### 5.1 Saved Views Dropdown

```
+--------------------------------+
| Saved Views             [v]    |
+--------------------------------+
|  [Search views...]             |
|  ----------------------------- |
|  PERSONAL VIEWS                |
|  [ ] My Active Work            |
|  [ ] Weekly Review             |
|  [ ] Bug Triage                |
|  ----------------------------- |
|  SHARED VIEWS                  |
|  [ ] Team Standup         (PM) |
|  [ ] Sprint Planning     (Eng) |
|  ----------------------------- |
|  [+] Create New View...        |
+--------------------------------+
```

### 5.2 Save View Modal

```
+----------------------------------------+
|  Save Current View              [x]    |
+----------------------------------------+
|                                        |
|  View Name:                            |
|  [My Custom View                    ]  |
|                                        |
|  Current Filters:                      |
|  - Status: Open, In Progress           |
|  - Priority: P0, P1                    |
|  - Team: eng                           |
|                                        |
|  Visibility:                           |
|  (*) Personal - Only you               |
|  ( ) Team - Share with [eng v]         |
|                                        |
|  [ ] Set as default view               |
|                                        |
+----------------------------------------+
|              [Cancel]  [Save View]     |
+----------------------------------------+
```

### 5.3 View List Item States

**Default:**
```
+------------------------------------------+
|  [ ] Weekly Review                        |
+------------------------------------------+
```

**Hover:**
```
+------------------------------------------+
|  [ ] Weekly Review              [...]    |
+------------------------------------------+
                                    ^
                                    More options menu
```

**Selected/Active:**
```
+------------------------------------------+
|  [*] Weekly Review              [...]    |
+------------------------------------------+
      ^
      Checkmark indicator
```

### 5.4 View Options Menu

```
+------------------------+
|  Apply View            |
|  ---------------       |
|  Edit View...          |
|  Rename...             |
|  Duplicate             |
|  ---------------       |
|  Share with Team...    |
|  Copy Link             |
|  ---------------       |
|  Delete View           |
+------------------------+
```

### 5.5 Edit View Modal

```
+----------------------------------------+
|  Edit View: Weekly Review       [x]    |
+----------------------------------------+
|                                        |
|  View Name:                            |
|  [Weekly Review                     ]  |
|                                        |
|  Included Filters:                     |
|  +-----------------------------------+ |
|  |  [Status v] [Priority v] [Due v] | |
|  +-----------------------------------+ |
|  |  [Status: Open, In Progress  x]  | |
|  |  [Due: This Week             x]  | |
|  +-----------------------------------+ |
|                                        |
|  Visibility:                           |
|  (*) Personal                          |
|  ( ) Team: [eng v]                     |
|                                        |
+----------------------------------------+
|        [Cancel]  [Delete]  [Save]      |
+----------------------------------------+
```

### Interaction Behavior

| Action | Behavior |
|--------|----------|
| Click view name | Applies view filters immediately |
| Click more options (...) | Opens options menu |
| Drag view | Reorders in list |
| Double-click view | Opens edit modal |

---

## 6. Advanced Filters

### Design Goal
Power users need complex filter logic. Provide AND/OR toggle and optional JQL-style query input for maximum flexibility.

### 6.1 AND/OR Toggle

**Location:** Appears when 2+ filters are active

```
+-----------------------------------------------------------------------------------+
|  Active Filters: [Status: Open x] [AND v] [Priority: P0-P1 x] [AND v] [Team: eng x]|
+-----------------------------------------------------------------------------------+
                                     ^
                                 Logic toggle
```

**Logic Dropdown:**
```
+----------+
|  AND     |  <- All conditions must match
|  OR      |  <- Any condition can match
+----------+
```

### 6.2 Filter Groups

For complex queries, support grouped conditions:

```
+-----------------------------------------------------------------------------------+
|  Group A: [Status: Open] AND [Priority: P0]                                       |
|     OR                                                                            |
|  Group B: [Status: Blocked] AND [Assignee: Me]                                    |
+-----------------------------------------------------------------------------------+
```

**Group Controls:**
```
+----------------------------------------------+
|  [+] Add Filter  |  [+] Add Group  |  [...]  |
+----------------------------------------------+
```

### 6.3 JQL-Style Query Input (Optional/Advanced)

**Toggle Location:** Gear icon in filter bar

```
+-----------------------------------------------------------------------------------+
|  [Query Mode: Advanced]                                                           |
+-----------------------------------------------------------------------------------+
|  status IN ("open", "in_progress") AND priority <= 1 AND team = "eng"            |
+-----------------------------------------------------------------------------------+
|  [Validate]  [Clear]  [Switch to Visual]                      Matches: 15 tasks  |
+-----------------------------------------------------------------------------------+
```

**Syntax Support:**
```
Operators: =, !=, <, >, <=, >=, IN, NOT IN, CONTAINS, IS NULL, IS NOT NULL
Boolean: AND, OR, NOT
Grouping: ( )

Examples:
  status = "open" AND priority = 0
  assignee IS NULL OR status = "blocked"
  due_at < "2026-01-15" AND status != "closed"
  title CONTAINS "refactor"
```

**Autocomplete:**
```
+------------------------------------------+
|  status = "                              |
|  +------------------------------------+  |
|  | Suggestions:                       |  |
|  |   "open"                          |  |
|  |   "in_progress"                   |  |
|  |   "closed"                        |  |
|  |   "blocked"                       |  |
|  |   "deferred"                      |  |
|  +------------------------------------+  |
+------------------------------------------+
```

### States

**Valid Query:**
```css
.query-input.valid {
  border-color: var(--success);
}
.query-validation {
  color: var(--success);
  content: "Valid query - 15 matches";
}
```

**Invalid Query:**
```css
.query-input.invalid {
  border-color: var(--danger);
}
.query-validation {
  color: var(--danger);
  content: "Syntax error at position 24: unexpected token";
}
```

---

## 7. Mobile Adaptation (<768px)

### Design Goal
Maintain full filtering capability on mobile while adapting to touch interactions and limited screen space.

### 7.1 Collapsed Filter Bar

**Default State (filters inactive):**
```
+------------------------------------------+
|  [Search...         ] [Filter] [Views]   |
+------------------------------------------+
```

**Filter Button Badge:**
```
+------------------------------------------+
|  [Search...         ] [Filter (3)] [Views]|
+------------------------------------------+
                              ^
                        Active filter count
```

### 7.2 Filter Sheet (Bottom Sheet Modal)

**Triggered by:** Tap "Filter" button

```
+------------------------------------------+
|                [---]                      |  <- Drag handle
+------------------------------------------+
|  Filters                    [Clear All]  |
+------------------------------------------+
|                                          |
|  Quick Filters:                          |
|  [My Tasks] [Due This Week] [Blocked]    |
|                                          |
|  ----------------------------------------|
|                                          |
|  Status                            [>]   |
|  Open, In Progress                       |
|                                          |
|  Priority                          [>]   |
|  P0 - P1                                 |
|                                          |
|  Assignee                          [>]   |
|  All Assignees                           |
|                                          |
|  Due Date                          [>]   |
|  This Week                               |
|                                          |
|  Team                              [>]   |
|  eng                                     |
|                                          |
+------------------------------------------+
|          [Reset]     [Apply Filters]     |
+------------------------------------------+
```

### 7.3 Filter Detail View (Drill-down)

**Triggered by:** Tap filter row

```
+------------------------------------------+
|  [<] Status                              |
+------------------------------------------+
|                                          |
|  [x] Open                           (12) |
|  [x] In Progress                     (8) |
|  [ ] Closed                         (24) |
|  [ ] Blocked                         (3) |
|  [ ] Deferred                        (5) |
|                                          |
+------------------------------------------+
|                              [Done]      |
+------------------------------------------+
```

### 7.4 Active Filters (Mobile)

**Horizontal scrolling chip row:**
```
+------------------------------------------+
| < [Status: 2] [Priority: P0-P1] [Due...] >|
+------------------------------------------+
    ^                                     ^
  Scroll indicators
```

### 7.5 Saved Views (Mobile)

**Accessed via:** Views button in filter bar

```
+------------------------------------------+
|                [---]                      |
+------------------------------------------+
|  Saved Views              [+ New View]   |
+------------------------------------------+
|                                          |
|  PERSONAL                                |
|  +--------------------------------------+|
|  |  My Active Work                      ||
|  |  3 filters                    [...]  ||
|  +--------------------------------------+|
|  |  Weekly Review                       ||
|  |  2 filters                    [...]  ||
|  +--------------------------------------+|
|                                          |
|  SHARED                                  |
|  +--------------------------------------+|
|  |  Team Standup                (PM)    ||
|  |  4 filters                    [...]  ||
|  +--------------------------------------+|
|                                          |
+------------------------------------------+
```

### Mobile Touch Targets

| Element | Min Size | Actual Size |
|---------|----------|-------------|
| Filter row | 44x44px | 52px height |
| Checkbox | 44x44px | 44px |
| Chip | 44px height | 36px height + 8px spacing |
| Close/Remove | 44x44px | 32px visible, 44px tap area |

### Mobile Gestures

| Gesture | Action |
|---------|--------|
| Swipe down on sheet | Dismiss filter sheet |
| Swipe left on chip | Remove filter |
| Long press on view | Show options menu |
| Pull down in list | Refresh views |

---

## 8. Keyboard Navigation and Accessibility

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` or `Cmd+K` | Focus search input |
| `F` | Open filter dropdown |
| `Escape` | Close dropdown/modal, clear search |
| `Cmd+Shift+S` | Save current view |
| `Tab` | Navigate between filter elements |
| `Enter` | Activate focused element |
| `Delete/Backspace` | Remove focused chip |
| `Arrow Up/Down` | Navigate dropdown options |
| `Space` | Toggle checkbox in dropdown |

### ARIA Attributes

**Filter Bar:**
```html
<div class="filter-bar" role="toolbar" aria-label="Task filters">
  <input
    type="search"
    role="searchbox"
    aria-label="Search tasks"
    aria-describedby="search-hint"
  />
  <span id="search-hint" class="sr-only">
    Type to filter tasks by title
  </span>
</div>
```

**Filter Dropdown:**
```html
<button
  aria-haspopup="listbox"
  aria-expanded="false"
  aria-controls="status-dropdown"
>
  Status
</button>
<ul
  id="status-dropdown"
  role="listbox"
  aria-multiselectable="true"
  aria-label="Filter by status"
>
  <li role="option" aria-selected="true">Open</li>
  <li role="option" aria-selected="false">Closed</li>
</ul>
```

**Filter Chip:**
```html
<div
  class="filter-chip"
  role="button"
  aria-label="Status filter: Open, In Progress. Click to edit, press Delete to remove"
  tabindex="0"
>
  <span>Status: Open, In Progress</span>
  <button
    aria-label="Remove status filter"
    tabindex="-1"
  >x</button>
</div>
```

**Active Filters Region:**
```html
<div
  role="region"
  aria-label="Active filters"
  aria-live="polite"
>
  <!-- Filter chips -->
</div>
```

### Color Contrast Requirements

| Element | Foreground | Background | Ratio |
|---------|------------|------------|-------|
| Chip text | #ededed | #2a2a2a | 11.5:1 |
| Muted text | #9ca3af | #0a0a0a | 5.8:1 |
| Active chip | #ffffff | #3b82f6 | 4.7:1 |
| Danger (remove) | #ef4444 | #2a2a2a | 4.8:1 |

### Screen Reader Announcements

| Action | Announcement |
|--------|-------------|
| Filter added | "Filter added: Status is Open. 15 tasks match current filters." |
| Filter removed | "Filter removed: Status. 45 tasks match current filters." |
| View applied | "View applied: Weekly Review. 8 filters active." |
| No results | "No tasks match current filters. Try removing some filters." |

---

## 9. Component Specification Summary

### New CSS Variables Needed

```css
:root {
  /* Filter-specific tokens */
  --filter-chip-bg: #2a2a2a;
  --filter-chip-hover: rgba(59, 130, 246, 0.15);
  --filter-chip-active: var(--accent);
  --filter-dropdown-bg: #1a1a1a;
  --filter-dropdown-border: var(--border);
  --filter-dropdown-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  --filter-preset-border: var(--border);
  --filter-preset-active: var(--accent);
}
```

### Component File Structure

```
src/components/
  FilterPanel/
    FilterBar.tsx           // Main filter bar component
    FilterDropdown.tsx      // Reusable dropdown component
    FilterChip.tsx          // Active filter chip
    QuickFilters.tsx        // Quick filter presets
    SavedViews.tsx          // Saved views management
    DateRangePicker.tsx     // Custom date range picker
    FilterSheet.tsx         // Mobile bottom sheet
    AdvancedQuery.tsx       // JQL-style input (optional)
    index.ts                // Exports
  wireframes/
    filter-panel.md         // This specification
```

### State Management

```typescript
interface FilterState {
  search: string;
  status: string[];
  priority: number[];
  assignee: string[];
  dueDate: DueDateFilter;
  issueType: string[];
  team: string[];
  labels: string[];
  logic: 'AND' | 'OR';
}

interface DueDateFilter {
  preset: 'any' | 'overdue' | 'today' | 'week' | 'month' | 'quarter' | 'custom';
  customRange?: { start: Date; end: Date };
}

interface SavedView {
  id: string;
  name: string;
  filters: FilterState;
  visibility: 'personal' | 'team';
  teamId?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 10. Design Handoff Notes

### Implementation Priority

1. **Phase 1 - Core Filters**
   - Search integration (already exists)
   - Status dropdown (enhance existing)
   - Priority dropdown
   - Active filter chips with clear functionality

2. **Phase 2 - Extended Filters**
   - Assignee filter
   - Due date filter with presets
   - Issue type filter
   - Team filter

3. **Phase 3 - Quick Filters and Presets**
   - Quick filter buttons
   - Preset configuration

4. **Phase 4 - Saved Views**
   - Save current filters
   - Load saved views
   - Share with team

5. **Phase 5 - Advanced**
   - AND/OR logic toggle
   - Filter groups
   - JQL query input (optional)

6. **Phase 6 - Mobile**
   - Bottom sheet adaptation
   - Touch optimizations

### Design System References

- Uses existing CSS variables from `globals.css`
- Follow existing badge patterns (`.status-badge`, `.priority-badge`)
- Modal patterns from `EditModal.tsx`
- Toast patterns from `Toast.tsx`

### Technical Considerations

- Filter state should be URL-serializable for shareable links
- Consider debouncing search input (300ms recommended)
- Lazy-load assignee list for large teams
- Cache saved views in localStorage with sync to backend
- Implement optimistic updates for better perceived performance

### Performance Guidelines

- Max 100 items in filter dropdown before virtualizing
- Debounce filter applications during rapid changes
- Memoize filtered results to prevent unnecessary recalculations
- Use CSS containment on filter panel to isolate repaints

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-08 | UI Wizard | Initial specification |
