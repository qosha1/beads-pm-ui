"use client";

import { useState, useCallback, useEffect } from 'react';
import { GanttChart } from '../GanttChart';
import { useTimelineState } from './ViewContext';
import type { Bead, Dependency } from '@/lib/types';
import { format, isToday } from 'date-fns';

interface Team {
  id: string;
  name: string;
}

interface TimelineViewProps {
  beads: Bead[];
  dependencies: Dependency[];
  teams?: Team[];
  selectedTeam: string | null;
  onTeamChange: (teamId: string | null) => void;
  onUpdate: (id: string, team: string, updates: Record<string, unknown>) => Promise<void>;
}

// Zoom levels configuration (matches GanttChart ZOOM_LEVELS)
const ZOOM_LEVELS = [8, 12, 16, 24, 32, 48] as const;
const ZOOM_LABELS = ['Year', 'Quarter', 'Month', 'Default', 'Week', 'Day'] as const;

interface Milestone {
  id: string;
  date: Date;
  label: string;
  type: 'deadline' | 'release' | 'checkpoint';
}

interface TooltipData {
  bead: Bead;
  x: number;
  y: number;
  startDate: Date;
  endDate: Date;
}

// TimelineView wraps the existing GanttChart component with enhanced roadmap features
export default function TimelineView({ beads, dependencies, teams = [], selectedTeam, onTeamChange, onUpdate }: TimelineViewProps) {
  const [timelineState, setTimelineState] = useTimelineState();
  const [hoveredTask, setHoveredTask] = useState<TooltipData | null>(null);
  const [mounted, setMounted] = useState(false);

  // Track mounted state for hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Extract milestones from beads (tasks with due dates and high priority)
  const milestones: Milestone[] = beads
    .filter((bead) => {
      // Milestones are high-priority tasks with due dates or epics
      return (
        (bead.priority <= 1 && bead.due_at) ||
        (bead.issue_type === 'epic' && bead.due_at)
      );
    })
    .map((bead) => ({
      id: bead.id,
      date: new Date(bead.due_at!),
      label: bead.title.replace(/^\[[^\]]+\]\s*/, ''), // Remove prefix
      type: bead.issue_type === 'epic' ? 'release' : 'deadline' as const,
    }));

  // Handle zoom change - sync with ViewContext
  const handleZoomChange = useCallback(
    (newZoomIndex: number) => {
      setTimelineState({ zoomIndex: newZoomIndex });
    },
    [setTimelineState]
  );

  // Handle scroll position persistence
  const handleScrollPosition = useCallback(
    (position: number) => {
      setTimelineState({ scrollPosition: position });
    },
    [setTimelineState]
  );

  // Handle collapse state
  const handleCollapseToggle = useCallback(
    (id: string, collapsed: boolean) => {
      const newCollapsedIds = new Set(timelineState.collapsedIds);
      if (collapsed) {
        newCollapsedIds.add(id);
      } else {
        newCollapsedIds.delete(id);
      }
      setTimelineState({ collapsedIds: newCollapsedIds });
    },
    [timelineState.collapsedIds, setTimelineState]
  );

  return (
    <div className="timeline-view" role="region" aria-label="Timeline roadmap view">
      {/* Zoom Controls */}
      <div className="timeline-controls" role="toolbar" aria-label="Timeline controls">
        <div className="zoom-control-group">
          <label htmlFor="timeline-zoom" className="zoom-label">
            Zoom:
          </label>
          <input
            id="timeline-zoom"
            type="range"
            min="0"
            max={ZOOM_LEVELS.length - 1}
            value={timelineState.zoomIndex}
            onChange={(e) => handleZoomChange(parseInt(e.target.value, 10))}
            className="zoom-slider"
            aria-label={`Zoom level: ${ZOOM_LABELS[timelineState.zoomIndex]}`}
            aria-valuetext={`${ZOOM_LABELS[timelineState.zoomIndex]} view (${ZOOM_LEVELS[timelineState.zoomIndex]}px per day)`}
          />
          <span className="zoom-value" aria-live="polite">
            {ZOOM_LABELS[timelineState.zoomIndex]}
          </span>
        </div>

        <div className="zoom-presets">
          <button
            onClick={() => handleZoomChange(0)}
            className={`zoom-preset-btn ${timelineState.zoomIndex === 0 ? 'active' : ''}`}
            aria-label="Year view"
          >
            Year
          </button>
          <button
            onClick={() => handleZoomChange(2)}
            className={`zoom-preset-btn ${timelineState.zoomIndex === 2 ? 'active' : ''}`}
            aria-label="Month view"
          >
            Month
          </button>
          <button
            onClick={() => handleZoomChange(4)}
            className={`zoom-preset-btn ${timelineState.zoomIndex === 4 ? 'active' : ''}`}
            aria-label="Week view"
          >
            Week
          </button>
          <button
            onClick={() => handleZoomChange(5)}
            className={`zoom-preset-btn ${timelineState.zoomIndex === 5 ? 'active' : ''}`}
            aria-label="Day view"
          >
            Day
          </button>
        </div>

        <div className="timeline-legend">
          <div className="legend-item">
            <div className="milestone-marker diamond release" aria-hidden="true" />
            <span>Release</span>
          </div>
          <div className="legend-item">
            <div className="milestone-marker diamond deadline" aria-hidden="true" />
            <span>Deadline</span>
          </div>
          {mounted && (
            <div className="legend-item">
              <div className="today-indicator-line" aria-hidden="true" />
              <span>Today</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Gantt Chart */}
      <div className="timeline-content">
        <GanttChart
          beads={beads}
          dependencies={dependencies}
          teams={teams}
          selectedTeam={selectedTeam}
          onTeamChange={onTeamChange}
          onUpdate={onUpdate}
        />
      </div>

      {/* Milestone Markers Overlay */}
      {mounted && milestones.length > 0 && (
        <div className="milestone-overlay" aria-label="Project milestones">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className={`milestone-marker ${milestone.type}`}
              data-date={format(milestone.date, 'yyyy-MM-dd')}
              role="img"
              aria-label={`${milestone.type}: ${milestone.label} on ${format(milestone.date, 'MMMM d, yyyy')}`}
              title={`${milestone.label}\n${format(milestone.date, 'MMMM d, yyyy')}`}
            >
              <div className="milestone-diamond" />
              {ZOOM_LEVELS[timelineState.zoomIndex] >= 24 && (
                <div className="milestone-label">{milestone.label}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Tooltip */}
      {hoveredTask && (
        <div
          className="timeline-tooltip"
          style={{
            left: hoveredTask.x,
            top: hoveredTask.y,
          }}
          role="tooltip"
          aria-live="polite"
        >
          <div className="tooltip-header">
            <h4 className="tooltip-title">{hoveredTask.bead.title}</h4>
            <span className={`tooltip-status status-${hoveredTask.bead.status}`}>
              {hoveredTask.bead.status.replace('_', ' ')}
            </span>
          </div>
          <div className="tooltip-body">
            <div className="tooltip-row">
              <span className="tooltip-label">Timeline:</span>
              <span className="tooltip-value">
                {format(hoveredTask.startDate, 'MMM d, yyyy')} - {format(hoveredTask.endDate, 'MMM d, yyyy')}
              </span>
            </div>
            {hoveredTask.bead.assignee && (
              <div className="tooltip-row">
                <span className="tooltip-label">Assignee:</span>
                <span className="tooltip-value">@{hoveredTask.bead.assignee}</span>
              </div>
            )}
            <div className="tooltip-row">
              <span className="tooltip-label">Priority:</span>
              <span className={`tooltip-value priority-${hoveredTask.bead.priority}`}>
                P{hoveredTask.bead.priority}
              </span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">Team:</span>
              <span className="tooltip-value">{hoveredTask.bead.team}</span>
            </div>
            {hoveredTask.bead.estimated_minutes && (
              <div className="tooltip-row">
                <span className="tooltip-label">Estimate:</span>
                <span className="tooltip-value">
                  {Math.round(hoveredTask.bead.estimated_minutes / 60)}h
                </span>
              </div>
            )}
          </div>
          {hoveredTask.bead.description && (
            <div className="tooltip-footer">
              <p className="tooltip-description">{hoveredTask.bead.description}</p>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .timeline-view {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          position: relative;
        }

        .timeline-controls {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 12px 16px;
          background: var(--bg);
          border-bottom: 1px solid var(--border);
          flex-wrap: wrap;
        }

        .zoom-control-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .zoom-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--muted);
        }

        .zoom-slider {
          width: 120px;
          height: 4px;
          border-radius: 2px;
          background: var(--border);
          appearance: none;
          cursor: pointer;
        }

        .zoom-slider::-webkit-slider-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          transition: transform 150ms ease;
          appearance: none;
        }

        .zoom-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }

        .zoom-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          transition: transform 150ms ease;
          border: none;
        }

        .zoom-slider::-moz-range-thumb:hover {
          transform: scale(1.1);
        }

        .zoom-value {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--fg);
          min-width: 60px;
        }

        .zoom-presets {
          display: flex;
          gap: 4px;
        }

        .zoom-preset-btn {
          padding: 6px 12px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 4px;
          color: var(--muted);
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 150ms ease;
        }

        .zoom-preset-btn:hover {
          background: var(--border);
          color: var(--fg);
        }

        .zoom-preset-btn.active {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }

        .timeline-legend {
          display: flex;
          gap: 16px;
          margin-left: auto;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          color: var(--muted);
        }

        .milestone-marker.diamond {
          width: 12px;
          height: 12px;
          transform: rotate(45deg);
          border: 2px solid currentColor;
        }

        .milestone-marker.diamond.release {
          background: #22c55e;
          border-color: #22c55e;
        }

        .milestone-marker.diamond.deadline {
          background: #eab308;
          border-color: #eab308;
        }

        .today-indicator-line {
          width: 2px;
          height: 12px;
          background: var(--accent);
          border-radius: 1px;
        }

        .timeline-content {
          flex: 1;
          overflow: hidden;
          position: relative;
        }

        .milestone-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 5;
        }

        .timeline-tooltip {
          position: fixed;
          background: rgba(0, 0, 0, 0.95);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px;
          max-width: 320px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
          z-index: 100;
          pointer-events: none;
        }

        .tooltip-header {
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
        }

        .tooltip-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--fg);
          margin: 0;
          line-height: 1.4;
        }

        .tooltip-status {
          font-size: 0.65rem;
          padding: 2px 6px;
          border-radius: 3px;
          text-transform: uppercase;
          font-weight: 600;
          white-space: nowrap;
        }

        .tooltip-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .tooltip-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 0.75rem;
        }

        .tooltip-label {
          color: var(--muted);
          font-weight: 500;
        }

        .tooltip-value {
          color: var(--fg);
          font-weight: 600;
          text-align: right;
        }

        .tooltip-footer {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid var(--border);
        }

        .tooltip-description {
          font-size: 0.7rem;
          color: var(--muted);
          margin: 0;
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .timeline-controls {
            gap: 12px;
          }

          .zoom-presets {
            flex-wrap: wrap;
          }

          .timeline-legend {
            margin-left: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
