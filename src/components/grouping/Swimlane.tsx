"use client";

import { ReactNode, useMemo } from 'react';
import { useGrouping } from './GroupingContext';
import GroupHeader from './GroupHeader';

interface SwimlaneProps {
  groupId: string;
  groupLabel: string;
  children: ReactNode;
  itemCount: number;
  completedCount?: number;
  progressPercent?: number;
  emptyMessage?: string;
  className?: string;
}

export default function Swimlane({
  groupId,
  groupLabel,
  children,
  itemCount,
  completedCount,
  progressPercent,
  emptyMessage = 'No items in this group',
  className = '',
}: SwimlaneProps) {
  const { isGroupCollapsed } = useGrouping();
  const collapsed = isGroupCollapsed(groupId);

  // Calculate progress if not provided
  const calculatedProgress = useMemo(() => {
    if (progressPercent !== undefined) return progressPercent;
    if (completedCount !== undefined && itemCount > 0) {
      return (completedCount / itemCount) * 100;
    }
    return undefined;
  }, [progressPercent, completedCount, itemCount]);

  return (
    <div className={`swimlane ${collapsed ? 'collapsed' : 'expanded'} ${className}`}>
      <GroupHeader
        groupId={groupId}
        groupLabel={groupLabel}
        itemCount={itemCount}
        completedCount={completedCount}
        progressPercent={calculatedProgress}
        variant="swimlane"
      />

      {!collapsed && (
        <div className="swimlane-content" role="region" aria-label={`${groupLabel} content`}>
          {itemCount === 0 ? (
            <div className="swimlane-empty" role="status">
              <p className="swimlane-empty-message">{emptyMessage}</p>
            </div>
          ) : (
            children
          )}
        </div>
      )}

      <style jsx>{`
        .swimlane {
          display: flex;
          flex-direction: column;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 16px;
          transition: all 0.2s ease;
        }

        .swimlane.collapsed {
          margin-bottom: 8px;
        }

        .swimlane:last-child {
          margin-bottom: 0;
        }

        .swimlane-content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          animation: slideDown 0.2s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .swimlane-empty {
          padding: 32px 16px;
          text-align: center;
        }

        .swimlane-empty-message {
          color: var(--muted);
          font-size: 0.875rem;
          margin: 0;
        }

        @media (max-width: 768px) {
          .swimlane {
            margin-bottom: 12px;
          }

          .swimlane-content {
            padding: 12px;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}
