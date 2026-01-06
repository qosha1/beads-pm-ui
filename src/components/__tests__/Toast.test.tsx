import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { ToastContainer, useToast, type Toast } from "../Toast";

describe("ToastContainer", () => {
  const mockOnRemove = vi.fn();

  beforeEach(() => {
    mockOnRemove.mockClear();
  });

  it("renders nothing when toasts array is empty", () => {
    const { container } = render(
      <ToastContainer toasts={[]} onRemove={mockOnRemove} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders toast messages", () => {
    const toasts: Toast[] = [
      { id: "1", message: "Test message", type: "info" },
    ];
    render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />);
    expect(screen.getByText("Test message")).toBeInTheDocument();
  });

  it("renders multiple toasts", () => {
    const toasts: Toast[] = [
      { id: "1", message: "First toast", type: "info" },
      { id: "2", message: "Second toast", type: "success" },
      { id: "3", message: "Third toast", type: "error" },
    ];
    render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />);
    expect(screen.getByText("First toast")).toBeInTheDocument();
    expect(screen.getByText("Second toast")).toBeInTheDocument();
    expect(screen.getByText("Third toast")).toBeInTheDocument();
  });

  it("displays success icon for success toast", () => {
    const toasts: Toast[] = [
      { id: "1", message: "Success!", type: "success" },
    ];
    render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />);
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("displays error icon for error toast", () => {
    const toasts: Toast[] = [
      { id: "1", message: "Error!", type: "error" },
    ];
    render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />);
    expect(screen.getByText("✕")).toBeInTheDocument();
  });

  it("displays info icon for info toast", () => {
    const toasts: Toast[] = [
      { id: "1", message: "Info!", type: "info" },
    ];
    render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />);
    expect(screen.getByText("ℹ")).toBeInTheDocument();
  });

  it("applies correct class based on toast type", () => {
    const toasts: Toast[] = [
      { id: "1", message: "Success!", type: "success" },
    ];
    const { container } = render(
      <ToastContainer toasts={toasts} onRemove={mockOnRemove} />
    );
    const toast = container.querySelector(".toast.success");
    expect(toast).toBeInTheDocument();
  });

  it("calls onRemove after timeout", async () => {
    vi.useFakeTimers();
    const toasts: Toast[] = [
      { id: "1", message: "Auto remove", type: "info" },
    ];
    render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />);

    expect(mockOnRemove).not.toHaveBeenCalled();

    // Fast-forward past the 3000ms delay + 200ms exit animation
    await act(async () => {
      vi.advanceTimersByTime(3200);
    });

    expect(mockOnRemove).toHaveBeenCalledWith("1");
    vi.useRealTimers();
  });

  it("adds exit class before removal", async () => {
    vi.useFakeTimers();
    const toasts: Toast[] = [
      { id: "1", message: "Exiting toast", type: "info" },
    ];
    const { container } = render(
      <ToastContainer toasts={toasts} onRemove={mockOnRemove} />
    );

    // Initially no exit class
    expect(container.querySelector(".toast.exit")).toBeNull();

    // Fast-forward to when exit class is added (after 3000ms)
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(container.querySelector(".toast.exit")).toBeInTheDocument();
    vi.useRealTimers();
  });
});

describe("useToast hook", () => {
  it("starts with empty toasts array", () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it("adds toast with success helper", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success("Success message");
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe("Success message");
    expect(result.current.toasts[0].type).toBe("success");
  });

  it("adds toast with error helper", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.error("Error message");
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe("Error message");
    expect(result.current.toasts[0].type).toBe("error");
  });

  it("adds toast with info helper", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.info("Info message");
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe("Info message");
    expect(result.current.toasts[0].type).toBe("info");
  });

  it("removes toast by id", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success("Toast 1");
      result.current.error("Toast 2");
    });

    expect(result.current.toasts).toHaveLength(2);
    const toastId = result.current.toasts[0].id;

    act(() => {
      result.current.removeToast(toastId);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe("Toast 2");
  });

  it("generates unique ids for each toast", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.info("Toast 1");
      result.current.info("Toast 2");
      result.current.info("Toast 3");
    });

    const ids = result.current.toasts.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });
});
