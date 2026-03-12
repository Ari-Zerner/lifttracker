"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { defaultWorkout } from "@/config/workouts";

interface WorkoutSession {
  id: string;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
}

interface SetData {
  exercise: string;
  setNumber: number;
  targetReps: number;
  actualReps: number | null;
  weight: number | null;
  notes: string | null;
}

interface SessionWithSets extends WorkoutSession {
  sets: SetData[];
}

function StatsContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [expandedWorkouts, setExpandedWorkouts] = useState<Record<string, SessionWithSets>>({});
  const [exerciseFilter, setExerciseFilter] = useState("all");
  const [maxWeights, setMaxWeights] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function toggleWorkout(id: string) {
    if (expandedWorkouts[id]) {
      setExpandedWorkouts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      const res = await fetch(`/api/workouts/${id}`);
      const data = await res.json();
      setExpandedWorkouts((prev) => ({ ...prev, [id]: data }));
    }
  }

  useEffect(() => {
    if (session?.user) {
      Promise.all([
        fetch("/api/workouts").then((r) => r.json()),
        fetch("/api/stats").then((r) => r.json()),
      ]).then(([workoutData, statsData]) => {
        setWorkouts(workoutData);
        if (statsData.maxWeights) setMaxWeights(statsData.maxWeights);
        setLoading(false);

        const workoutId = searchParams.get("workout");
        if (workoutId) {
          toggleWorkout(workoutId);
        }
      });
    }
  }, [session, searchParams]);

  if (status === "loading" || loading) {
    return <p className="text-gray-500 py-12 text-center">Loading...</p>;
  }

  if (!session?.user) {
    return (
      <p className="text-gray-500 py-12 text-center">
        Sign in to view stats.
      </p>
    );
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Stats</h1>
        <a
          href="/api/export"
          className="text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2.5 min-h-[44px] flex items-center rounded-lg transition"
        >
          Export CSV
        </a>
      </div>

      {/* Max weights */}
      {Object.keys(maxWeights).length > 0 && (
        <div className="mb-6 bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-400 mb-3">
            Personal Bests (completed sets)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {defaultWorkout.exercises.map((ex) => (
              <div key={ex.key}>
                <span className="text-sm text-gray-500">{ex.name}</span>
                <p className="text-lg font-bold">
                  {maxWeights[ex.key]
                    ? `${maxWeights[ex.key]} lbs`
                    : "-"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exercise filter */}
      <div className="mb-6">
        <select
          value={exerciseFilter}
          onChange={(e) => setExerciseFilter(e.target.value)}
          className="w-full sm:w-auto bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 min-h-[44px] text-base focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Exercises</option>
          {defaultWorkout.exercises.map((ex) => (
            <option key={ex.key} value={ex.key}>
              {ex.name}
            </option>
          ))}
        </select>
      </div>

      {/* Workouts list */}
      {workouts.length === 0 ? (
        <p className="text-gray-500">No workouts recorded yet.</p>
      ) : (
        <ul className="space-y-2">
          {workouts.map((w) => {
            const expanded = expandedWorkouts[w.id];
            return (
              <li key={w.id} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleWorkout(w.id)}
                  className="w-full text-left px-4 py-4 flex items-center justify-between hover:bg-gray-800/50 transition"
                >
                  <span>
                    {formatDate(w.completedAt ?? w.startedAt)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {expanded ? "▲" : "▼"}
                  </span>
                </button>

                {expanded && (
                  <div className="px-4 pb-4 border-t border-gray-800 pt-3">
                    {expanded.notes && (
                      <p className="text-sm text-gray-400 mb-3 italic">
                        {expanded.notes}
                      </p>
                    )}

                    {defaultWorkout.exercises
                      .filter(
                        (ex) => exerciseFilter === "all" || ex.key === exerciseFilter
                      )
                      .map((ex) => {
                        const sets = expanded.sets.filter(
                          (s) => s.exercise === ex.key
                        );
                        if (sets.length === 0) return null;

                        return (
                          <div key={ex.key} className="mb-3">
                            <h3 className="text-sm font-medium text-gray-300 mb-1">
                              {ex.name}
                            </h3>
                            <div className="space-y-1">
                              {sets.map((s, i) => {
                                const isComplete = s.actualReps != null && s.actualReps >= s.targetReps;
                                const isPartial = s.actualReps != null && s.actualReps > 0;
                                return (
                                  <div
                                    key={i}
                                    className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-gray-400"
                                  >
                                    <span
                                      className={
                                        isComplete
                                          ? "text-green-400"
                                          : isPartial
                                          ? "text-yellow-400"
                                          : "text-gray-600"
                                      }
                                    >
                                      {isComplete ? "+" : "-"}
                                    </span>
                                    <span>Set {s.setNumber}</span>
                                    <span>{s.weight != null ? `${s.weight} lbs` : "- lbs"}</span>
                                    <span>
                                      {s.actualReps != null ? s.actualReps : "-"}/{s.targetReps} reps
                                    </span>
                                    {s.notes && (
                                      <span className="text-gray-600 italic">
                                        {s.notes}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function StatsPage() {
  return (
    <Suspense fallback={<p className="text-gray-500 py-12 text-center">Loading...</p>}>
      <StatsContent />
    </Suspense>
  );
}
