# Grouping and Swimlane System

A comprehensive grouping system for the CEO Dashboard that enables users to organize tasks by status, priority, team, or assignee across all views (Board, List, Timeline).

## Features

- **Multiple Grouping Options**: Group by none, status, priority, team, or assignee
- **Collapsible Groups**: Expand/collapse groups to manage screen real estate
- **Progress Tracking**: Automatic calculation of completion percentages per group
- **Persistent State**: Group preferences saved to localStorage
- **Accessibility**: Full keyboard navigation and ARIA support
- **Swimlanes for Board View**: Horizontal grouping rows with status columns
- **Collapsible Headers for List View**: Grouped table sections
- **Responsive Design**: Mobile-optimized layouts

## Architecture

### Core Components

#### 1. GroupingContext
**File**: `GroupingContext.tsx`

State management for grouping configuration:
```typescript
interface GroupingState {
  groupBy: 'none' | 'status' | 'priority' | 'team' | 'assignee';
  collapsedGroups: Set<string>;
  groupOrder: string[];
}
```

**Usage**:
```tsx
import { GroupingProvider, useGrouping } from '@/components/grouping';

function App() {
  return (
    <GroupingProvider>
      <YourComponent />
    </GroupingProvider>
  );
}

function YourComponent() {
  const { state, setGroupBy, toggleGroupCollapse } = useGrouping();
  // ...
}
```

#### 2. GroupSelector
**File**: `GroupSelector.tsx`

Dropdown UI for selecting grouping option:
```tsx
import GroupSelector from '@/components/grouping/GroupSelector';

<GroupSelector />
```

Features:
- Dropdown with icon indicators
- Keyboard accessible
- Auto-closes on selection
- Persists selection

#### 3. GroupHeader
**File**: `GroupHeader.tsx`

Collapsible header for group sections:
```tsx
import GroupHeader from '@/components/grouping/GroupHeader';

<GroupHeader
  groupId="status-open"
  groupLabel="Open Tasks"
  itemCount={15}
  completedCount={3}
  progressPercent={20}
/>
```

Props:
- `groupId`: Unique identifier for collapse state
- `groupLabel`: Display name
- `itemCount`: Total items in group
- `completedCount`: (optional) Number of completed items
- `progressPercent`: (optional) Progress bar percentage
- `variant`: 'default' | 'swimlane'

#### 4. Swimlane
**File**: `Swimlane.tsx`

Container for Board view horizontal grouping:
```tsx
import Swimlane from '@/components/grouping/Swimlane';

<Swimlane
  groupId="team-eng"
  groupLabel="Engineering"
  itemCount={20}
  completedCount={15}
>
  <YourContent />
</Swimlane>
```

Features:
- Automatic collapse/expand
- Empty state handling
- Progress indicator in header

### Utility Hooks

#### useBeadGrouping
Groups beads based on selected option:
```tsx
import { useBeadGrouping } from '@/components/grouping';

const groupedBeads = useBeadGrouping(beads, 'status');
// Returns GroupedBeads[]
```

Returns:
```typescript
interface GroupedBeads {
  groupId: string;
  groupLabel: string;
  groupValue: string | number | null;
  beads: Bead[];
  completedCount: number;
  progressPercent: number;
}
```

#### useGroupStatistics
Calculates aggregate statistics across groups:
```tsx
import { useGroupStatistics } from '@/components/grouping';

const stats = useGroupStatistics(groupedBeads);
// Returns: totalItems, totalCompleted, overallProgress, groupCount, statusCounts
```

#### useFilteredGroups
Filters grouped beads by search and criteria:
```tsx
import { useFilteredGroups } from '@/components/grouping';

const filtered = useFilteredGroups(
  groups,
  'search query',
  ['open', 'in_progress'], // status filter
  [0, 1] // priority filter
);
```

## Integration Guide

### Adding Grouping to Board View

```tsx
import { useGrouping, useBeadGrouping } from '@/components/grouping';
import Swimlane from '@/components/grouping/Swimlane';

function BoardView({ beads }: BoardViewProps) {
  const { state: groupingState } = useGrouping();
  const groupedBeads = useBeadGrouping(beads, groupingState.groupBy);

  if (groupingState.groupBy !== 'none') {
    return (
      <div className="board-view-swimlanes">
        {groupedBeads.map((group) => (
          <Swimlane
            key={group.groupId}
            groupId={group.groupId}
            groupLabel={group.groupLabel}
            itemCount={group.beads.length}
            completedCount={group.completedCount}
            progressPercent={group.progressPercent}
          >
            {/* Render columns with group.beads */}
          </Swimlane>
        ))}
      </div>
    );
  }

  // Default ungrouped view
  return <div>{/* Normal board columns */}</div>;
}
```

### Adding Grouping to List View

```tsx
import { useGrouping, useBeadGrouping } from '@/components/grouping';
import GroupHeader from '@/components/grouping/GroupHeader';

function ListView({ beads }: ListViewProps) {
  const { state: groupingState } = useGrouping();
  const groupedBeads = useBeadGrouping(beads, groupingState.groupBy);

  if (groupingState.groupBy !== 'none') {
    return (
      <div className="list-view-grouped">
        {groupedBeads.map((group) => (
          <div key={group.groupId} className="list-group">
            <GroupHeader
              groupId={group.groupId}
              groupLabel={group.groupLabel}
              itemCount={group.beads.length}
              completedCount={group.completedCount}
              progressPercent={group.progressPercent}
            />
            <table>
              {/* Render rows with group.beads */}
            </table>
          </div>
        ))}
      </div>
    );
  }

  // Default ungrouped view
  return <table>{/* Normal table rows */}</table>;
}
```

### Adding Grouping to Timeline View

```tsx
import { useGrouping, useBeadGrouping } from '@/components/grouping';
import GroupHeader from '@/components/grouping/GroupHeader';

function TimelineView({ beads }: TimelineViewProps) {
  const { state: groupingState, isGroupCollapsed } = useGrouping();
  const groupedBeads = useBeadGrouping(beads, groupingState.groupBy);

  if (groupingState.groupBy !== 'none') {
    return (
      <div className="timeline-view-grouped">
        {groupedBeads.map((group) => {
          const collapsed = isGroupCollapsed(group.groupId);

          return (
            <div key={group.groupId} className="timeline-group">
              <GroupHeader
                groupId={group.groupId}
                groupLabel={group.groupLabel}
                itemCount={group.beads.length}
                completedCount={group.completedCount}
                progressPercent={group.progressPercent}
              />
              {!collapsed && (
                <div className="timeline-group-rows">
                  {/* Render timeline rows with group.beads */}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Default ungrouped view
  return <div>{/* Normal timeline rows */}</div>;
}
```

## Group Sorting

Groups are automatically sorted based on the grouping type:

- **Status**: `blocked → in_progress → open → deferred → closed`
- **Priority**: `0 → 1 → 2 → 3 → 4` (P0 first)
- **Team**: Alphabetical
- **Assignee**: Alphabetical (unassigned last)

Custom sorting can be implemented using the `groupOrder` state in GroupingContext.

## Persistence

Grouping state is automatically persisted to localStorage:

```typescript
{
  "groupBy": "status",
  "collapsedGroups": ["status-open", "status-closed"],
  "groupOrder": []
}
```

Storage key: `gantt-grouping-state`

## Utility Functions

### generateGroupId
```tsx
import { generateGroupId } from '@/components/grouping';

const id = generateGroupId('status', 'open'); // "status-open"
const id = generateGroupId('assignee', null); // "assignee-unassigned"
```

### getGroupLabel
```tsx
import { getGroupLabel } from '@/components/grouping';

const label = getGroupLabel('status', 'in_progress'); // "In Progress"
const label = getGroupLabel('priority', 0); // "P0 - Critical"
const label = getGroupLabel('assignee', null); // "Unassigned"
```

### getGroupSortOrder
```tsx
import { getGroupSortOrder } from '@/components/grouping';

const sortFn = getGroupSortOrder('status');
const sorted = statuses.sort(sortFn);
```

## Testing

Comprehensive test suites are available:

- `GroupingContext.test.tsx`: Context state management and persistence
- `GroupSelector.test.tsx`: UI component behavior and accessibility
- `GroupHeader.test.tsx`: Header interactions and collapse state
- `useBeadGrouping.test.ts`: Grouping logic and calculations

Run tests:
```bash
npm test -- grouping
```

## Accessibility

All components follow WCAG 2.1 AA standards:

- **Keyboard Navigation**: Tab, Enter, Space, Escape
- **ARIA Attributes**: Proper roles, labels, and states
- **Screen Reader Support**: Meaningful announcements
- **Focus Management**: Visible focus indicators
- **Color Contrast**: Meets 4.5:1 minimum ratio

## Performance

- **Memoization**: All grouping calculations are memoized
- **Lazy Rendering**: Collapsed groups don't render content
- **Virtualization Ready**: Works with react-window for large datasets
- **Debounced Updates**: Search/filter changes debounced to 150ms

## Future Enhancements

- [ ] Timeline view integration
- [ ] Custom group ordering (drag-and-drop)
- [ ] Multi-level grouping (e.g., team + status)
- [ ] Group aggregations (sum estimates, count by type)
- [ ] Saved grouping presets
- [ ] Export grouped data to CSV

## API Reference

See individual component files for detailed prop types and method signatures:

- `/GroupingContext.tsx` - Context provider and hooks
- `/GroupSelector.tsx` - UI selector component
- `/GroupHeader.tsx` - Collapsible group header
- `/Swimlane.tsx` - Board view swimlane container
- `/useBeadGrouping.ts` - Grouping utility hooks

## Examples

Complete working examples are available in:
- `/src/components/views/BoardView.tsx` - Swimlane implementation
- `/__tests__/*.test.tsx` - Test cases with usage patterns

## Support

For issues or questions, refer to:
- Wireframe specs: `/src/components/wireframes/multi-view-prd.md`
- Filter integration: `/src/components/filters/FilterContext.tsx`
- View system: `/src/components/views/ViewContext.tsx`
