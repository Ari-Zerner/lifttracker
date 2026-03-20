import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workoutSessions, workoutSets } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Max weight per exercise (completed sets only)
  const maxWeights = await db
    .select({
      exercise: workoutSets.exercise,
      maxWeight: sql<number>`max(${workoutSets.weight})`,
    })
    .from(workoutSets)
    .innerJoin(
      workoutSessions,
      eq(workoutSets.sessionId, workoutSessions.id)
    )
    .where(
      and(
        eq(workoutSessions.userId, session.user.id),
        sql`${workoutSets.actualReps} >= ${workoutSets.targetReps}`,
        sql`${workoutSets.weight} is not null`
      )
    )
    .groupBy(workoutSets.exercise);

  // Most recent non-null, non-zero weight per exercise+set (across all sessions)
  const lastWeightRows = await db
    .select({
      exercise: workoutSets.exercise,
      setNumber: workoutSets.setNumber,
      weight: workoutSets.weight,
    })
    .from(workoutSets)
    .innerJoin(
      workoutSessions,
      eq(workoutSets.sessionId, workoutSessions.id)
    )
    .where(
      and(
        eq(workoutSessions.userId, session.user.id),
        sql`${workoutSets.weight} is not null`,
        sql`${workoutSets.weight} > 0`
      )
    )
    .orderBy(desc(workoutSessions.completedAt));

  const lastWeights: Record<string, string> = {};
  for (const s of lastWeightRows) {
    const key = `${s.exercise}:${s.setNumber}`;
    if (!lastWeights[key]) {
      lastWeights[key] = String(s.weight);
    }
  }

  const maxWeightMap: Record<string, string> = {};
  for (const row of maxWeights) {
    if (row.maxWeight) {
      maxWeightMap[row.exercise] = String(row.maxWeight);
    }
  }

  return NextResponse.json({ maxWeights: maxWeightMap, lastWeights });
}
