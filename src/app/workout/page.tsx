"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { defaultWorkout } from "@/config/workouts";
import { useRouter } from "next/navigation";

interface SetState {
  exercise: string;
  setNumber: number;
  targetReps: number;
  actualReps: string;
  weight: string;
  completed: boolean;
  incomplete: boolean;
  notes: string;
  showNotes: boolean;
}

function buildInitialSets(): SetState[] {
  const sets: SetState[] = [];
  for (const ex of defaultWorkout.exercises) {
    for (let i = 1; i <= ex.sets; i++) {
      sets.push({
        exercise: ex.key,
        setNumber: i,
        targetReps: ex.reps,
        actualReps: "",
        weight: "",
        completed: false,
        incomplete: false,
        notes: "",
        showNotes: false,
      });
    }
  }
  return sets;
}

export default function WorkoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sets, setSets] = useState<SetState[]>(buildInitialSets);
  const [sessionNotes, setSessionNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (status === "loading") {
    return <p className="text-gray-500 py-12 text-center">Loading...</p>;
  }

  if (!session?.user) {
    return (
      <p className="text-gray-500 py-12 text-center">
        Sign in to start a workout.
      </p>
    );
  }

  function updateSet(index: number, updates: Partial<SetState>) {
    setSets((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  }

  async function finishWorkout() {
    setSaving(true);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: sessionNotes || undefined,
          sets: sets.map((s) => ({
            exercise: s.exercise,
            setNumber: s.setNumber,
            targetReps: s.targetReps,
            actualReps: s.actualReps ? parseInt(s.actualReps) : undefined,
            weight: s.weight || undefined,
            completed: s.completed,
            incomplete: s.incomplete,
            notes: s.notes || undefined,
          })),
        }),
      });
      if (res.ok) {
        router.push("/");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{defaultWorkout.name}</h1>

      {defaultWorkout.exercises.map((ex) => {
        const exerciseSets = sets
          .map((s, i) => ({ ...s, _index: i }))
          .filter((s) => s.exercise === ex.key);

        return (
          <section
            key={ex.key}
            className="mb-6 bg-gray-900 border border-gray-800 rounded-lg p-4"
          >
            <h2 className="text-lg font-semibold mb-3">{ex.name}</h2>

            <div className="space-y-2">
              {exerciseSets.map((s) => (
                <div key={s._index}>
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() =>
                        updateSet(s._index, {
                          completed: !s.completed,
                          incomplete: !s.completed ? false : s.incomplete,
                        })
                      }
                      className={`w-7 h-7 rounded border-2 flex items-center justify-center shrink-0 transition ${
                        s.completed
                          ? "bg-green-600 border-green-600 text-white"
                          : "border-gray-600 text-transparent hover:border-gray-400"
                      }`}
                    >
                      {s.completed && (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    {/* Set label */}
                    <span className="text-sm text-gray-400 w-14 shrink-0">
                      Set {s.setNumber}
                    </span>

                    {/* Weight */}
                    <input
                      type="number"
                      placeholder="lbs"
                      value={s.weight}
                      onChange={(e) =>
                        updateSet(s._index, { weight: e.target.value })
                      }
                      className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:border-blue-500"
                    />

                    {/* Reps */}
                    <input
                      type="number"
                      placeholder={String(s.targetReps)}
                      value={s.actualReps}
                      onChange={(e) =>
                        updateSet(s._index, { actualReps: e.target.value })
                      }
                      className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-xs text-gray-500">reps</span>

                    {/* Incomplete toggle */}
                    <button
                      onClick={() =>
                        updateSet(s._index, {
                          incomplete: !s.incomplete,
                          completed: !s.incomplete ? false : s.completed,
                        })
                      }
                      title="Mark as incomplete"
                      className={`text-sm px-2 py-1 rounded transition ${
                        s.incomplete
                          ? "bg-yellow-600/20 text-yellow-400"
                          : "text-gray-600 hover:text-gray-400"
                      }`}
                    >
                      !
                    </button>

                    {/* Notes toggle */}
                    <button
                      onClick={() =>
                        updateSet(s._index, { showNotes: !s.showNotes })
                      }
                      title="Add note"
                      className={`text-sm px-2 py-1 rounded transition ${
                        s.notes
                          ? "text-blue-400"
                          : "text-gray-600 hover:text-gray-400"
                      }`}
                    >
                      note
                    </button>
                  </div>

                  {/* Notes field */}
                  {s.showNotes && (
                    <input
                      type="text"
                      placeholder="Note for this set..."
                      value={s.notes}
                      onChange={(e) =>
                        updateSet(s._index, { notes: e.target.value })
                      }
                      className="mt-2 ml-10 w-[calc(100%-2.5rem)] bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Session notes */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">
          Workout Notes
        </label>
        <textarea
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
          placeholder="How did the workout go?"
          rows={3}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>

      <button
        onClick={finishWorkout}
        disabled={saving}
        className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white py-3 rounded-lg font-medium transition"
      >
        {saving ? "Saving..." : "Finish Workout"}
      </button>
    </div>
  );
}
