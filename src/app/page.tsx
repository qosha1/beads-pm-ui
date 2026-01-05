"use client";

import { useEffect, useState, useCallback } from "react";
import type { Bead, Dependency, Team } from "@/lib/types";
import { GanttChart } from "@/components/GanttChart";

export default function Dashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [beads, setBeads] = useState<Bead[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = useCallback(async () => {
    const res = await fetch("/api/beads?team=_teams");
    const data = await res.json();
    setTeams(data);
  }, []);

  const fetchBeads = useCallback(async (team?: string | null) => {
    setLoading(true);
    const url = team ? `/api/beads?team=${team}` : "/api/beads";
    const res = await fetch(url);
    const data = await res.json();
    setBeads(data.beads);
    setDependencies(data.dependencies);
    setLoading(false);
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
    const res = await fetch("/api/beads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, team, updates }),
    });

    if (res.ok) {
      await fetchBeads(selectedTeam);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Beads Dashboard</h1>
        <div className="team-tabs">
          <button
            className={`team-tab ${selectedTeam === null ? "active" : ""}`}
            onClick={() => handleTeamSelect(null)}
          >
            All Teams
          </button>
          {teams.map((team) => (
            <button
              key={team.id}
              className={`team-tab ${selectedTeam === team.id ? "active" : ""}`}
              onClick={() => handleTeamSelect(team.id)}
            >
              {team.name}
            </button>
          ))}
        </div>
      </header>

      <main className="main">
        {loading ? (
          <div className="loading">Loading beads...</div>
        ) : (
          <GanttChart
            beads={beads}
            dependencies={dependencies}
            onUpdate={handleUpdate}
          />
        )}
      </main>
    </div>
  );
}
