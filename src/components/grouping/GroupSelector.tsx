"use client";

import { useCallback, useRef, useState, useEffect } from 'react';
import { useGrouping, type GroupByOption } from './GroupingContext';

const GROUP_OPTIONS: Array<{ value: GroupByOption; label: string; icon: string }> = [
  { value: 'none', label: 'No Grouping', icon: '—' },
  { value: 'status', label: 'Group by Status', icon: '◉' },
  { value: 'priority', label: 'Group by Priority', icon: '⚡' },
  { value: 'team', label: 'Group by Team', icon: '👥' },
  { value: 'assignee', label: 'Group by Assignee', icon: '👤' },
];

export default function GroupSelector() {
  const { state, setGroupBy } = useGrouping();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = GROUP_OPTIONS.find(opt => opt.value === state.groupBy) || GROUP_OPTIONS[0];

  const handleSelect = useCallback((value: GroupByOption) => {
    setGroupBy(value);
    setIsOpen(false);
  }, [setGroupBy]);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(prev => !prev);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <div className="group-selector" ref={dropdownRef}>
      <button
        className="group-selector-trigger"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Group by options"
        type="button"
      >
        <span className="group-selector-icon">{currentOption.icon}</span>
        <span className="group-selector-label">{currentOption.label}</span>
        <svg
          className={`group-selector-chevron ${isOpen ? 'open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <ul
          className="group-selector-dropdown"
          role="listbox"
          aria-label="Grouping options"
        >
          {GROUP_OPTIONS.map((option) => (
            <li key={option.value} role="presentation">
              <button
                className={`group-selector-option ${state.groupBy === option.value ? 'active' : ''}`}
                role="option"
                aria-selected={state.groupBy === option.value}
                onClick={() => handleSelect(option.value)}
                type="button"
              >
                <span className="group-selector-option-icon">{option.icon}</span>
                <span className="group-selector-option-label">{option.label}</span>
                {state.groupBy === option.value && (
                  <svg
                    className="group-selector-check"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M13 4L6 11L3 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .group-selector {
          position: relative;
          display: inline-block;
        }

        .group-selector-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--fg);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.15s ease;
          min-height: 36px;
        }

        .group-selector-trigger:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: var(--accent);
        }

        .group-selector-trigger:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        .group-selector-icon {
          font-size: 1rem;
          line-height: 1;
        }

        .group-selector-label {
          font-weight: 500;
        }

        .group-selector-chevron {
          transition: transform 0.2s ease;
          color: var(--muted);
        }

        .group-selector-chevron.open {
          transform: rotate(180deg);
        }

        .group-selector-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          min-width: 200px;
          background: #1a1a1a;
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
          padding: 4px;
          margin: 0;
          list-style: none;
          z-index: 1000;
          animation: slideDown 0.15s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .group-selector-option {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 12px;
          background: transparent;
          border: none;
          border-radius: 4px;
          color: var(--fg);
          font-size: 0.875rem;
          text-align: left;
          cursor: pointer;
          transition: background 0.1s ease;
        }

        .group-selector-option:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .group-selector-option.active {
          background: rgba(59, 130, 246, 0.15);
          color: var(--accent);
        }

        .group-selector-option-icon {
          font-size: 1rem;
          line-height: 1;
          width: 20px;
          text-align: center;
        }

        .group-selector-option-label {
          flex: 1;
        }

        .group-selector-check {
          color: var(--accent);
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
