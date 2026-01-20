import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FilterDropdown, FilterOption } from "../FilterDropdown";

describe("FilterDropdown", () => {
  const mockOptions: FilterOption[] = [
    { value: "open", label: "Open", count: 5 },
    { value: "in_progress", label: "In Progress", count: 3 },
    { value: "closed", label: "Closed", count: 10 },
  ];

  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render dropdown button with label", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={[]}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText("Status")).toBeInTheDocument();
    });

    it("should show placeholder when no values selected", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={[]}
          onChange={mockOnChange}
          placeholder="Choose status"
        />
      );

      expect(screen.getByText("Choose status")).toBeInTheDocument();
    });

    it("should show selected value label in button", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={["open"]}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText("Open")).toBeInTheDocument();
    });

    it("should show multiple selected values comma-separated (up to 3)", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={["open", "closed"]}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText("Open, Closed")).toBeInTheDocument();
    });

    it("should show count when more than 3 values selected", () => {
      const manyOptions = [
        ...mockOptions,
        { value: "blocked", label: "Blocked", count: 2 },
      ];
      render(
        <FilterDropdown
          label="Status"
          options={manyOptions}
          selectedValues={["open", "in_progress", "closed", "blocked"]}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText("4 selected")).toBeInTheDocument();
    });
  });

  describe("Dropdown Menu", () => {
    it("should show menu when button is clicked", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={[]}
          onChange={mockOnChange}
        />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByText("All Status")).toBeInTheDocument();
      expect(screen.getByText("Open")).toBeInTheDocument();
      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("Closed")).toBeInTheDocument();
    });

    it("should hide menu when button is clicked again", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={[]}
          onChange={mockOnChange}
        />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);
      expect(screen.getByText("All Status")).toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.queryByText("All Status")).not.toBeInTheDocument();
    });

    it("should display option counts", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={[]}
          onChange={mockOnChange}
        />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByText("(5)")).toBeInTheDocument();
      expect(screen.getByText("(3)")).toBeInTheDocument();
      expect(screen.getByText("(10)")).toBeInTheDocument();
    });
  });

  describe("Multi-Select Functionality", () => {
    it("should allow selecting multiple options", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={[]}
          onChange={mockOnChange}
          multiSelect
        />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const openOption = screen.getByText("Open");
      fireEvent.click(openOption);

      expect(mockOnChange).toHaveBeenCalledWith(["open"]);
    });

    it("should toggle option selection", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={["open"]}
          onChange={mockOnChange}
          multiSelect
        />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Use the checkbox with specific aria-label to avoid matching the button display text
      const openCheckbox = screen.getByRole("checkbox", { name: /Select Open/i });
      fireEvent.click(openCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith([]);
    });

    it("should select all options when 'All' is clicked", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={[]}
          onChange={mockOnChange}
          multiSelect
        />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const allOption = screen.getByText("All Status");
      fireEvent.click(allOption);

      expect(mockOnChange).toHaveBeenCalledWith([
        "open",
        "in_progress",
        "closed",
      ]);
    });

    it("should deselect all options when 'All' is clicked and all are selected", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={["open", "in_progress", "closed"]}
          onChange={mockOnChange}
          multiSelect
        />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const allOption = screen.getByText("All Status");
      fireEvent.click(allOption);

      expect(mockOnChange).toHaveBeenCalledWith([]);
    });
  });

  describe("Single-Select Functionality", () => {
    it("should close menu after selecting option in single-select mode", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={[]}
          onChange={mockOnChange}
          multiSelect={false}
        />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const openOption = screen.getByText("Open");
      fireEvent.click(openOption);

      expect(mockOnChange).toHaveBeenCalledWith(["open"]);
      expect(screen.queryByText("All Status")).not.toBeInTheDocument();
    });

    it("should not show 'All' option in single-select mode", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={[]}
          onChange={mockOnChange}
          multiSelect={false}
        />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.queryByText("All Status")).not.toBeInTheDocument();
    });
  });

  describe("Keyboard Navigation", () => {
    it("should open menu on ArrowDown key", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={[]}
          onChange={mockOnChange}
        />
      );

      const button = screen.getByRole("button");
      fireEvent.keyDown(button, { key: "ArrowDown" });

      expect(screen.getByText("All Status")).toBeInTheDocument();
    });

    it("should navigate options with arrow keys", async () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={[]}
          onChange={mockOnChange}
        />
      );

      const button = screen.getByRole("button");
      // First ArrowDown opens the menu and sets focusedIndex to 0
      fireEvent.keyDown(button, { key: "ArrowDown" });

      // Wait for the menu to open and render options
      // Note: focusedIndex maps to the options array, not including "All Status"
      // So focusedIndex=0 is "Open" which is options[1] in DOM (after "All Status")
      await waitFor(() => {
        const options = screen.getAllByRole("option");
        // First real option (Open) should be focused (options[1] after "All Status")
        expect(options[1]).toHaveClass("focused");
      });

      // Second ArrowDown moves focus to the next option
      fireEvent.keyDown(button, { key: "ArrowDown" });

      await waitFor(() => {
        const options = screen.getAllByRole("option");
        // Second real option (In Progress) should now be focused
        expect(options[2]).toHaveClass("focused");
      });
    });

    it("should select focused option on Enter key", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={[]}
          onChange={mockOnChange}
        />
      );

      const button = screen.getByRole("button");
      fireEvent.keyDown(button, { key: "ArrowDown" });
      fireEvent.keyDown(button, { key: "Enter" });

      expect(mockOnChange).toHaveBeenCalled();
    });

    it("should close menu on Escape key", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={[]}
          onChange={mockOnChange}
        />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);
      expect(screen.getByText("All Status")).toBeInTheDocument();

      fireEvent.keyDown(button, { key: "Escape" });
      expect(screen.queryByText("All Status")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={[]}
          onChange={mockOnChange}
        />
      );

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-haspopup", "listbox");
      expect(button).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");
    });

    it("should have aria-label on button", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={[]}
          onChange={mockOnChange}
        />
      );

      const button = screen.getByLabelText("Status filter");
      expect(button).toBeInTheDocument();
    });

    it("should have role listbox on menu", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={[]}
          onChange={mockOnChange}
        />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const listbox = screen.getByRole("listbox");
      expect(listbox).toHaveAttribute("aria-multiselectable", "true");
    });

    it("should mark options as selected with aria-selected", () => {
      render(
        <FilterDropdown
          label="Status"
          options={mockOptions}
          selectedValues={["open"]}
          onChange={mockOnChange}
        />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const options = screen.getAllByRole("option");
      // First option is "All", second is "Open" which should be selected
      expect(options[1]).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("Click Outside to Close", () => {
    it("should close menu when clicking outside", async () => {
      render(
        <div>
          <FilterDropdown
            label="Status"
            options={mockOptions}
            selectedValues={[]}
            onChange={mockOnChange}
          />
          <button data-testid="outside">Outside</button>
        </div>
      );

      const button = screen.getByRole("button", { name: /Status filter/i });
      fireEvent.click(button);
      expect(screen.getByText("All Status")).toBeInTheDocument();

      const outsideButton = screen.getByTestId("outside");
      fireEvent.mouseDown(outsideButton);

      await waitFor(() => {
        expect(screen.queryByText("All Status")).not.toBeInTheDocument();
      });
    });
  });
});
