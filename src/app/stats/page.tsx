"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
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
  weight: string | null;
  completed: boolean;
  incomplete: boolean;
  notes: string | null;
}

interface SessionWithSets extends WorkoutSession {
  sets: SetData[];
}

export default function StatsPage() {
  const { data: session, status } = useSession();
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<SessionWithSets | null>(null);
  const [exerciseFilter, setExerciseFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/workouts")
        .then((r) => r.json())
        .then((data) => {
          setWorkouts(data);
          setLoading(false);
        });
    }
  }, [session]);

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

  async function viewWorkout(id: string) {
    const res = await fetch(`/api/workouts/${id}`);
    const data = await res.json();
    setSelectedWorkout(data);
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

      {/* Workout detail modal */}
      {selectedWorkout && (
        <div className="mb-6 bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">
              {formatDate(
                selectedWorkout.completedAt ?? selectedWorkout.startedAt
              )}
            </h2>
            <button
              onClick={() => setSelectedWorkout(null)}
              className="text-gray-500 hover:text-white text-sm"
            >
              Close
            </button>
          </div>

          {selectedWorkout.notes && (
            <p className="text-sm text-gray-400 mb-4 italic">
              {selectedWorkout.notes}
            </p>
          )}

          {defaultWorkout.exercises
            .filter(
              (ex) => exerciseFilter === "all" || ex.key === exerciseFilter
            )
            .map((ex) => {
              const sets = selectedWorkout.sets.filter(
                (s) => s.exercise === ex.key
              );
              if (sets.length === 0) return null;

              return (
                <div key={ex.key} className="mb-3">
                  <h3 className="text-sm font-medium text-gray-300 mb-1">
                    {ex.name}
                  </h3>
                  <div className="space-y-1">
                    {sets.map((s, i) => (
                      <div
                        key={i}
                        className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-gray-400"
                      >
                        <span
                          className={
                            s.completed
                              ? "text-green-400"
                              : s.incomplete
                              ? "text-yellow-400"
                              : "text-gray-600"
                          }
                        >
                          {s.completed ? "+" : s.incomplete ? "!" : "-"}
                        </span>
                        <span>Set {s.setNumber}</span>
                        <span>{s.weight ? `${s.weight} lbs` : "- lbs"}</span>
                        <span>
                          {s.actualReps ?? s.targetReps}/{s.targetReps} reps
                        </span>
                        {s.notes && (
                          <span className="text-gray-600 italic">
                            {s.notes}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Workouts list */}
      {workouts.length === 0 ? (
        <p className="text-gray-500">No workouts recorded yet.</p>
      ) : (
        <ul className="space-y-2">
          {workouts.map((w) => (
            <li key={w.id}>
              <button
                onClick={() => viewWorkout(w.id)}
                className="w-full text-left bg-gray-900 border border-gray-800 rounded-lg px-4 py-4 flex items-center justify-between hover:border-gray-700 transition"
              >
                <span>
                  {formatDate(w.completedAt ?? w.startedAt)}
                </span>
                <span className="text-sm text-gray-500">
                  {w.completedAt ? "Completed" : "In Progress"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
