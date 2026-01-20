"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { Bead, Dependency, Team } from "@/lib/types";
import { GanttChart } from "@/components/GanttChart";
import { ToastContainer, useToast } from "@/components/Toast";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

interface ErrorState {
  message: string;
  retryAction?: () => void;
}

async function fetchWithRetry<T>(
  url: string,
  options?: RequestInit,
  retries = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("Request failed");
}

export default function Dashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [beads, setBeads] = useState<Bead[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);

  // Track pending updates for rollback
  const previousBeadsRef = useRef<Bead[]>([]);
  const { toasts, removeToast, success, error: errorToast } = useToast();

  const fetchTeams = useCallback(async () => {
    try {
      const data = await fetchWithRetry<Team[]>("/api/beads?team=_teams");
      setTeams(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch teams:", err);
      setError({
        message: `Failed to load teams: ${err instanceof Error ? err.message : "Unknown error"}`,
        retryAction: () => fetchTeams(),
      });
    }
  }, []);

  const fetchBeads = useCallback(async (team?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const url = team ? `/api/beads?team=${team}` : "/api/beads";
      const data = await fetchWithRetry<{ beads: Bead[]; dependencies: Dependency[] }>(url);
      setBeads(data.beads);
      setDependencies(data.dependencies);
    } catch (err) {
      console.error("Failed to fetch beads:", err);
      setError({
        message: `Failed to load beads: ${err instanceof Error ? err.message : "Unknown error"}`,
        retryAction: () => fetchBeads(team),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
    fetchBeads();
  }, [fetchTeams, fetchBeads]);

  const handleTeamSelect = (teamId: string | null) => {
    setSelectedTeam(teamId);
    fetchBeads(teamId);
  };

  const handleUpdate = async (
    id: string,
    team: string,
    updates: Record<string, unknown>
  ) => {
    // Store previous state for rollback
    previousBeadsRef.current = beads;

    // Optimistic update: apply changes immediately
    setBeads((prevBeads) =>
      prevBeads.map((bead) =>
        bead.id === id
          ? { ...bead, ...updates, updated_at: new Date().toISOString() }
          : bead
      )
    );

    try {
      const response = await fetch("/api/beads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, team, updates }),
      });

      const data = await response.json();

      if (response.ok && data.bead) {
        // Update with the authoritative server response
        setBeads((prevBeads) =>
          prevBeads.map((bead) =>
            bead.id === id ? data.bead : bead
          )
        );
        setError(null);
        success("Task updated successfully");
      } else {
        // Rollback on error
        setBeads(previousBeadsRef.current);
        const errorMessage = `Update failed: ${data.error || "Unknown error"}`;
        setError({
          message: errorMessage,
        });
        errorToast(errorMessage);
      }
    } catch (err) {
      // Rollback on network error
      setBeads(previousBeadsRef.current);
      console.error("Failed to update bead:", err);
      const errorMessage = `Network error: ${err instanceof Error ? err.message : "Unknown error"}`;
      setError({
        message: errorMessage,
        retryAction: () => handleUpdate(id, team, updates),
      });
      errorToast(errorMessage);
    }
  };

  const dismissError = () => setError(null);

  return (
    <div className="app">
      <header className="header">
        <h1>Beads Dashboard</h1>
      </header>

      {error && (
        <div className="error-banner">
          <span className="error-message">{error.message}</span>
          <div className="error-actions">
            {error.retryAction && (
              <button className="retry-btn" onClick={error.retryAction}>
                Retry
              </button>
            )}
            <button className="dismiss-btn" onClick={dismissError}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="main">
        {loading ? (
          <div className="loading">Loading beads...</div>
        ) : (
          <GanttChart
            beads={beads}
            dependencies={dependencies}
            teams={teams}
            selectedTeam={selectedTeam}
            onTeamChange={handleTeamSelect}
            onUpdate={handleUpdate}
          />
        )}
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
