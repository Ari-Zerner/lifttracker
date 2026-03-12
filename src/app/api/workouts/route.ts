import { NextRequest, NextResponse } from "next/server";
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

  return NextResponse.json(sessions_list);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { notes, sets } = body as {
    notes?: string;
    sets: {
      exercise: string;
      setNumber: number;
      targetReps: number;
      actualReps?: number;
      weight?: number;
      notes?: string;
    }[];
  };

  const [workoutSession] = await db
    .insert(workoutSessions)
    .values({
      userId: session.user.id,
      completedAt: new Date(),
      notes: notes || null,
    })
    .returning();

  if (sets.length > 0) {
    await db.insert(workoutSets).values(
      sets.map((s) => ({
        sessionId: workoutSession.id,
        exercise: s.exercise,
        setNumber: s.setNumber,
        targetReps: s.targetReps,
        actualReps: s.actualReps ?? null,
        weight: s.weight ?? null,
        notes: s.notes || null,
      }))
    );
  }

  return NextResponse.json(workoutSession, { status: 201 });
}
