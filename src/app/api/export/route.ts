import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workoutSessions, workoutSets } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions_list = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, session.user.id))
    .orderBy(desc(workoutSessions.startedAt));

  const rows: string[] = [
    "date,exercise,set_number,weight,target_reps,actual_reps,set_notes,session_notes",
  ];

  for (const ws of sessions_list) {
    const sets = await db
      .select()
      .from(workoutSets)
      .where(eq(workoutSets.sessionId, ws.id));

    for (const s of sets) {
      const date = ws.completedAt
        ? ws.completedAt.toISOString().split("T")[0]
        : ws.startedAt.toISOString().split("T")[0];
      rows.push(
        [
          date,
          csvEscape(s.exercise),
          s.setNumber,
          s.weight ?? "",
          s.targetReps,
          s.actualReps ?? "",
          csvEscape(s.notes ?? ""),
          csvEscape(ws.notes ?? ""),
        ].join(",")
      );
    }
  }

  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="lifttracker-export.csv"`,
    },
  });
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
