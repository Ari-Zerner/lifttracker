import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workoutSessions, workoutSets } from "@/db/schema";
import { eq, desc, and, asc, sql } from "drizzle-orm";

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

  // Chart data: per-session stats for weight progression and completion rate
  const allSessions = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, session.user.id),
        sql`${workoutSessions.completedAt} is not null`
      )
    )
    .orderBy(asc(workoutSessions.completedAt));

  const chartData = [];
  for (const ws of allSessions) {
    const sets = await db
      .select()
      .from(workoutSets)
      .where(eq(workoutSets.sessionId, ws.id));

    const date = (ws.completedAt ?? ws.startedAt).toISOString().split("T")[0];
    const entry: Record<string, unknown> = { date, sessionId: ws.id };

    // Max weight per exercise for this session
    const exerciseMaxWeights: Record<string, number> = {};
    let totalSets = 0;
    let completedSets = 0;
    const exerciseCompletion: Record<string, { total: number; completed: number }> = {};

    for (const s of sets) {
      if (s.weight != null && s.weight > 0) {
        exerciseMaxWeights[s.exercise] = Math.max(
          exerciseMaxWeights[s.exercise] ?? 0,
          s.weight
        );
      }
      totalSets++;
      const isComplete = s.actualReps != null && s.actualReps >= s.targetReps;
      if (isComplete) completedSets++;

      if (!exerciseCompletion[s.exercise]) {
        exerciseCompletion[s.exercise] = { total: 0, completed: 0 };
      }
      exerciseCompletion[s.exercise].total++;
      if (isComplete) exerciseCompletion[s.exercise].completed++;
    }

    for (const [ex, w] of Object.entries(exerciseMaxWeights)) {
      entry[`weight_${ex}`] = w;
    }
    entry.completionRate = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
    for (const [ex, c] of Object.entries(exerciseCompletion)) {
      entry[`completion_${ex}`] = c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0;
    }

    chartData.push(entry);
  }

  return NextResponse.json({ maxWeights: maxWeightMap, lastWeights, chartData });
}
