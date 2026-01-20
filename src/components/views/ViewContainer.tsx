"use client";

import { Suspense, lazy, useEffect, useState } from 'react';
import { useActiveView } from './ViewContext';
import type { Bead, Dependency } from '@/lib/types';

// Lazy load view components for bundle splitting
const BoardView = lazy(() => import('./BoardView'));
const ListView = lazy(() => import('./ListView'));
const TimelineView = lazy(() => import('./TimelineView'));

interface Team {
  id: string;
  name: string;
}

interface ViewContainerProps {
  beads: Bead[];
  dependencies: Dependency[];
  teams?: Team[];
  selectedTeam: string | null;
  onTeamChange: (teamId: string | null) => void;
  onUpdate: (id: string, team: string, updates: Record<string, unknown>) => Promise<void>;
}

function SkeletonLoader({ view }: { view: string }) {
  return (
    <div className="view-skeleton" role="status" aria-label={`Loading ${view} view`}>
      <div className="skeleton-content">
        <div className="skeleton-bar skeleton-title" />
        <div className="skeleton-bar skeleton-text" />
        <div className="skeleton-bar skeleton-text" />
        <div className="skeleton-bar skeleton-text" />
      </div>
    </div>
  );
}

export function ViewContainer({ beads, dependencies, teams = [], selectedTeam, onTeamChange, onUpdate }: ViewContainerProps) {
  const [activeView] = useActiveView();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayView, setDisplayView] = useState(activeView);

  // Handle view transition with fade animation
  useEffect(() => {
    if (activeView !== displayView) {
      setIsTransitioning(true);

      // Fade out current view
      const fadeTimeout = setTimeout(() => {
        setDisplayView(activeView);
        setIsTransitioning(false);
      }, 200);

      return () => clearTimeout(fadeTimeout);
    }
  }, [activeView, displayView]);

  const viewComponents = {
    board: <BoardView beads={beads} dependencies={dependencies} teams={teams} selectedTeam={selectedTeam} onTeamChange={onTeamChange} onUpdate={onUpdate} />,
    list: <ListView beads={beads} dependencies={dependencies} teams={teams} selectedTeam={selectedTeam} onTeamChange={onTeamChange} onUpdate={onUpdate} />,
    timeline: <TimelineView beads={beads} dependencies={dependencies} teams={teams} selectedTeam={selectedTeam} onTeamChange={onTeamChange} onUpdate={onUpdate} />,
  };

  return (
    <div className="view-container">
      <div
        className={`view-content ${isTransitioning ? 'transitioning' : ''}`}
        role="tabpanel"
        id={`${displayView}-panel`}
        aria-labelledby={`${displayView}-tab`}
      >
        <Suspense fallback={<SkeletonLoader view={displayView} />}>
          {viewComponents[displayView]}
        </Suspense>
      </div>
    </div>
  );
}
