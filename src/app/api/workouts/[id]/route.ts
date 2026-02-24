import { NextResponse } from "next/server";
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
