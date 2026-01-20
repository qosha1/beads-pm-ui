"use client";

import { useCallback } from "react";

export interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
  onClick?: () => void;
  icon?: React.ReactNode;
}

/**
 * FilterChip - Displays an active filter with remove button
 * Follows wireframe spec with hover states and keyboard accessibility
 */
export function FilterChip({
  label,
  value,
  onRemove,
  onClick,
  icon,
}: FilterChipProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onRemove();
      } else if (e.key === "Enter" && onClick) {
        e.preventDefault();
        onClick();
      }
    },
    [onRemove, onClick]
  );

  const handleRemoveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove();
    },
    [onRemove]
  );

  return (
    <div
      className="filter-chip"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={`${label}: ${value}. Click to edit, press Delete to remove`}
    >
      {icon && <span className="filter-chip-icon">{icon}</span>}
      <span className="filter-chip-label">
        {label}: <span className="filter-chip-value">{value}</span>
      </span>
      <button
        className="filter-chip-remove"
        onClick={handleRemoveClick}
        aria-label={`Remove ${label} filter`}
        tabIndex={-1}
        type="button"
      >
        ×
      </button>
    </div>
  );
}
