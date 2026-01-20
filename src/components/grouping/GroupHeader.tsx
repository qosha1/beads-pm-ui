"use client";

import { useCallback } from 'react';
import { useGrouping } from './GroupingContext';

interface GroupHeaderProps {
  groupId: string;
  groupLabel: string;
  itemCount: number;
  completedCount?: number;
  progressPercent?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: (groupId: string) => void;
  className?: string;
  variant?: 'default' | 'swimlane';
}

export default function GroupHeader({
  groupId,
  groupLabel,
  itemCount,
  completedCount,
  progressPercent,
  isCollapsed,
  onToggleCollapse,
  className = '',
  variant = 'default',
}: GroupHeaderProps) {
  const { toggleGroupCollapse, isGroupCollapsed } = useGrouping();

  const collapsed = isCollapsed !== undefined ? isCollapsed : isGroupCollapsed(groupId);

  const handleToggle = useCallback(() => {
    if (onToggleCollapse) {
      onToggleCollapse(groupId);
    } else {
      toggleGroupCollapse(groupId);
    }
  }, [groupId, onToggleCollapse, toggleGroupCollapse]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  }, [handleToggle]);

  return (
    <div
      className={`group-header ${variant} ${collapsed ? 'collapsed' : 'expanded'} ${className}`}
      role="button"
      tabIndex={0}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      aria-expanded={!collapsed}
      aria-label={`${groupLabel} group with ${itemCount} items. ${collapsed ? 'Collapsed' : 'Expanded'}`}
    >
      <div className="group-header-left">
        <svg
          className={`group-header-chevron ${collapsed ? 'collapsed' : 'expanded'}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M6 4L10 8L6 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h3 className="group-header-title">{groupLabel}</h3>
        <span className="group-header-count" aria-label={`${itemCount} items`}>
          {itemCount}
        </span>
      </div>

      <div className="group-header-right">
        {completedCount !== undefined && (
          <span className="group-header-completed" aria-label={`${completedCount} completed`}>
            {completedCount} done
          </span>
        )}
        {progressPercent !== undefined && (
          <div className="group-header-progress" aria-label={`${Math.round(progressPercent)}% complete`}>
            <div className="group-header-progress-track">
              <div
                className="group-header-progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
            <span className="group-header-progress-text">
              {Math.round(progressPercent)}%
            </span>
          </div>
        )}
      </div>

      <style jsx>{`
        .group-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          user-select: none;
          transition: background 0.15s ease;
          position: sticky;
          top: 0;
          z-index: 10;
          backdrop-filter: blur(8px);
        }

        .group-header:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .group-header:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: -2px;
        }

        .group-header.swimlane {
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.03);
        }

        .group-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .group-header-chevron {
          flex-shrink: 0;
          color: var(--muted);
          transition: transform 0.2s ease;
        }

        .group-header-chevron.collapsed {
          transform: rotate(0deg);
        }

        .group-header-chevron.expanded {
          transform: rotate(90deg);
        }

        .group-header-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--fg);
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .group-header.swimlane .group-header-title {
          font-size: 0.75rem;
          text-transform: uppercase;
        }

        .group-header-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 20px;
          padding: 0 6px;
          background: var(--border);
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--muted);
        }

        .group-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .group-header-completed {
          font-size: 0.75rem;
          color: var(--muted);
        }

        .group-header-progress {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .group-header-progress-track {
          width: 80px;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .group-header-progress-fill {
          height: 100%;
          background: var(--accent);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .group-header-progress-text {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--muted);
          min-width: 36px;
          text-align: right;
        }

        @media (max-width: 768px) {
          .group-header {
            padding: 10px 12px;
          }

          .group-header-right {
            gap: 8px;
          }

          .group-header-progress-track {
            width: 60px;
          }

          .group-header-completed {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
