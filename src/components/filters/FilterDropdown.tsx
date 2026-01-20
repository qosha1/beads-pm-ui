"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  multiSelect?: boolean;
  placeholder?: string;
}

/**
 * FilterDropdown - Reusable multi-select dropdown component
 * Implements keyboard navigation and ARIA patterns from wireframe spec
 */
export function FilterDropdown({
  label,
  options,
  selectedValues,
  onChange,
  multiSelect = true,
  placeholder = "Select...",
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            setFocusedIndex(0);
          } else {
            setFocusedIndex((prev) =>
              prev < options.length - 1 ? prev + 1 : prev
            );
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            setFocusedIndex(0);
          } else if (focusedIndex >= 0) {
            toggleOption(options[focusedIndex].value);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          buttonRef.current?.focus();
          break;
        case "Tab":
          if (isOpen) {
            setIsOpen(false);
          }
          break;
      }
    },
    [isOpen, focusedIndex, options]
  );

  const toggleOption = useCallback(
    (value: string) => {
      if (multiSelect) {
        const newValues = selectedValues.includes(value)
          ? selectedValues.filter((v) => v !== value)
          : [...selectedValues, value];
        onChange(newValues);
      } else {
        onChange([value]);
        setIsOpen(false);
      }
    },
    [selectedValues, onChange, multiSelect]
  );

  const handleToggleAll = useCallback(() => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((opt) => opt.value));
    }
  }, [selectedValues, options, onChange]);

  const displayText = (() => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      const option = options.find((opt) => opt.value === selectedValues[0]);
      return option?.label || selectedValues[0];
    }
    if (selectedValues.length <= 3) {
      return selectedValues
        .map((val) => {
          const option = options.find((opt) => opt.value === val);
          return option?.label || val;
        })
        .join(", ");
    }
    return `${selectedValues.length} selected`;
  })();

  const allSelected = selectedValues.length === options.length;
  const someSelected = selectedValues.length > 0 && !allSelected;

  return (
    <div className="filter-dropdown" ref={dropdownRef}>
      <button
        ref={buttonRef}
        className={`filter-dropdown-button ${isOpen ? "open" : ""} ${
          selectedValues.length > 0 ? "has-selection" : ""
        }`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${label} filter`}
        type="button"
      >
        <span className="filter-dropdown-label">{label}</span>
        <span className="filter-dropdown-value">{displayText}</span>
        <span className={`filter-dropdown-arrow ${isOpen ? "up" : "down"}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          className="filter-dropdown-menu"
          role="listbox"
          aria-multiselectable={multiSelect}
          aria-label={`${label} options`}
        >
          {multiSelect && options.length > 1 && (
            <>
              <div
                className={`filter-dropdown-option ${
                  allSelected ? "selected" : someSelected ? "indeterminate" : ""
                }`}
                onClick={handleToggleAll}
                role="option"
                aria-selected={allSelected}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = someSelected;
                    }
                  }}
                  readOnly
                  aria-label="Select all"
                />
                <span className="filter-option-label">All {label}</span>
              </div>
              <div className="filter-dropdown-divider" role="separator" />
            </>
          )}

          {options.map((option, index) => {
            const isSelected = selectedValues.includes(option.value);
            const isFocused = index === focusedIndex;

            return (
              <div
                key={option.value}
                className={`filter-dropdown-option ${
                  isSelected ? "selected" : ""
                } ${isFocused ? "focused" : ""}`}
                onClick={() => toggleOption(option.value)}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                {multiSelect && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    aria-label={`Select ${option.label}`}
                  />
                )}
                {!multiSelect && (
                  <input
                    type="radio"
                    checked={isSelected}
                    readOnly
                    aria-label={`Select ${option.label}`}
                  />
                )}
                {option.icon && (
                  <span className="filter-option-icon">{option.icon}</span>
                )}
                <span className="filter-option-label">{option.label}</span>
                {option.count !== undefined && (
                  <span className="filter-option-count">({option.count})</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
