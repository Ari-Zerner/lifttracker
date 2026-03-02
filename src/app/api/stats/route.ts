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
      maxWeight: sql<string>`max(${workoutSets.weight})`,
    })
    .from(workoutSets)
    .innerJoin(
      workoutSessions,
      eq(workoutSets.sessionId, workoutSessions.id)
    )
    .where(
      and(
        eq(workoutSessions.userId, session.user.id),
        eq(workoutSets.completed, true),
        sql`${workoutSets.weight} is not null`
      )
    )
    .groupBy(workoutSets.exercise);

  // Most recent workout's weights per exercise+set
  const [latestSession] = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, session.user.id),
        sql`${workoutSessions.completedAt} is not null`
      )
    )
    .orderBy(desc(workoutSessions.completedAt))
    .limit(1);

  let lastWeights: Record<string, string> = {};
  if (latestSession) {
    const sets = await db
      .select()
      .from(workoutSets)
      .where(eq(workoutSets.sessionId, latestSession.id));

    for (const s of sets) {
      if (s.weight) {
        lastWeights[`${s.exercise}:${s.setNumber}`] = s.weight;
      }
    }
  }

  const maxWeightMap: Record<string, string> = {};
  for (const row of maxWeights) {
    if (row.maxWeight) {
      maxWeightMap[row.exercise] = row.maxWeight;
    }
  }

  return NextResponse.json({ maxWeights: maxWeightMap, lastWeights });
}
