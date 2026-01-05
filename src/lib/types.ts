export interface Bead {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "closed" | "blocked" | "deferred";
  priority: number;
  issue_type: string;
  assignee: string | null;
  estimated_minutes: number | null;
  created_at: string;
  updated_at: string;
  due_at: string | null;
  defer_until: string | null;
  team: string;
}

export interface Dependency {
  issue_id: string;
  depends_on_id: string;
  type: string;
}

export interface Team {
  id: string;
  name: string;
  path: string;
}

export interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies: string[];
  team: string;
  status: string;
  priority: number;
  type: string;
  assignee: string | null;
}

export interface BeadUpdate {
  id: string;
  team: string;
  updates: Partial<{
    title: string;
    status: string;
    priority: number;
    assignee: string;
    due_at: string;
    estimated_minutes: number;
  }>;
}
