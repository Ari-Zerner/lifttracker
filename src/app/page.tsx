import { auth, signIn } from "@/lib/auth";
import { db } from "@/db";
import { workoutSessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="text-center py-20">
        <h1 className="text-4xl font-bold mb-4">LiftTracker</h1>
        <p className="text-gray-400 mb-8">
          Track your workouts. View your progress.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg text-lg font-medium transition"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    );
  }

  const recentWorkouts = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, session.user.id!))
    .orderBy(desc(workoutSessions.startedAt))
    .limit(5);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold">
          Hey, {session.user.name?.split(" ")[0] ?? "there"}
        </h1>
        <Link
          href="/workout"
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 min-h-[48px] rounded-lg font-medium text-center text-lg transition w-full sm:w-auto"
        >
          Start Workout
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-300">
          Recent Workouts
        </h2>
        {recentWorkouts.length === 0 ? (
          <p className="text-gray-500">
            No workouts yet. Start your first one!
          </p>
        ) : (
          <ul className="space-y-2">
            {recentWorkouts.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/stats?workout=${w.id}`}
                  className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between hover:border-gray-700 transition block"
                >
                  <span>
                    {(w.completedAt ?? w.startedAt).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-sm text-gray-500">
                    {w.completedAt ? "Completed" : "In Progress"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
