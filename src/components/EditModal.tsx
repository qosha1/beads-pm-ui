"use client";

import { useState } from "react";
import type { Bead } from "@/lib/types";

interface EditModalProps {
  bead: Bead;
  onClose: () => void;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
}

export function EditModal({ bead, onClose, onSave }: EditModalProps) {
  const [title, setTitle] = useState(bead.title);
  const [status, setStatus] = useState(bead.status);
  const [priority, setPriority] = useState(bead.priority);
  const [assignee, setAssignee] = useState(bead.assignee || "");
  const [dueAt, setDueAt] = useState(
    bead.due_at ? bead.due_at.split("T")[0] : ""
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    bead.estimated_minutes?.toString() || ""
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const updates: Record<string, unknown> = {};

    if (title !== bead.title) updates.title = title;
    if (status !== bead.status) updates.status = status;
    if (priority !== bead.priority) updates.priority = priority;
    if (assignee !== (bead.assignee || ""))
      updates.assignee = assignee || null;
    if (dueAt !== (bead.due_at?.split("T")[0] || ""))
      updates.due_at = dueAt || null;
    if (estimatedMinutes !== (bead.estimated_minutes?.toString() || ""))
      updates.estimated_minutes = estimatedMinutes
        ? parseInt(estimatedMinutes)
        : null;

    if (Object.keys(updates).length > 0) {
      await onSave(updates);
    } else {
      onClose();
    }

    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Bead</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>ID</label>
              <input type="text" value={bead.id} disabled />
            </div>

            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Bead["status"])}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="deferred">Deferred</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
              >
                <option value="0">P0 - Critical</option>
                <option value="1">P1 - High</option>
                <option value="2">P2 - Medium</option>
                <option value="3">P3 - Low</option>
                <option value="4">P4 - Backlog</option>
              </select>
            </div>

            <div className="form-group">
              <label>Assignee</label>
              <input
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Enter assignee name"
              />
            </div>

            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Estimated Minutes</label>
              <input
                type="number"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                placeholder="e.g., 480 for 1 day"
              />
            </div>

            <div className="form-group">
              <label>Team</label>
              <input type="text" value={bead.team.toUpperCase()} disabled />
            </div>

            <div className="form-group">
              <label>Type</label>
              <input type="text" value={bead.issue_type} disabled />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
