import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditModal } from "../EditModal";
import type { Bead } from "@/lib/types";

// Helper to find form field by label text (since labels don't have proper for attributes)
function getFieldByLabel(container: HTMLElement, labelText: string): HTMLInputElement | HTMLSelectElement | null {
  const labels = container.querySelectorAll("label");
  for (const label of labels) {
    if (label.textContent === labelText) {
      const formGroup = label.closest(".form-group");
      if (formGroup) {
        return formGroup.querySelector("input, select");
      }
    }
  }
  return null;
}

describe("EditModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  const mockBead: Bead = {
    id: "bead-123",
    title: "Test Task",
    description: "Test description",
    status: "open",
    priority: 2,
    issue_type: "task",
    assignee: "john.doe",
    estimated_minutes: 480,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    due_at: "2025-02-15T00:00:00Z",
    defer_until: null,
    team: "engineering",
  };

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSave.mockClear();
    mockOnSave.mockResolvedValue(undefined);
  });

  describe("Rendering", () => {
    it("renders the modal with header", () => {
      render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);
      expect(screen.getByText("Edit Bead")).toBeInTheDocument();
    });

    it("renders all form labels", () => {
      render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      expect(screen.getByText("ID")).toBeInTheDocument();
      expect(screen.getByText("Title")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Priority")).toBeInTheDocument();
      expect(screen.getByText("Assignee")).toBeInTheDocument();
      expect(screen.getByText("Due Date")).toBeInTheDocument();
      expect(screen.getByText("Estimated Minutes")).toBeInTheDocument();
      expect(screen.getByText("Team")).toBeInTheDocument();
      expect(screen.getByText("Type")).toBeInTheDocument();
    });

    it("pre-populates form fields with bead data", () => {
      const { container } = render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      expect(getFieldByLabel(container, "ID")).toHaveValue("bead-123");
      expect(getFieldByLabel(container, "Title")).toHaveValue("Test Task");
      expect(getFieldByLabel(container, "Status")).toHaveValue("open");
      expect(getFieldByLabel(container, "Priority")).toHaveValue("2");
      expect(getFieldByLabel(container, "Assignee")).toHaveValue("john.doe");
      expect(getFieldByLabel(container, "Due Date")).toHaveValue("2025-02-15");
      expect(getFieldByLabel(container, "Estimated Minutes")).toHaveValue(480);
      expect(getFieldByLabel(container, "Team")).toHaveValue("ENGINEERING");
      expect(getFieldByLabel(container, "Type")).toHaveValue("task");
    });

    it("disables read-only fields", () => {
      const { container } = render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      expect(getFieldByLabel(container, "ID")).toBeDisabled();
      expect(getFieldByLabel(container, "Team")).toBeDisabled();
      expect(getFieldByLabel(container, "Type")).toBeDisabled();
    });

    it("renders Cancel and Save buttons", () => {
      render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    });

    it("renders close button in header", () => {
      render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);
      expect(screen.getByText("×")).toBeInTheDocument();
    });
  });

  describe("Status dropdown options", () => {
    it("renders all status options", () => {
      render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      expect(screen.getByRole("option", { name: "Open" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "In Progress" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Blocked" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Deferred" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Closed" })).toBeInTheDocument();
    });
  });

  describe("Priority dropdown options", () => {
    it("renders all priority options", () => {
      render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      expect(screen.getByRole("option", { name: "P0 - Critical" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "P1 - High" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "P2 - Medium" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "P3 - Low" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "P4 - Backlog" })).toBeInTheDocument();
    });
  });

  describe("Closing modal", () => {
    it("calls onClose when Cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when close button (×) is clicked", async () => {
      const user = userEvent.setup();
      render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      await user.click(screen.getByText("×"));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when clicking overlay", async () => {
      const user = userEvent.setup();
      const { container } = render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      const overlay = container.querySelector(".modal-overlay");
      await user.click(overlay!);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("does not close when clicking inside modal", async () => {
      const user = userEvent.setup();
      const { container } = render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      const modal = container.querySelector(".modal");
      await user.click(modal!);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("Form editing", () => {
    it("allows editing title", async () => {
      const user = userEvent.setup();
      const { container } = render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      const titleInput = getFieldByLabel(container, "Title")!;
      await user.clear(titleInput);
      await user.type(titleInput, "New Title");

      expect(titleInput).toHaveValue("New Title");
    });

    it("allows changing status", async () => {
      const user = userEvent.setup();
      const { container } = render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      const statusSelect = getFieldByLabel(container, "Status")!;
      await user.selectOptions(statusSelect, "in_progress");

      expect(statusSelect).toHaveValue("in_progress");
    });

    it("allows changing priority", async () => {
      const user = userEvent.setup();
      const { container } = render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      const prioritySelect = getFieldByLabel(container, "Priority")!;
      await user.selectOptions(prioritySelect, "0");

      expect(prioritySelect).toHaveValue("0");
    });

    it("allows editing assignee", async () => {
      const user = userEvent.setup();
      const { container } = render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      const assigneeInput = getFieldByLabel(container, "Assignee")!;
      await user.clear(assigneeInput);
      await user.type(assigneeInput, "jane.doe");

      expect(assigneeInput).toHaveValue("jane.doe");
    });

    it("allows editing due date", async () => {
      const user = userEvent.setup();
      const { container } = render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      const dueDateInput = getFieldByLabel(container, "Due Date")!;
      await user.clear(dueDateInput);
      await user.type(dueDateInput, "2025-03-01");

      expect(dueDateInput).toHaveValue("2025-03-01");
    });

    it("allows editing estimated minutes", async () => {
      const user = userEvent.setup();
      const { container } = render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      const estimatedInput = getFieldByLabel(container, "Estimated Minutes")!;
      await user.clear(estimatedInput);
      await user.type(estimatedInput, "960");

      expect(estimatedInput).toHaveValue(960);
    });
  });

  describe("Form submission", () => {
    it("calls onSave with only changed fields", async () => {
      const user = userEvent.setup();
      const { container } = render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      const titleInput = getFieldByLabel(container, "Title")!;
      await user.clear(titleInput);
      await user.type(titleInput, "Updated Title");

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({ title: "Updated Title" });
      });
    });

    it("calls onSave with multiple changed fields", async () => {
      const user = userEvent.setup();
      const { container } = render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      await user.selectOptions(getFieldByLabel(container, "Status")!, "closed");
      await user.selectOptions(getFieldByLabel(container, "Priority")!, "1");

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          status: "closed",
          priority: 1,
        });
      });
    });

    it("calls onClose when no changes were made", async () => {
      const user = userEvent.setup();
      render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      expect(mockOnSave).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("shows Saving... while save is in progress", async () => {
      const user = userEvent.setup();
      let resolvePromise: () => void;
      mockOnSave.mockImplementation(() => new Promise<void>(resolve => {
        resolvePromise = resolve;
      }));

      const { container } = render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      const titleInput = getFieldByLabel(container, "Title")!;
      await user.clear(titleInput);
      await user.type(titleInput, "New Title");

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      expect(screen.getByRole("button", { name: "Saving..." })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();

      // Resolve the promise
      resolvePromise!();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
      });
    });

    it("converts empty assignee to null", async () => {
      const user = userEvent.setup();
      const { container } = render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      const assigneeInput = getFieldByLabel(container, "Assignee")!;
      await user.clear(assigneeInput);

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({ assignee: null });
      });
    });

    it("converts empty due date to null", async () => {
      const user = userEvent.setup();
      const { container } = render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      const dueDateInput = getFieldByLabel(container, "Due Date")!;
      await user.clear(dueDateInput);

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({ due_at: null });
      });
    });

    it("converts empty estimated minutes to null", async () => {
      const user = userEvent.setup();
      const { container } = render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      const estimatedInput = getFieldByLabel(container, "Estimated Minutes")!;
      await user.clear(estimatedInput);

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({ estimated_minutes: null });
      });
    });

    it("parses estimated minutes as integer", async () => {
      const user = userEvent.setup();
      const { container } = render(<EditModal bead={mockBead} onClose={mockOnClose} onSave={mockOnSave} />);

      const estimatedInput = getFieldByLabel(container, "Estimated Minutes")!;
      await user.clear(estimatedInput);
      await user.type(estimatedInput, "120");

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({ estimated_minutes: 120 });
      });
    });
  });

  describe("Edge cases", () => {
    it("handles bead with null assignee", () => {
      const beadWithNullAssignee = { ...mockBead, assignee: null };
      const { container } = render(<EditModal bead={beadWithNullAssignee} onClose={mockOnClose} onSave={mockOnSave} />);

      expect(getFieldByLabel(container, "Assignee")).toHaveValue("");
    });

    it("handles bead with null due_at", () => {
      const beadWithNullDueAt = { ...mockBead, due_at: null };
      const { container } = render(<EditModal bead={beadWithNullDueAt} onClose={mockOnClose} onSave={mockOnSave} />);

      expect(getFieldByLabel(container, "Due Date")).toHaveValue("");
    });

    it("handles bead with null estimated_minutes", () => {
      const beadWithNullEstimated = { ...mockBead, estimated_minutes: null };
      const { container } = render(<EditModal bead={beadWithNullEstimated} onClose={mockOnClose} onSave={mockOnSave} />);

      expect(getFieldByLabel(container, "Estimated Minutes")).toHaveValue(null);
    });

    it("handles all priority levels", () => {
      for (const priority of [0, 1, 2, 3, 4]) {
        const beadWithPriority = { ...mockBead, priority };
        const { container, unmount } = render(
          <EditModal bead={beadWithPriority} onClose={mockOnClose} onSave={mockOnSave} />
        );

        expect(getFieldByLabel(container, "Priority")).toHaveValue(priority.toString());
        unmount();
      }
    });

    it("handles all status values", () => {
      const statuses: Bead["status"][] = ["open", "in_progress", "blocked", "deferred", "closed"];

      for (const status of statuses) {
        const beadWithStatus = { ...mockBead, status };
        const { container, unmount } = render(
          <EditModal bead={beadWithStatus} onClose={mockOnClose} onSave={mockOnSave} />
        );

        expect(getFieldByLabel(container, "Status")).toHaveValue(status);
        unmount();
      }
    });
  });
});
