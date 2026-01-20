import { vi } from 'vitest';
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterChip } from "../FilterChip";

describe("FilterChip", () => {
  const mockOnRemove = vi.fn();
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render chip with label and value", () => {
      render(
        <FilterChip
          label="Status"
          value="Open"
          onRemove={mockOnRemove}
        />
      );

      expect(screen.getByText(/Status:/)).toBeInTheDocument();
      expect(screen.getByText("Open")).toBeInTheDocument();
    });

    it("should render with icon when provided", () => {
      render(
        <FilterChip
          label="Status"
          value="Open"
          onRemove={mockOnRemove}
          icon={<span data-testid="test-icon">🔵</span>}
        />
      );

      expect(screen.getByTestId("test-icon")).toBeInTheDocument();
    });

    it("should render remove button", () => {
      render(
        <FilterChip
          label="Status"
          value="Open"
          onRemove={mockOnRemove}
        />
      );

      const removeButton = screen.getByRole("button", {
        name: /Remove Status filter/i,
      });
      expect(removeButton).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("should call onRemove when remove button is clicked", () => {
      render(
        <FilterChip
          label="Status"
          value="Open"
          onRemove={mockOnRemove}
        />
      );

      const removeButton = screen.getByRole("button", {
        name: /Remove Status filter/i,
      });
      fireEvent.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledTimes(1);
    });

    it("should call onClick when chip body is clicked", () => {
      render(
        <FilterChip
          label="Status"
          value="Open"
          onRemove={mockOnRemove}
          onClick={mockOnClick}
        />
      );

      const chip = screen.getByRole("button", {
        name: /Status: Open/i,
      });
      fireEvent.click(chip);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it("should not call onClick when remove button is clicked", () => {
      render(
        <FilterChip
          label="Status"
          value="Open"
          onRemove={mockOnRemove}
          onClick={mockOnClick}
        />
      );

      const removeButton = screen.getByRole("button", {
        name: /Remove Status filter/i,
      });
      fireEvent.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledTimes(1);
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe("Keyboard Accessibility", () => {
    it("should call onRemove when Delete key is pressed", () => {
      render(
        <FilterChip
          label="Status"
          value="Open"
          onRemove={mockOnRemove}
        />
      );

      const chip = screen.getByRole("button", {
        name: /Status: Open/i,
      });
      fireEvent.keyDown(chip, { key: "Delete" });

      expect(mockOnRemove).toHaveBeenCalledTimes(1);
    });

    it("should call onRemove when Backspace key is pressed", () => {
      render(
        <FilterChip
          label="Status"
          value="Open"
          onRemove={mockOnRemove}
        />
      );

      const chip = screen.getByRole("button", {
        name: /Status: Open/i,
      });
      fireEvent.keyDown(chip, { key: "Backspace" });

      expect(mockOnRemove).toHaveBeenCalledTimes(1);
    });

    it("should call onClick when Enter key is pressed", () => {
      render(
        <FilterChip
          label="Status"
          value="Open"
          onRemove={mockOnRemove}
          onClick={mockOnClick}
        />
      );

      const chip = screen.getByRole("button", {
        name: /Status: Open/i,
      });
      fireEvent.keyDown(chip, { key: "Enter" });

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it("should be keyboard focusable", () => {
      render(
        <FilterChip
          label="Status"
          value="Open"
          onRemove={mockOnRemove}
        />
      );

      const chip = screen.getByRole("button", {
        name: /Status: Open/i,
      });

      expect(chip).toHaveAttribute("tabIndex", "0");
    });
  });

  describe("Accessibility Attributes", () => {
    it("should have descriptive aria-label", () => {
      render(
        <FilterChip
          label="Status"
          value="Open"
          onRemove={mockOnRemove}
        />
      );

      const chip = screen.getByRole("button", {
        name: /Status: Open.*Delete to remove/i,
      });

      expect(chip).toBeInTheDocument();
    });

    it("should have role button", () => {
      render(
        <FilterChip
          label="Status"
          value="Open"
          onRemove={mockOnRemove}
        />
      );

      const chip = screen.getByRole("button", {
        name: /Status: Open/i,
      });

      expect(chip.getAttribute("role")).toBe("button");
    });

    it("should have tabindex -1 on remove button to prevent double focus", () => {
      render(
        <FilterChip
          label="Status"
          value="Open"
          onRemove={mockOnRemove}
        />
      );

      const removeButton = screen.getByRole("button", {
        name: /Remove Status filter/i,
      });

      expect(removeButton).toHaveAttribute("tabIndex", "-1");
    });
  });
});
