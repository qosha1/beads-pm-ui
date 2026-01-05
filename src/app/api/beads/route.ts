import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAllBeads, getTeams, updateBead } from "@/lib/db";

// Zod schemas for validation
const BeadStatusSchema = z.enum(["open", "in_progress", "closed", "blocked", "deferred"]);

const BeadUpdateFieldsSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  status: BeadStatusSchema.optional(),
  priority: z.number().int().min(0).max(10).optional(),
  assignee: z.string().nullable().optional(),
  due_at: z.string().nullable().optional(),
  estimated_minutes: z.number().int().min(0).nullable().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update",
});

const PatchRequestSchema = z.object({
  id: z.string().min(1, "Bead ID is required"),
  team: z.string().min(1, "Team ID is required"),
  updates: BeadUpdateFieldsSchema,
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const team = searchParams.get("team");

  if (team === "_teams") {
    const teams = await getTeams();
    return NextResponse.json(teams, {
      headers: {
        "Cache-Control": "private, max-age=300, stale-while-revalidate=60",
      },
    });
  }

  const { beads, dependencies } = await getAllBeads();

  const filtered = team ? beads.filter((b) => b.team === team) : beads;

  return NextResponse.json(
    { beads: filtered, dependencies },
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=30",
      },
    }
  );
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const parseResult = PatchRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { id, team, updates } = parseResult.data;

    const result = await updateBead(team, id, updates);

    if (result.success && result.bead) {
      return NextResponse.json({ success: true, bead: result.bead });
    } else if (result.error === "Team not found" || result.error === "Bead not found") {
      return NextResponse.json({ error: result.error }, { status: 404 });
    } else {
      return NextResponse.json(
        { error: result.error || "Update failed" },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
