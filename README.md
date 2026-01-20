# Beads Dashboard

An interactive project management dashboard with Gantt chart visualization, multi-view support, and real-time filtering. Built with Next.js 15, React 19, and TypeScript.

## About

This project is a UI dashboard for the [Beads](https://github.com/steveyegge/beads) project management system by Steve Yegge. Beads is a lightweight, git-native issue tracking system designed for AI-assisted development workflows.

**Initial development driven by [debugg.ai](https://debugg.ai)**

## Features

- **Multi-View System**: Switch between Timeline (Gantt), Board (Kanban), and List views
- **Interactive Gantt Chart**: Drag to move/resize tasks, dependency arrows, zoom controls
- **Advanced Filtering**: Filter by status, priority, type, due date, and team
- **Quick Filters**: One-click presets for common filters (Overdue, In Progress, Blocked, etc.)
- **Health Status**: RAG (Red/Amber/Green) health indicators based on progress vs schedule
- **Hierarchical Organization**: Supports multi-year roadmaps down to weekly tasks
- **URL Sync**: Shareable filtered views via URL parameters
- **Keyboard Shortcuts**: Cmd+B/L/T to switch views

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd dashboard

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── api/beads/       # REST API for beads CRUD
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout with metadata
│   └── page.tsx         # Main dashboard page
├── components/
│   ├── filters/         # FilterBar, FilterChip, FilterDropdown, QuickFilters
│   ├── grouping/        # GroupingContext, Swimlane, GroupHeader
│   ├── shared/          # ProgressBar, HealthBadge, ScheduleBadge, MilestoneMarker
│   ├── views/           # ViewContext, BoardView, ListView, TimelineView
│   ├── hooks/           # useFilters, useViewState
│   ├── GanttChart.tsx   # Main Gantt chart component
│   ├── EditModal.tsx    # Task editing modal
│   └── Toast.tsx        # Toast notifications
└── lib/
    ├── db.ts            # Database access layer
    ├── types.ts         # TypeScript interfaces
    ├── dates.ts         # Date parsing utilities
    ├── sorting.ts       # Hierarchy sorting
    └── progress.ts      # Progress/health calculations
```

## Bead Data Format

Beads are the core data model representing tasks, features, epics, and bugs.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `title` | string | Task title (supports date prefixes) |
| `status` | enum | `open`, `in_progress`, `closed`, `blocked`, `deferred` |
| `priority` | number | 0-4 (P0=Critical, P1=High, P2=Medium, P3=Low, P4=None) |
| `issue_type` | string | `epic`, `feature`, `task`, `bug` |
| `team` | string | Team identifier |
| `created_at` | string | ISO 8601 timestamp |
| `updated_at` | string | ISO 8601 timestamp |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Detailed description |
| `assignee` | string \| null | Username of assignee |
| `due_at` | string \| null | ISO 8601 due date |
| `estimated_minutes` | number \| null | Time estimate in minutes |
| `defer_until` | string \| null | ISO 8601 defer date |

### Example Bead

```json
{
  "id": "pm-abc123",
  "title": "[Q1] Implement user authentication",
  "description": "Add OAuth2 and JWT-based authentication",
  "status": "in_progress",
  "priority": 1,
  "issue_type": "feature",
  "assignee": "johndoe",
  "estimated_minutes": 480,
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-15T10:30:00Z",
  "due_at": "2026-03-31T23:59:59Z",
  "defer_until": null,
  "team": "eng"
}
```

## Date Prefixes (Hierarchical Time Periods)

The dashboard automatically parses date prefixes in titles to determine task timelines and hierarchy:

| Prefix | Level | Example | Date Range |
|--------|-------|---------|------------|
| `[3YR]` | Multi-year | `[3YR] Company vision` | 3 years from reference year |
| `[1YR]` | Annual | `[1YR] 2026 objectives` | Full year |
| `[H1]` | Half-year | `[H1] First half goals` | Jan 1 - Jun 30 |
| `[H2]` | Half-year | `[H2] Second half goals` | Jul 1 - Dec 31 |
| `[Q1]` | Quarterly | `[Q1] Q1 deliverables` | Jan 1 - Mar 31 |
| `[Q2]` | Quarterly | `[Q2] Q2 deliverables` | Apr 1 - Jun 30 |
| `[Q3]` | Quarterly | `[Q3] Q3 deliverables` | Jul 1 - Sep 30 |
| `[Q4]` | Quarterly | `[Q4] Q4 deliverables` | Oct 1 - Dec 31 |
| `[JAN]` | Monthly | `[JAN] January sprint` | Jan 1 - Jan 31 |
| `[FEB]` | Monthly | `[FEB] February sprint` | Feb 1 - Feb 28/29 |
| ... | ... | ... | ... |
| `[W1]` | Weekly | `[W1] Week 1 tasks` | First 7 days of year |

**Hierarchy sorting**: Items are sorted by hierarchy level (broader scope first), then by period (chronological), then by start date.

## Dependencies

Dependencies define relationships between beads. The dashboard supports hierarchical containment (parent-child) and sequential blocking relationships.

### Dependency Format

```json
{
  "issue_id": "pm-parent",
  "depends_on_id": "pm-child",
  "type": "blocks"
}
```

- `issue_id`: The parent/blocking issue
- `depends_on_id`: The child/dependent issue
- `type`: Currently supports `blocks`

### Hierarchical vs Sequential Dependencies

The dashboard distinguishes between:

1. **Hierarchical (Parent-Child)**: When the parent has a broader time scope than the child
   - Example: `[1YR] Annual Plan` blocks `[Q1] Q1 Deliverables`
   - Displayed as: child indented under parent in the Gantt chart

2. **Sequential (Blocking)**: When items have the same time scope
   - Example: `[Q1] Task A` blocks `[Q1] Task B`
   - Displayed as: dependency arrow from Task A to Task B

### Dependency Arrows

Dependency arrows are drawn from the **end of the child task** to the **end of the parent epic**, showing that the child contributes to completing the parent.

## Health Status Calculation

The dashboard calculates health status based on progress vs expected timeline:

| Status | Color | Condition |
|--------|-------|-----------|
| `on_track` | Green | Progress is within 10% of expected |
| `at_risk` | Yellow | Progress is >10% behind expected |
| `blocked` | Red | Task has `blocked` status |
| `not_started` | Gray | No progress yet |

### Progress Calculation

- **Status-based progress**: `closed` = 100%, `in_progress` = 50%, `open` = 0%
- **Expected progress**: Percentage of time elapsed between start and end dates
- **Rollup progress**: Weighted average of child task progress

## API Endpoints

### GET /api/beads

Fetch all beads and dependencies.

```bash
# All beads
curl http://localhost:3000/api/beads

# Filter by team
curl http://localhost:3000/api/beads?team=eng

# Get teams list
curl http://localhost:3000/api/beads?team=_teams
```

### PATCH /api/beads

Update a bead.

```bash
curl -X PATCH http://localhost:3000/api/beads \
  -H "Content-Type: application/json" \
  -d '{
    "id": "pm-abc123",
    "team": "eng",
    "updates": {
      "status": "closed",
      "priority": 2
    }
  }'
```

## Testing

```bash
# Run unit tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run end-to-end tests
npm run test:e2e

# Run e2e tests with UI
npm run test:e2e:ui
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + B` | Switch to Board view |
| `Cmd/Ctrl + L` | Switch to List view |
| `Cmd/Ctrl + T` | Switch to Timeline view |
| `Arrow Up/Down` | Navigate between tasks |
| `Enter/Space` | Open task for editing |

## URL Parameters

Filter state is synced to URL for shareable views:

| Parameter | Example | Description |
|-----------|---------|-------------|
| `search` | `?search=auth` | Text search |
| `status` | `?status=open,in_progress` | Status filter |
| `priority` | `?priority=0,1` | Priority filter |
| `type` | `?type=feature,bug` | Issue type filter |
| `due` | `?due=overdue` | Due date preset |
| `view` | `?view=board` | Active view |

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19
- **Language**: TypeScript 5
- **Database**: SQLite via better-sqlite3
- **Styling**: CSS (no framework)
- **Date Handling**: date-fns
- **Validation**: Zod
- **Testing**: Vitest + React Testing Library + Playwright

## Development

### Code Style

- TypeScript strict mode enabled
- ESLint with Next.js config
- Functional components with hooks
- CSS modules / global CSS (no CSS-in-JS frameworks)

### Adding New Features

1. Create components in appropriate `src/components/` subdirectory
2. Add TypeScript interfaces to `src/lib/types.ts`
3. Write tests in `__tests__/` directory alongside components
4. Run `npx tsc --noEmit` to verify compilation
5. Run `npm test` to verify tests pass

## References

- [Beads](https://github.com/steveyegge/beads) - The original git-native issue tracking system
- [debugg.ai](https://debugg.ai) - AI-powered debugging and development

## License

MIT - See [Beads License](https://github.com/steveyegge/beads/blob/main/LICENSE)
