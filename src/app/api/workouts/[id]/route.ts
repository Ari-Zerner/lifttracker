import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workoutSessions, workoutSets } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [workoutSession] = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.id, id),
        eq(workoutSessions.userId, session.user.id)
      )
    );

  if (!workoutSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sets = await db
    .select()
    .from(workoutSets)
    .where(eq(workoutSets.sessionId, id));

  return NextResponse.json({ ...workoutSession, sets });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [workoutSession] = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.id, id),
        eq(workoutSessions.userId, session.user.id)
      )
    );

  if (!workoutSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { notes, sets } = body as {
    notes?: string | null;
    sets: {
      exercise: string;
      setNumber: number;
      targetReps: number;
      actualReps?: number | null;
      weight?: number | null;
      notes?: string | null;
    }[];
  };

  await db
    .update(workoutSessions)
    .set({ notes: notes ?? null })
    .where(eq(workoutSessions.id, id));

  await db.delete(workoutSets).where(eq(workoutSets.sessionId, id));

  if (sets.length > 0) {
    await db.insert(workoutSets).values(
      sets.map((s) => ({
        sessionId: id,
        exercise: s.exercise,
        setNumber: s.setNumber,
        targetReps: s.targetReps,
        actualReps: s.actualReps ?? null,
        weight: s.weight ?? null,
        notes: s.notes || null,
      }))
    );
  }

  const updatedSets = await db
    .select()
    .from(workoutSets)
    .where(eq(workoutSets.sessionId, id));

  return NextResponse.json({ ...workoutSession, notes: notes ?? null, sets: updatedSets });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await db
    .delete(workoutSessions)
    .where(
      and(
        eq(workoutSessions.id, id),
        eq(workoutSessions.userId, session.user.id)
      )
    );

  return NextResponse.json({ ok: true });
}
