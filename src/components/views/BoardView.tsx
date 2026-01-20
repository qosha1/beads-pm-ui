"use client";

import { useState, useMemo, DragEvent } from 'react';
import { startOfDay, endOfDay } from 'date-fns';
import type { Bead, Dependency } from '@/lib/types';
import { useBoardState } from './ViewContext';
import { ProgressBar } from '../shared/ProgressBar';
import {
  calculateExpectedProgress,
  calculateHealthStatus,
  type HealthStatus,
} from '@/lib/progress';
import { parseDateRangeFromTitle } from '@/lib/dates';
import { useGrouping, useBeadGrouping } from '../grouping';
import Swimlane from '../grouping/Swimlane';
import { HealthBadge } from '../shared/HealthBadge';

interface Team {
  id: string;
  name: string;
}

interface BoardViewProps {
  beads: Bead[];
  dependencies: Dependency[];
  teams?: Team[];
  selectedTeam: string | null;
  onTeamChange: (teamId: string | null) => void;
  onUpdate: (id: string, team: string, updates: Record<string, unknown>) => Promise<void>;
}

type ColumnStatus = 'open' | 'in_progress' | 'blocked' | 'closed' | 'deferred';

interface ColumnConfig {
  id: ColumnStatus;
  label: string;
  icon: string;
  colorAccent: string;
}

const COLUMN_CONFIGS: ColumnConfig[] = [
  { id: 'open', label: 'Open', icon: '○', colorAccent: '#2563eb' },
  { id: 'in_progress', label: 'In Progress', icon: '↻', colorAccent: '#eab308' },
  { id: 'blocked', label: 'Blocked', icon: '✕', colorAccent: '#ef4444' },
  { id: 'closed', label: 'Closed', icon: '✓', colorAccent: '#22c55e' },
  { id: 'deferred', label: 'Deferred', icon: '⏸', colorAccent: '#9ca3af' },
];

interface BoardCardProps {
  bead: Bead;
  onDragStart: (e: DragEvent<HTMLDivElement>, bead: Bead) => void;
  onDragEnd: (e: DragEvent<HTMLDivElement>) => void;
}

function BoardCard({ bead, onDragStart, onDragEnd }: BoardCardProps) {
  const isOverdue = bead.due_at ? new Date(bead.due_at) < new Date() && bead.status !== 'closed' : false;
  const dueDate = bead.due_at ? new Date(bead.due_at) : null;

  // Calculate health status
  const healthStatus = useMemo((): HealthStatus => {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Calculate actual progress based on status
    const actualProgress =
      bead.status === 'closed' ? 100 : bead.status === 'in_progress' ? 50 : 0;

    // Determine date range
    let startDate: Date;
    let endDate: Date;

    const parsedRange = parseDateRangeFromTitle(bead.title, currentYear);
    if (parsedRange) {
      startDate = parsedRange.start;
      endDate = parsedRange.end;
    } else if (bead.due_at) {
      startDate = startOfDay(new Date(bead.created_at));
      endDate = endOfDay(new Date(bead.due_at));
    } else {
      startDate = startOfDay(new Date(bead.created_at));
      const estimatedDays = bead.estimated_minutes
        ? Math.ceil(bead.estimated_minutes / 480)
        : 14;
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + estimatedDays);
      endDate = endOfDay(endDate);
    }

    // Calculate expected progress and health status
    const expectedProgress = calculateExpectedProgress(startDate, endDate, now);
    const hasBlockers = bead.status === 'blocked';
    const healthStatusResult = calculateHealthStatus(
      actualProgress,
      expectedProgress,
      hasBlockers
    );

    return healthStatusResult.status;
  }, [bead]);

  // Calculate progress based on time elapsed if dates are available
  const progress = useMemo(() => {
    if (!bead.created_at || !bead.due_at) return 0;
    const expectedProgress = calculateExpectedProgress(
      new Date(bead.created_at),
      new Date(bead.due_at)
    );
    return Math.min(expectedProgress, 100);
  }, [bead.created_at, bead.due_at]);

  const formatDueDate = (date: Date): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getPriorityColor = (priority: number): string => {
    const colors: Record<number, string> = {
      0: '#ef4444', // Critical - red
      1: '#f97316', // High - orange
      2: '#eab308', // Medium - yellow
      3: '#3b82f6', // Low - blue
      4: '#9ca3af', // None - gray
    };
    return colors[priority] || colors[4];
  };

  const getPriorityLabel = (priority: number): string => {
    const labels: Record<number, string> = {
      0: 'P0',
      1: 'P1',
      2: 'P2',
      3: 'P3',
      4: 'P4',
    };
    return labels[priority] || 'P4';
  };

  const getHealthBorderColor = (health: HealthStatus): string => {
    const colors: Record<HealthStatus, string> = {
      on_track: '#22c55e',
      at_risk: '#eab308',
      blocked: '#ef4444',
      not_started: '#9ca3af',
    };
    return colors[health];
  };

  const healthBorderColor = getHealthBorderColor(healthStatus);

  return (
    <div
      className="board-card"
      draggable
      onDragStart={(e) => onDragStart(e, bead)}
      onDragEnd={onDragEnd}
      role="listitem"
      tabIndex={0}
      aria-label={`Task: ${bead.title}, Priority ${bead.priority}, Status ${bead.status}, Health: ${healthStatus.replace('_', ' ')}${dueDate ? `, Due ${formatDueDate(dueDate)}` : ''}`}
      style={{
        borderColor: healthBorderColor,
        borderWidth: '2px',
        borderStyle: 'solid',
      }}
    >
      <div className="board-card-header">
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <div className="board-card-priority" style={{ backgroundColor: getPriorityColor(bead.priority) }}>
            {getPriorityLabel(bead.priority)}
          </div>
          <div className="board-card-team">{bead.team.substring(0, 3).toUpperCase()}</div>
        </div>
        <HealthBadge status={healthStatus} compact={true} />
      </div>

      <div className="board-card-title">{bead.title}</div>

      {(bead.created_at && bead.due_at) && (
        <div className="board-card-progress">
          <ProgressBar
            progress={progress}
            size="sm"
            showLabel={false}
            status={bead.status === 'blocked' ? 'blocked' : 'on_track'}
          />
        </div>
      )}

      <div className="board-card-footer">
        {dueDate && (
          <span
            className={`board-card-due ${isOverdue ? 'overdue' : ''}`}
            style={{ color: isOverdue ? 'var(--danger)' : 'var(--muted)' }}
          >
            {formatDueDate(dueDate)}
          </span>
        )}
        {bead.assignee && (
          <span className="board-card-assignee">@{bead.assignee}</span>
        )}
        <span className="board-card-type">{bead.issue_type}</span>
      </div>
    </div>
  );
}

interface BoardColumnProps {
  config: ColumnConfig;
  beads: Bead[];
  isCollapsed: boolean;
  onToggleCollapse: (columnId: ColumnStatus) => void;
  onDrop: (columnId: ColumnStatus) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, bead: Bead) => void;
  onDragEnd: (e: DragEvent<HTMLDivElement>) => void;
  isDraggingOver: boolean;
}

function BoardColumn({
  config,
  beads,
  isCollapsed,
  onToggleCollapse,
  onDrop,
  onDragOver,
  onDragStart,
  onDragEnd,
  isDraggingOver,
}: BoardColumnProps) {
  return (
    <div
      className={`board-column ${isCollapsed ? 'collapsed' : ''} ${isDraggingOver ? 'drag-over' : ''}`}
      role="region"
      aria-label={`${config.label} column`}
    >
      <div
        className="board-column-header"
        style={{ borderBottomColor: config.colorAccent }}
      >
        <div className="board-column-title">
          <span className="board-column-icon" aria-hidden="true">{config.icon}</span>
          <span className="board-column-label">{config.label}</span>
          <span className="board-column-count">({beads.length})</span>
        </div>
        <button
          className="board-column-collapse"
          onClick={() => onToggleCollapse(config.id)}
          aria-label={isCollapsed ? `Expand ${config.label} column` : `Collapse ${config.label} column`}
          aria-expanded={!isCollapsed}
          type="button"
        >
          {isCollapsed ? '▶' : '▼'}
        </button>
      </div>

      {!isCollapsed && (
        <div
          className="board-column-body"
          onDrop={() => onDrop(config.id)}
          onDragOver={onDragOver}
          role="list"
          aria-label={`${config.label} tasks`}
        >
          {beads.length === 0 ? (
            <div className="board-column-empty">
              No tasks
            </div>
          ) : (
            beads.map((bead) => (
              <BoardCard
                key={bead.id}
                bead={bead}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function BoardView({ beads, dependencies, teams = [], selectedTeam, onTeamChange, onUpdate }: BoardViewProps) {
  const [boardState, setBoardState] = useBoardState();
  const { state: groupingState } = useGrouping();
  const [draggedBead, setDraggedBead] = useState<Bead | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnStatus | null>(null);

  // Group beads based on grouping option
  const groupedBeads = useBeadGrouping(beads, groupingState.groupBy);

  // Group beads by status within each group
  const beadsByStatus = useMemo(() => {
    const groups: Record<ColumnStatus, Bead[]> = {
      open: [],
      in_progress: [],
      blocked: [],
      closed: [],
      deferred: [],
    };

    beads.forEach((bead) => {
      const status = bead.status as ColumnStatus;
      if (groups[status]) {
        groups[status].push(bead);
      }
    });

    return groups;
  }, [beads]);

  const handleToggleCollapse = (columnId: ColumnStatus) => {
    const newCollapsed = new Set(boardState.collapsedColumns);
    if (newCollapsed.has(columnId)) {
      newCollapsed.delete(columnId);
    } else {
      newCollapsed.add(columnId);
    }
    setBoardState({ collapsedColumns: newCollapsed });
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, bead: Bead) => {
    setDraggedBead(bead);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', bead.id);

    // Add visual feedback
    const target = e.currentTarget;
    setTimeout(() => {
      target.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    target.classList.remove('dragging');
    setDraggedBead(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (newStatus: ColumnStatus) => {
    if (!draggedBead || draggedBead.status === newStatus) {
      setDraggedBead(null);
      setDragOverColumn(null);
      return;
    }

    try {
      await onUpdate(draggedBead.id, draggedBead.team, { status: newStatus });
    } catch (error) {
      console.error('Failed to update bead status:', error);
    } finally {
      setDraggedBead(null);
      setDragOverColumn(null);
    }
  };

  const handleColumnDragOver = (columnId: ColumnStatus) => {
    setDragOverColumn(columnId);
  };

  // Render with swimlanes if grouping is enabled
  if (groupingState.groupBy !== 'none') {
    return (
      <div className="board-view board-view-swimlanes" role="region" aria-label="Board view with swimlanes">
        {groupedBeads.map((group) => {
          // For each group, create columns with status breakdown
          const groupBeadsByStatus = useMemo(() => {
            const groups: Record<ColumnStatus, Bead[]> = {
              open: [],
              in_progress: [],
              blocked: [],
              closed: [],
              deferred: [],
            };

            group.beads.forEach((bead) => {
              const status = bead.status as ColumnStatus;
              if (groups[status]) {
                groups[status].push(bead);
              }
            });

            return groups;
          }, [group.beads]);

          return (
            <Swimlane
              key={group.groupId}
              groupId={group.groupId}
              groupLabel={group.groupLabel}
              itemCount={group.beads.length}
              completedCount={group.completedCount}
              progressPercent={group.progressPercent}
            >
              <div className="board-columns">
                {boardState.columnOrder.map((columnId) => {
                  const config = COLUMN_CONFIGS.find((c) => c.id === columnId);
                  if (!config) return null;

                  return (
                    <BoardColumn
                      key={`${group.groupId}-${config.id}`}
                      config={config}
                      beads={groupBeadsByStatus[config.id]}
                      isCollapsed={boardState.collapsedColumns.has(config.id)}
                      onToggleCollapse={handleToggleCollapse}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      isDraggingOver={dragOverColumn === config.id}
                    />
                  );
                })}
              </div>
            </Swimlane>
          );
        })}
      </div>
    );
  }

  // Default view without grouping
  return (
    <div className="board-view" role="region" aria-label="Board view">
      <div className="board-columns">
        {boardState.columnOrder.map((columnId) => {
          const config = COLUMN_CONFIGS.find((c) => c.id === columnId);
          if (!config) return null;

          return (
            <BoardColumn
              key={config.id}
              config={config}
              beads={beadsByStatus[config.id]}
              isCollapsed={boardState.collapsedColumns.has(config.id)}
              onToggleCollapse={handleToggleCollapse}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              isDraggingOver={dragOverColumn === config.id}
            />
          );
        })}
      </div>
    </div>
  );
}
