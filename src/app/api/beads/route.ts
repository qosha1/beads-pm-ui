import { NextRequest, NextResponse } from "next/server";
import { getAllBeads, getTeams, updateBead } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const team = searchParams.get("team");

  if (team === "_teams") {
    return NextResponse.json(getTeams());
  }

  const { beads, dependencies } = getAllBeads();

  const filtered = team ? beads.filter((b) => b.team === team) : beads;

  return NextResponse.json({ beads: filtered, dependencies });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, team, updates } = body;

    if (!id || !team || !updates) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const success = updateBead(team, id, updates);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
