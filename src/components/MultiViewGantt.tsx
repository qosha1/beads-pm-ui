"use client";

import { ViewProvider } from './views/ViewContext';
import { ViewSwitcher } from './views/ViewSwitcher';
import { ViewContainer } from './views/ViewContainer';
import type { Bead, Dependency } from '@/lib/types';

interface Team {
  id: string;
  name: string;
}

interface MultiViewGanttProps {
  beads: Bead[];
  dependencies: Dependency[];
  teams?: Team[];
  selectedTeam: string | null;
  onTeamChange: (teamId: string | null) => void;
  onUpdate: (id: string, team: string, updates: Record<string, unknown>) => Promise<void>;
}

/**
 * MultiViewGantt is a wrapper around the GanttChart that provides:
 * - View switching (Board / List / Timeline)
 * - URL-based routing (?view=board|list|timeline)
 * - Keyboard shortcuts (Cmd+B/L/T)
 * - State persistence to localStorage
 * - 200ms fade transitions between views
 */
export function MultiViewGantt({ beads, dependencies, teams = [], selectedTeam, onTeamChange, onUpdate }: MultiViewGanttProps) {
  return (
    <ViewProvider>
      <div className="multi-view-gantt">
        {/* Controls bar with view switcher */}
        <div className="multi-view-controls">
          <ViewSwitcher />
        </div>

        {/* View container with lazy-loaded views */}
        <ViewContainer
          beads={beads}
          dependencies={dependencies}
          teams={teams}
          selectedTeam={selectedTeam}
          onTeamChange={onTeamChange}
          onUpdate={onUpdate}
        />
      </div>
    </ViewProvider>
  );
}
