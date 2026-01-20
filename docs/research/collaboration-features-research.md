# Collaboration and Real-Time Features Research

## Research for Dashboard Gantt Chart Enhancement

**Date**: 2026-01-08
**Purpose**: Analyze best practices from leading planning and collaboration tools to inform dashboard enhancement decisions.

---

## Executive Summary

Modern planning tools have converged on several key collaboration patterns: threaded comments with resolution states, @mentions with multi-channel notifications, real-time presence indicators, and granular role-based permissions. The most successful implementations (Figma, Notion, Linear) prioritize simplicity and discoverability while providing power users with advanced controls.

**Key Recommendations for Our Dashboard**:
1. Start with comments and @mentions - highest impact, lowest complexity
2. Add activity feed before real-time presence
3. Use digest notifications to reduce noise
4. Implement RBAC with three core roles initially
5. Consider Liveblocks/Yjs for future real-time sync if needed

---

## 1. Comments and Discussion Systems

### How Leading Tools Handle Comments

| Tool | Comment Type | Threading | Resolution | Attachments |
|------|-------------|-----------|------------|-------------|
| **Asana** | Task-level | Yes | No explicit resolve | Files, images |
| **Notion** | Block-level (inline) + Page-level | Yes | Resolve button | Full markdown |
| **Monday.com** | Item Updates section | Yes | No explicit resolve | GIFs, files, emojis |
| **Linear** | Issue-level | Yes | AI summaries | Markdown, code, files |
| **Figma** | Canvas position-based | Yes | Resolve | Images |
| **Google Docs** | Inline (text selection) | Yes | Resolve + Re-open | None |

### Best Practices Identified

**Threaded Comments Structure**:
- Use visual indentation or connecting lines to show parent-child relationships ([Source](https://www.subframe.com/tips/comment-thread-design-examples))
- Inline reply forms are perceived as more intuitive than separate reply areas
- Mobile designs should use touch gestures for thread navigation

**Resolution States**:
- Provide clear "Resolve" button that looks like a button (not a link or checkbox)
- Show resolved vs unresolved sections separately or with clear visual distinction
- Allow reopening resolved discussions
- Consider a tabbed interface: "Open" | "Resolved"

**Inline Comments (Notion/Google Docs pattern)**:
- Allow highlighting specific text/content to attach comments
- Comments appear as margin annotations or hover cards
- Resolution removes visual indicator but preserves history
- Great for document-style content review

### Recommendation for Dashboard

```
Priority: HIGH - Implement first

Pattern: Task/Bead-level comments with threading
- Each Gantt bar/task can have comments attached
- Comments visible in task detail modal/panel
- Support @mentions within comments
- Add resolve/unresolve capability
- Show comment count indicator on Gantt bars

Future: Consider inline comments on task descriptions
```

---

## 2. @Mentions System

### Cross-Tool Analysis

| Tool | Mention Syntax | Who Can Be Mentioned | Notification Channel |
|------|---------------|---------------------|---------------------|
| **Asana** | @name | Project/task collaborators | In-app, email, mobile |
| **Notion** | @name | Workspace members, guests | Inbox, email (1-2 sec latency) |
| **Monday.com** | @name in updates | Board members | Bell, email, mobile |
| **Linear** | @name | Team members | In-app, Slack (bidirectional) |
| **Slack** | @name, @here, @channel | Workspace members | Push, desktop |

### Implementation Patterns

**Autocomplete Behavior**:
- Trigger on `@` character typed anywhere
- Real-time search filtering as user types
- Show avatar + name + role/team in dropdown
- Keyboard navigation (arrow keys + enter)
- Escape to cancel

**Notification Delivery**:
- Immediate in-app notification
- Link directly to the mentioned context
- Include surrounding context in notification preview
- Mobile push notifications for @mentions are typically higher priority

### Recommendation for Dashboard

```
Priority: HIGH - Implement with comments

Implementation:
1. @mention autocomplete in comment input
2. Search across team members with access to task
3. Create notification record on mention
4. Display in notification center with direct link
5. Consider email notification (instant or digest based on preference)
```

---

## 3. Activity Feed / History

### Tool Comparison

| Tool | Feed Location | Scope | Details Shown |
|------|--------------|-------|---------------|
| **Asana** | Task history, project activity | Task + Project | Who, what, when |
| **Notion** | Page history, version timeline | Page | Changes, comments, 30-day retention |
| **Monday.com** | Activity log, item updates | Item + Board | All changes with timestamps |
| **Linear** | Pulse (unified feed) | Personal, team, company | Updates, AI summaries, filters |
| **Figma** | Version history | File | Snapshots, named versions |

### Linear's Pulse Feature (Notable Pattern)

Linear's "Pulse" provides three views:
- **"For me"**: Personalized updates relevant to the user
- **Popular**: Trending across workspace
- **Recent**: Chronological company-wide updates

This multi-view approach balances personalization with awareness.

### AI-Enhanced Activity (Emerging Trend)

Linear and Monday.com now offer AI-generated summaries of activity:
- **Discussion Summaries**: Condensed view of lengthy comment threads
- Captures: decisions, blockers, debates and resolutions, key people
- Auto-regenerates when new comments are added

### Audit Trail Best Practices

From [AuditBoard](https://auditboard.com/blog/what-is-an-audit-trail) and [Orangescrum](https://academy.orangescrum.com/why-audit-trails-matter-for-strong-project-governance/):

1. **Enable automatic logging from day one**
2. **Capture**: status changes, assignments, dates, comments, file uploads
3. **Include**: who, what, when, and ideally why
4. **Immutability**: Logs should not be editable
5. **Retention policy**: Define how long to keep (regulatory requirements may apply)
6. **Time synchronization**: Accurate timestamps are critical

### Recommendation for Dashboard

```
Priority: MEDIUM - Implement after comments

Implementation:
1. Task-level activity log (visible in task detail panel)
   - Created, updated, status changed, dates modified
   - Comments added, resolved
   - Assignee changes

2. Personal activity feed (dashboard home or sidebar)
   - Tasks assigned to me that changed
   - Comments on my tasks
   - @mentions

3. Consider filtering options:
   - By task
   - By team member
   - By date range
   - By activity type
```

---

## 4. Real-Time Presence

### The "Figma Standard"

Figma pioneered the "multiplayer cursor" pattern that has become the gold standard:

- **Colored cursors**: Each user gets a unique color with name label
- **Real-time position**: Cursor positions update instantly (< 500ms)
- **Follow mode**: Click avatar to follow another user's viewport
- **Slash chat**: Press `/` to type ephemeral messages at cursor location
- **Hide option**: Users can hide others' cursors for focus

Technical implementation from [Figma's blog](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/):
- WebSocket connections for persistent low-latency communication
- Optimized diffs (only changed data, not full document)
- Throttling for smooth rendering of many cursors
- "Last write wins" for same-property conflicts

### Presence Patterns Across Tools

| Tool | Presence Indicator | Cursor Tracking | Viewing vs Editing |
|------|-------------------|-----------------|-------------------|
| **Figma** | Avatar stack + cursors | Yes, colored | Cursor = editing |
| **Notion** | Avatar stack at top | No cursors | Just "viewing" |
| **Google Docs** | Colored cursors + sidebar | Yes, colored | Cursor = position |
| **Linear** | Activity indicators | No | Shows active areas |
| **Monday.com** | Editing indicators | No | Shows who's editing |

### Implementation Complexity

From [Building Real-Time Collaboration Features (2025)](https://medium.com/@sachhsoft/building-real-time-collaboration-features-what-saas-teams-need-to-know-in-2025-d61a9b678cf5):

**Start small and scale up**:
1. Presence indicators (who's online) - Easiest
2. Simple real-time text updates (chat/comments)
3. WebSocket infrastructure
4. Shared editing with CRDTs/OT
5. Live cursors and change highlighting - Most complex

### Available SDKs

| Solution | Type | Best For |
|----------|------|----------|
| **Liveblocks** | Hosted SDK | Presence, cursors, real-time sync |
| **Yjs** | CRDT library | Text/document collaboration |
| **Firebase** | Hosted DB | Simple real-time sync |
| **Ably** | WebSocket platform | Scalable messaging |

[Liveblocks](https://liveblocks.io/multiplayer) is particularly notable for providing presence awareness out of the box with their Yjs integration.

### Recommendation for Dashboard

```
Priority: LOW - Future enhancement

For a Gantt chart, full cursor tracking may be overkill. Consider:

Phase 1: Avatar presence (who's viewing this project/timeline)
- Show avatar stack in header
- Tooltip shows who's currently viewing
- Uses simple WebSocket or polling

Phase 2: Editing indicators (if needed)
- Show when someone is editing a specific task
- Prevent simultaneous edit conflicts with locking or merge

Phase 3: Live cursors (probably unnecessary for Gantt)
- Only if we add whiteboard/canvas features
```

---

## 5. Notifications

### Notification Channels

| Channel | Best For | Timing | User Control |
|---------|----------|--------|--------------|
| **In-app (bell)** | All activity | Immediate | Per-type toggles |
| **Email instant** | High priority | Immediate | Per-type opt-in |
| **Email digest** | Low priority | Daily/weekly | Frequency settings |
| **Push (mobile)** | Urgent items | Immediate | Granular control |
| **Slack/Teams** | Team workflows | Immediate | Integration settings |

### Digest vs Instant Notifications

From [Jira Email Digest](https://reliex.com/blog/whats-new-in-email-notification-digest-for-jira) and [SuprSend Guide](https://www.suprsend.com/post/the-ultimate-guide-to-perfecting-notification-preferences-putting-your-users-in-control):

**Instant**: Good for @mentions, assignments, due date reminders
**Digest**: Good for status updates, comments on watched items, team activity

**Best Practice**: Group notifications into categories and allow users to set preferences per category:
- Critical (cannot disable): Password reset, security alerts
- Action Required: Assignments, @mentions, approvals
- Updates: Comments, status changes, completions
- Digest-only: Weekly summaries, team activity

### Monday.com's Notification Features

- Scheduled updates (post at specific time)
- Reminders on updates (bell icon to be reminded later)
- Emoji reactions (reduce "thanks" comments)
- GIF/file attachments in updates
- AI summarization of update threads

### Recommendation for Dashboard

```
Priority: MEDIUM - Implement with comments

Notification Center (In-app):
- Bell icon in header with unread count badge
- Dropdown panel with recent notifications
- Mark as read (individual and all)
- Click to navigate to source
- Filter by type

Email:
- Default to daily digest
- Allow instant for @mentions and assignments
- Unsubscribe option per category

Categories:
1. Mentions: @mentioned in comment
2. Assignments: Task assigned/unassigned
3. Comments: New comment on your tasks
4. Due Dates: Reminders for upcoming deadlines
5. Updates: Task status/dates changed
```

---

## 6. Sharing and Permissions

### Permission Models Compared

| Tool | Model | Levels | Public Sharing |
|------|-------|--------|----------------|
| **Asana** | Project-based + Task-level | Admin, Editor, Commenter, Viewer | Limited public links |
| **Notion** | Page inheritance + Workspace | Full Access, Edit, Comment, View | Public web pages |
| **Monday.com** | Board-based + Item-level | Admin, Member, Viewer, Guest | Shareable views |
| **Linear** | Workspace + Team + Project | Admin, Member, Guest | Limited |
| **Figma** | File-based | Owner, Edit, View | Public links + embedding |

### Role-Based Access Control (RBAC) Best Practices

From [Auth0](https://auth0.com/docs/manage-users/access-control/rbac) and [Frontegg](https://frontegg.com/guides/rbac):

**Core Principles**:
1. **Principle of Least Privilege**: Assign minimum permissions needed
2. **Role Abstraction**: Assign permissions to roles, not users directly
3. **Hierarchy**: Consider organizational structure (Org > Team > Project)

**Recommended Role Structure for Project Management**:
- **Owner/Admin**: Full control, can delete, manage members
- **Editor**: Create/edit tasks, cannot manage permissions
- **Commenter**: View all, comment only, cannot edit
- **Viewer**: Read-only access

### Sharing Patterns

**Public Links** (Figma, Notion pattern):
- Generate shareable URL with embedded token
- Access level: View-only typically
- Optional password protection
- Expiration date option
- Revocable by owner

**Guest Access**:
- Invite by email
- Limited to specific items (not full workspace)
- Different from full team membership
- May have limited notification access

### Recommendation for Dashboard

```
Priority: MEDIUM - Implement foundation early

Phase 1: Basic Roles
- Admin: Full access + manage team members
- Member: View all, edit assigned tasks
- Viewer: Read-only (for stakeholders)

Phase 2: Granular Permissions
- Per-team visibility controls
- Private tasks (visible only to assignee + admins)
- Comment-only mode for specific users

Phase 3: External Sharing
- Read-only public link generation
- Password protection option
- Link expiration
- Embed code for external dashboards

Data Model:
- Store permissions at project/team level
- Inherit to tasks unless overridden
- Audit log for permission changes
```

---

## 7. Change Tracking

### Version History Approaches

| Tool | Granularity | Retention | Comparison |
|------|-------------|-----------|------------|
| **Notion** | Block-level | 30 days (paid) | Side-by-side diff |
| **Google Docs** | Character-level | Unlimited | Timeline slider |
| **Figma** | Snapshot-based | Named versions | Visual diff |
| **Monday.com** | Field-level | Full history | Activity log |

### What to Track

Based on audit trail research from [Middleware](https://middleware.io/blog/audit-logs/) and [Splunk](https://www.splunk.com/en_us/blog/learn/audit-logs.html):

**Essential Fields**:
- `timestamp`: When the change occurred (UTC)
- `user_id`: Who made the change
- `action`: Type of change (create, update, delete)
- `resource_type`: What was changed (task, comment, etc.)
- `resource_id`: ID of changed item
- `old_value`: Previous value (for updates)
- `new_value`: New value
- `context`: Additional metadata (IP, client, etc.)

**Display Considerations**:
- Show relative timestamps ("2 hours ago")
- Group changes by time period
- Collapse similar sequential changes
- Highlight significant changes (status, dates)

### Recommendation for Dashboard

```
Priority: HIGH - Implement with core features

Track These Changes on Tasks:
- Title changes
- Date changes (start, end, due)
- Status changes
- Assignee changes
- Priority changes
- Description updates (diff not full content)
- Comments added/resolved
- Dependencies added/removed
- Tag changes

Display:
- Task detail panel shows activity timeline
- Each entry: avatar, action description, timestamp
- Expandable details for complex changes
- Filter by type

Storage:
- Separate activity_log table
- Index by task_id and timestamp
- Consider archival strategy for old data
```

---

## 8. Conflict Resolution

### Technical Approaches

| Approach | Used By | Pros | Cons |
|----------|---------|------|------|
| **Operational Transformation (OT)** | Google Docs | Battle-tested, precise | Complex to implement, needs server |
| **CRDTs** | Figma, Notion | Works offline, P2P possible | Higher memory overhead |
| **Last Write Wins** | Simple apps | Easy to implement | Can lose data |
| **Locking** | Traditional DBs | Prevents conflicts | Poor UX, blocking |

### Google Docs OT Implementation

From [How Google Docs Resolves Conflicts](https://medium.com/@roopa.kushtagi/how-google-docs-resolves-conflicts-in-real-time-collaboration-at-scale-ad485eef8c3a):

1. Each user's changes become "operations"
2. Operations sent to central server
3. Server orders and transforms operations for consistency
4. Transformed operations broadcast to all users

**Conflict Example**:
- User A inserts "Hello" at position 10
- User B deletes character at position 8 simultaneously
- OT transforms positions so both apply correctly

### Figma's Simpler Approach

From [Figma's Multiplayer Blog](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/):

- Changes broadcast to server and other users in real-time
- "Two simultaneous changes are independent unless they affect the same property on the same object"
- For same-property conflicts: pick the latest change
- No complex transformation algorithms needed

### Practical Strategies for Our Dashboard

For a Gantt chart with structured tasks (not freeform text):

1. **Field-level locking** (simplest):
   - When user starts editing a field, lock it
   - Show indicator that field is being edited
   - Unlock on save or timeout

2. **Optimistic updates with merge**:
   - Allow simultaneous edits to different fields
   - For same-field conflicts: last write wins + notification
   - Show "Someone else edited this" warning

3. **Edit session model**:
   - User clicks "Edit" to enter edit mode for task
   - Others see "Being edited by [name]"
   - Can wait or force edit (with conflict risk)

### Recommendation for Dashboard

```
Priority: LOW - Implement if needed

For Gantt chart tasks, recommend:

Approach 1: Task-Level Optimistic Locking (Simplest)
- When opening edit modal, fetch latest version
- On save, check version number
- If mismatch: show diff, let user merge or overwrite
- Low conflict probability for task metadata

Approach 2: Field-Level Indicators (Better UX)
- Show "User is editing..." on specific fields
- Use WebSocket for presence
- Merge non-conflicting field changes
- Prompt for same-field conflicts

Implementation Detail:
- Add `version` field to tasks
- Add `last_modified_by` and `last_modified_at`
- On save: compare versions, handle conflict
- Consider Liveblocks for production-grade solution
```

---

## 9. Key Patterns and Recommendations Summary

### High-Priority Features (Implement First)

| Feature | Complexity | Impact | Implementation Notes |
|---------|------------|--------|---------------------|
| **Comments on tasks** | Medium | High | Basic threading, @mentions |
| **@Mentions** | Medium | High | Autocomplete, notifications |
| **Activity log** | Low | High | Track all changes per task |
| **Notification center** | Medium | High | Bell icon, dropdown panel |
| **Basic RBAC** | Medium | High | Admin, Member, Viewer |

### Medium-Priority Features

| Feature | Complexity | Impact | Implementation Notes |
|---------|------------|--------|---------------------|
| **Email digest** | Low | Medium | Daily summary of activity |
| **Comment resolution** | Low | Medium | Resolve/unresolve button |
| **Personal activity feed** | Medium | Medium | Aggregate from all tasks |
| **Granular permissions** | Medium | Medium | Team/task level controls |

### Low-Priority Features (Future)

| Feature | Complexity | Impact | Implementation Notes |
|---------|------------|--------|---------------------|
| **Real-time presence** | High | Low | Avatar stack, WebSocket |
| **Live cursors** | Very High | Low | Probably overkill for Gantt |
| **Public link sharing** | Medium | Low | Read-only external access |
| **Conflict resolution** | High | Medium | Only if multi-edit is common |

### Technology Recommendations

**For Comments & Notifications**:
- Standard REST API + database
- WebSocket for real-time updates (optional initially)
- Email service (SendGrid, AWS SES) for notifications

**For Real-Time Features (if pursued)**:
- [Liveblocks](https://liveblocks.io/) - Best for presence + awareness
- [Ably](https://ably.com/) - WebSocket infrastructure
- [Pusher](https://pusher.com/) - Simple real-time channels

**For Rich Text Comments**:
- TipTap or Slate.js for rich text editing
- Marked or remark for markdown parsing

---

## Sources

### Notion
- [Sharing & Collaboration Help Center](https://www.notion.com/help/category/sharing-and-collaboration)
- [Collaborate in a Workspace](https://www.notion.com/help/collaborate-within-a-workspace)
- [Real-Time Collaboration Features](https://ones.com/blog/knowledge/notion-real-time-collaboration-features/)
- [Document Collaboration](https://www.notion.com/use-case/document-collaboration)

### Monday.com
- [The Updates Section](https://support.monday.com/hc/en-us/articles/115005900249-The-Updates-Section)
- [Notifications via Automations](https://support.monday.com/hc/en-us/articles/31399443744530-Notifications-via-automations-and-integrations)
- [Monday.com Features 2025](https://stackby.com/blog/monday-com-features/)
- [December 2025 Updates](https://www.dsapps.dev/blog/monday-dot-com-december-2025-updates/)

### Linear
- [Comments and Reactions](https://linear.app/docs/comment-on-issues)
- [Collaborate Features](https://linear.app/features/collaborate)
- [Linear Review 2025](https://thedigitalprojectmanager.com/tools/linear-review/)

### Figma
- [Multiplayer Editing Blog](https://www.figma.com/blog/multiplayer-editing-in-figma/)
- [How Figma's Multiplayer Works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)
- [Live Cursor UI](https://designilo.com/2025/07/20/figmas-live-cursor-ui-a-new-era-of-design-dev-collaboration/)
- [Building Figma Multiplayer Cursors](https://mskelton.dev/blog/building-figma-multiplayer-cursors)

### Google Docs / Conflict Resolution
- [How Google Docs Resolves Conflicts](https://medium.com/@roopa.kushtagi/how-google-docs-resolves-conflicts-in-real-time-collaboration-at-scale-ad485eef8c3a)
- [Operational Transformation Explained](https://dev.to/dhanush___b/how-google-docs-uses-operational-transformation-for-real-time-collaboration-119)
- [Google Docs Architecture: OT vs CRDTs](https://sderay.com/google-docs-architecture-real-time-collaboration/)

### Audit Trails & Activity Logging
- [What Is an Audit Trail - AuditBoard](https://auditboard.com/blog/what-is-an-audit-trail)
- [Audit Trails in Project Governance](https://academy.orangescrum.com/why-audit-trails-matter-for-strong-project-governance/)
- [Audit Logging Guide - Splunk](https://www.splunk.com/en_us/blog/learn/audit-logs.html)
- [Audit Logs Guide - Middleware](https://middleware.io/blog/audit-logs/)

### Notifications & Preferences
- [Guide to Notification Preferences - SuprSend](https://www.suprsend.com/post/the-ultimate-guide-to-perfecting-notification-preferences-putting-your-users-in-control)
- [Jira Email Digest](https://reliex.com/blog/whats-new-in-email-notification-digest-for-jira)

### RBAC & Permissions
- [Role-Based Access Control - Auth0](https://auth0.com/docs/manage-users/access-control/rbac)
- [RBAC Complete Guide - Frontegg](https://frontegg.com/guides/rbac)
- [What is RBAC - Stytch](https://stytch.com/blog/what-is-rbac/)

### Real-Time Collaboration Infrastructure
- [Liveblocks Yjs API](https://liveblocks.io/docs/api-reference/liveblocks-yjs)
- [Liveblocks Multiplayer](https://liveblocks.io/multiplayer)
- [Building Real-Time Collaboration 2025](https://medium.com/@sachhsoft/building-real-time-collaboration-features-what-saas-teams-need-to-know-in-2025-d61a9b678cf5)
- [Real-Time Multiplayer Must-Have](https://dev.to/vladi-stevanovic/real-time-multiplayer-collaboration-is-a-must-in-modern-applications-10ml)

### UI/UX Design Patterns
- [Comment Thread Design Examples](https://www.subframe.com/tips/comment-thread-design-examples)
- [Cord SDK Threaded Comments](https://docs.cord.com/components/cord-threaded-comments)
- [Comment Design Best Practices](https://www.hongkiat.com/blog/comment-design-considerations-best-practices-and-examples/)
