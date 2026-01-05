"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  addDays,
  differenceInDays,
  format,
  isWeekend,
  isToday,
  startOfDay,
  endOfDay,
  startOfMonth,
  getMonth,
} from "date-fns";
import type { Bead, Dependency } from "@/lib/types";
import { EditModal } from "./EditModal";
import { parseDateRangeFromTitle } from "@/lib/dates";

interface GanttChartProps {
  beads: Bead[];
  dependencies: Dependency[];
  onUpdate: (id: string, team: string, updates: Record<string, unknown>) => Promise<void>;
}

interface GanttTask {
  bead: Bead;
  start: Date;
  end: Date;
  progress: number;
  deps: string[];
  rowIndex: number;
}

const ROW_HEIGHT = 36;
const ZOOM_LEVELS = [8, 12, 16, 24, 32, 48];
const DEFAULT_ZOOM_INDEX = 3; // 24px

export function GanttChart({ beads, dependencies, onUpdate }: GanttChartProps) {
  const [editingBead, setEditingBead] = useState<Bead | null>(null);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const dayWidth = ZOOM_LEVELS[zoomIndex];
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const headerTimelineRef = useRef<HTMLDivElement>(null);

  const zoomIn = () => setZoomIndex((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1));
  const zoomOut = () => setZoomIndex((i) => Math.max(i - 1, 0));

  const { tasks, taskMap, startDate, days, months } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    const depsMap = new Map<string, string[]>();
    for (const dep of dependencies) {
      const existing = depsMap.get(dep.issue_id) || [];
      existing.push(dep.depends_on_id);
      depsMap.set(dep.issue_id, existing);
    }

    const tasks: GanttTask[] = beads.map((bead, index) => {
      const parsedRange = parseDateRangeFromTitle(bead.title, currentYear);

      let start: Date;
      let end: Date;

      if (parsedRange) {
        start = parsedRange.start;
        end = parsedRange.end;
      } else {
        start = startOfDay(new Date(bead.created_at));
        const estimatedDays = bead.estimated_minutes
          ? Math.ceil(bead.estimated_minutes / 480)
          : 14;
        end = endOfDay(addDays(start, estimatedDays));
      }

      const progress =
        bead.status === "closed"
          ? 100
          : bead.status === "in_progress"
          ? 50
          : 0;

      return {
        bead,
        start: startOfDay(start),
        end: endOfDay(end),
        progress,
        deps: depsMap.get(bead.id) || [],
        rowIndex: index,
      };
    });

    const taskMap = new Map<string, GanttTask>();
    for (const task of tasks) {
      taskMap.set(task.bead.id, task);
    }

    let minDate = new Date(currentYear, 0, 1);
    let maxDate = new Date(currentYear, 11, 31);

    for (const task of tasks) {
      if (task.start < minDate) minDate = startOfDay(task.start);
      if (task.end > maxDate) maxDate = endOfDay(task.end);
    }

    minDate = startOfMonth(minDate);
    maxDate = endOfDay(addDays(maxDate, 30));

    const dayCount = differenceInDays(maxDate, minDate) + 1;
    const daysArr: Date[] = [];
    for (let i = 0; i < dayCount; i++) {
      daysArr.push(addDays(minDate, i));
    }

    const monthsArr: { month: Date; days: number; label: string }[] = [];
    let currentMonth = -1;
    let monthDays = 0;

    for (const day of daysArr) {
      const m = getMonth(day);
      if (m !== currentMonth) {
        if (currentMonth !== -1) {
          monthsArr.push({
            month: addDays(day, -1),
            days: monthDays,
            label: format(addDays(day, -1), "MMMM yyyy"),
          });
        }
        currentMonth = m;
        monthDays = 1;
      } else {
        monthDays++;
      }
    }
    if (monthDays > 0 && daysArr.length > 0) {
      monthsArr.push({
        month: daysArr[daysArr.length - 1],
        days: monthDays,
        label: format(daysArr[daysArr.length - 1], "MMMM yyyy"),
      });
    }

    return {
      tasks,
      taskMap,
      startDate: minDate,
      endDate: maxDate,
      days: daysArr,
      months: monthsArr,
    };
  }, [beads, dependencies]);

  // Scroll to today on mount or zoom change
  useEffect(() => {
    if (bodyScrollRef.current) {
      const today = new Date();
      const daysFromStart = differenceInDays(today, startDate);
      const scrollTo = Math.max(0, daysFromStart * dayWidth - 200);
      bodyScrollRef.current.scrollLeft = scrollTo;
    }
  }, [startDate, dayWidth]);

  // Sync horizontal scroll between header and body
  const handleBodyScroll = () => {
    if (bodyScrollRef.current && headerTimelineRef.current) {
      headerTimelineRef.current.scrollLeft = bodyScrollRef.current.scrollLeft;
    }
  };

  const getBarPosition = (task: GanttTask) => {
    const startOffset = differenceInDays(task.start, startDate);
    const duration = differenceInDays(task.end, task.start) + 1;

    return {
      left: startOffset * dayWidth,
      width: Math.max(duration * dayWidth - 2, 16),
      top: task.rowIndex * ROW_HEIGHT + 6,
    };
  };

  const handleSave = async (updates: Record<string, unknown>) => {
    if (!editingBead) return;
    await onUpdate(editingBead.id, editingBead.team, updates);
    setEditingBead(null);
  };

  const dependencyLines = useMemo(() => {
    const lines: Array<{
      key: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }> = [];

    for (const task of tasks) {
      for (const depId of task.deps) {
        const depTask = taskMap.get(depId);
        if (!depTask) continue;

        const fromPos = getBarPosition(depTask);
        const toPos = getBarPosition(task);

        lines.push({
          key: `${depId}-${task.bead.id}`,
          x1: fromPos.left + fromPos.width,
          y1: fromPos.top + 12,
          x2: toPos.left,
          y2: toPos.top + 12,
        });
      }
    }

    return lines;
  }, [tasks, taskMap, startDate, dayWidth]);

  const timelineWidth = days.length * dayWidth;
  const bodyHeight = tasks.length * ROW_HEIGHT;

  return (
    <>
      <div className="gantt-wrapper">
        {/* Fixed header row */}
        <div className="gantt-header-row">
          <div className="gantt-info-header">
            <span style={{ flex: 1 }}>Task</span>
            <span style={{ width: 36 }}>P</span>
            <span style={{ width: 70 }}>Status</span>
            <span style={{ width: 40 }}>Team</span>
            <div className="zoom-controls">
              <button onClick={zoomOut} disabled={zoomIndex === 0} title="Zoom out">−</button>
              <button onClick={zoomIn} disabled={zoomIndex === ZOOM_LEVELS.length - 1} title="Zoom in">+</button>
            </div>
          </div>
          <div className="gantt-timeline-header" ref={headerTimelineRef}>
            <div style={{ width: timelineWidth }}>
              <div className="gantt-month-header" style={{ width: timelineWidth }}>
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="gantt-month"
                    style={{ width: m.days * dayWidth }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
              <div className="gantt-day-header" style={{ width: timelineWidth }}>
                {days.map((day, i) => (
                  <div
                    key={i}
                    className={`gantt-day ${isWeekend(day) ? "weekend" : ""} ${
                      isToday(day) ? "today" : ""
                    }`}
                    style={{ width: dayWidth }}
                  >
                    {day.getDate() === 1 || i === 0 ? format(day, "d") : day.getDate()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="gantt-body-scroll" ref={bodyScrollRef} onScroll={handleBodyScroll}>
          {/* Left info column */}
          <div className="gantt-info-column">
            {tasks.map((task) => (
              <div key={task.bead.id} className="gantt-info-row">
                <span
                  className="gantt-row-title"
                  onClick={() => setEditingBead(task.bead)}
                  title={task.bead.title}
                >
                  {task.bead.title}
                </span>
                <span className={`priority-badge priority-${task.bead.priority}`}>
                  {task.bead.priority}
                </span>
                <span className={`status-badge status-${task.bead.status}`}>
                  {task.bead.status.replace("_", " ")}
                </span>
                <span className="team-badge">{task.bead.team}</span>
              </div>
            ))}
          </div>

          {/* Right timeline */}
          <div className="gantt-timeline-body" style={{ width: timelineWidth, height: bodyHeight }}>
            {/* Grid lines */}
            {days.map((day, i) => (
              <div
                key={i}
                className={`gantt-grid-line ${isWeekend(day) ? "weekend" : ""} ${
                  isToday(day) ? "today" : ""
                }`}
                style={{
                  left: i * dayWidth,
                  width: dayWidth,
                  height: bodyHeight,
                }}
              />
            ))}

            {/* Row separators */}
            {tasks.map((_, i) => (
              <div
                key={i}
                className="gantt-row-line"
                style={{ top: (i + 1) * ROW_HEIGHT - 1 }}
              />
            ))}

            {/* Dependency lines SVG */}
            <svg
              className="gantt-deps-svg"
              style={{ width: timelineWidth, height: bodyHeight }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 6 3, 0 6" fill="#666" />
                </marker>
              </defs>
              {dependencyLines.map((line) => {
                const midX = (line.x1 + line.x2) / 2;
                return (
                  <path
                    key={line.key}
                    d={`M ${line.x1} ${line.y1} C ${midX} ${line.y1}, ${midX} ${line.y2}, ${line.x2} ${line.y2}`}
                    className="gantt-dep-line"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
            </svg>

            {/* Task bars */}
            {tasks.map((task) => {
              const pos = getBarPosition(task);
              return (
                <div
                  key={task.bead.id}
                  className={`gantt-bar ${task.bead.issue_type}`}
                  style={{
                    left: pos.left,
                    width: pos.width,
                    top: pos.top,
                  }}
                  onClick={() => setEditingBead(task.bead)}
                  title={`${task.bead.title}\n${format(task.start, "MMM d, yyyy")} - ${format(task.end, "MMM d, yyyy")}`}
                >
                  {task.progress > 0 && (
                    <div
                      className="gantt-bar-progress"
                      style={{ width: `${task.progress}%` }}
                    />
                  )}
                  <span className="gantt-bar-label">
                    {pos.width > 100 ? task.bead.title.replace(/^\[[^\]]+\]\s*/, "") : ""}
                  </span>
                </div>
              );
            })}

            {/* Today line */}
            {(() => {
              const todayOffset = differenceInDays(new Date(), startDate);
              if (todayOffset >= 0 && todayOffset < days.length) {
                return (
                  <div
                    className="gantt-today-line"
                    style={{ left: todayOffset * dayWidth + dayWidth / 2 }}
                  />
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>

      <div className="legend">
        <div className="legend-item">
          <div className="legend-color" style={{ background: "#7c3aed" }} />
          <span>Epic</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: "#2563eb" }} />
          <span>Feature</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: "#059669" }} />
          <span>Task</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: "#dc2626" }} />
          <span>Bug</span>
        </div>
        <div className="legend-item" style={{ marginLeft: "auto" }}>
          <div className="legend-color" style={{ background: "#3b82f6", width: 2, height: 12 }} />
          <span>Today</span>
        </div>
        <div className="legend-item">
          <svg width="24" height="12">
            <path d="M 0 6 C 12 6, 12 6, 24 6" stroke="#666" fill="none" strokeWidth="1.5" />
          </svg>
          <span>Dependency</span>
        </div>
      </div>

      {editingBead && (
        <EditModal
          bead={editingBead}
          onClose={() => setEditingBead(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
