"use client";

import type { Bead, Dependency } from '@/lib/types';
import { useListState } from './ViewContext';

interface Team {
  id: string;
  name: string;
}

interface ListViewProps {
  beads: Bead[];
  dependencies: Dependency[];
  teams?: Team[];
  selectedTeam: string | null;
  onTeamChange: (teamId: string | null) => void;
  onUpdate: (id: string, team: string, updates: Record<string, unknown>) => Promise<void>;
}

export default function ListView({ beads, dependencies, teams = [], selectedTeam, onTeamChange, onUpdate }: ListViewProps) {
  const [listState, setListState] = useListState();

  // Basic status counts for the placeholder
  const statusCounts = beads.reduce((acc, bead) => {
    acc[bead.status] = (acc[bead.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="list-view-placeholder" role="region" aria-label="List view">
      <div className="placeholder-content">
        <div className="placeholder-icon">≡</div>
        <h2 className="placeholder-title">List View Coming Soon</h2>
        <p className="placeholder-description">
          Sortable table with bulk actions, inline editing, and grouping capabilities.
        </p>
        <div className="placeholder-stats">
          <div className="stat-item">
            <span className="stat-value">{statusCounts['open'] || 0}</span>
            <span className="stat-label">Open</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{statusCounts['in_progress'] || 0}</span>
            <span className="stat-label">In Progress</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{statusCounts['closed'] || 0}</span>
            <span className="stat-label">Closed</span>
          </div>
        </div>
        <div className="placeholder-note">
          <p>Note: Grouping system is ready to integrate when full list view is implemented.</p>
          <p>Use GroupHeader and group utilities from src/components/grouping/</p>
        </div>
      </div>
    </div>
  );
}
