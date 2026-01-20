"use client";

import { format } from 'date-fns';

export interface Milestone {
  id: string;
  date: Date;
  title: string;
  description?: string;
  type?: 'release' | 'deadline' | 'checkpoint' | 'event';
  completed?: boolean;
}

export interface MilestoneMarkerProps {
  milestone: Milestone;
  position: number;
  height: number;
  onClick?: () => void;
  className?: string;
}

const milestoneTypeConfig = {
  release: {
    icon: '🚀',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  deadline: {
    icon: '⏰',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  checkpoint: {
    icon: '📍',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  event: {
    icon: '📅',
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: 'rgba(234, 179, 8, 0.5)',
  },
};

/**
 * MilestoneMarker Component
 *
 * Displays a milestone marker on the timeline with visual indicator,
 * title, and optional completion status.
 *
 * Features:
 * - Vertical line indicator spanning the full timeline height
 * - Icon badge with milestone type
 * - Hover tooltip showing full milestone details
 * - Completion status indicator
 * - Click handler for milestone interaction
 *
 * Types:
 * - release: Product releases, deployments
 * - deadline: Hard deadlines, due dates
 * - checkpoint: Progress checkpoints, reviews
 * - event: External events, meetings
 */
export function MilestoneMarker({
  milestone,
  position,
  height,
  onClick,
  className = '',
}: MilestoneMarkerProps) {
  const config = milestoneTypeConfig[milestone.type || 'checkpoint'];
  const isCompleted = milestone.completed || false;

  return (
    <div
      className={`milestone-marker ${className}`}
      style={{
        position: 'absolute',
        left: position,
        top: 0,
        height: height,
        width: 1,
        zIndex: 5,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      aria-label={`Milestone: ${milestone.title}, ${format(milestone.date, 'MMM d, yyyy')}${
        isCompleted ? ', completed' : ''
      }`}
    >
      {/* Vertical line */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 2,
          background: config.borderColor,
          opacity: isCompleted ? 0.5 : 0.8,
        }}
      />

      {/* Icon badge */}
      <div
        className="milestone-badge"
        style={{
          position: 'absolute',
          left: -12,
          top: 8,
          width: 24,
          height: 24,
          borderRadius: '50%',
          backgroundColor: config.bgColor,
          border: `2px solid ${config.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          opacity: isCompleted ? 0.6 : 1,
        }}
        title={milestone.title}
      >
        {isCompleted ? '✓' : config.icon}
      </div>

      {/* Label (visible on hover or when space permits) */}
      <div
        className="milestone-label"
        style={{
          position: 'absolute',
          left: 16,
          top: 8,
          backgroundColor: '#1a1a1a',
          border: `1px solid ${config.borderColor}`,
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: '11px',
          fontWeight: 600,
          color: config.color,
          whiteSpace: 'nowrap',
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 150ms ease',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div>{milestone.title}</div>
        <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: 2 }}>
          {format(milestone.date, 'MMM d, yyyy')}
        </div>
        {milestone.description && (
          <div
            style={{
              fontSize: '10px',
              color: '#9ca3af',
              marginTop: 4,
              maxWidth: 200,
              whiteSpace: 'normal',
            }}
          >
            {milestone.description}
          </div>
        )}
      </div>

      <style jsx>{`
        .milestone-marker:hover .milestone-label,
        .milestone-marker:focus .milestone-label {
          opacity: 1;
        }
        .milestone-marker:hover .milestone-badge,
        .milestone-marker:focus .milestone-badge {
          transform: scale(1.1);
          transition: transform 150ms ease;
        }
      `}</style>
    </div>
  );
}
