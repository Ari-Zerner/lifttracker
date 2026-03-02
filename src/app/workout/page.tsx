"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { defaultWorkout } from "@/config/workouts";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "lifttracker-workout";

interface SetState {
  exercise: string;
  setNumber: number;
  targetReps: number;
  actualReps: string;
  weight: string;
  completed: boolean;
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
  const [sets, setSets] = useState<SetState[]>(() => {
    if (typeof window === "undefined") return buildInitialSets();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.sets ?? buildInitialSets();
      }
    } catch {}
    return buildInitialSets();
  });
  const [sessionNotes, setSessionNotes] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).sessionNotes ?? "";
    } catch {}
    return "";
  });
  const [saving, setSaving] = useState(false);
  const [lastWeights, setLastWeights] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.lastWeights) setLastWeights(data.lastWeights);
      })
      .catch(() => {});
  }, []);

  const saveToStorage = useCallback(
    (s: SetState[], notes: string) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ sets: s, sessionNotes: notes }));
      } catch {}
    },
    []
  );

  useEffect(() => {
    saveToStorage(sets, sessionNotes);
  }, [sets, sessionNotes, saveToStorage]);

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
            notes: s.notes || undefined,
          })),
        }),
      });
      if (res.ok) {
        localStorage.removeItem(STORAGE_KEY);
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

            <div className="space-y-3">
              {exerciseSets.map((s) => (
                <div key={s._index} className="bg-gray-800/50 rounded-lg p-3">
                  {/* Row 1: checkbox, label, inputs */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() =>
                        updateSet(s._index, {
                          completed: !s.completed,
                        })
                      }
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center shrink-0 transition ${
                        s.completed
                          ? "bg-green-600 border-green-600 text-white"
                          : "border-gray-600 text-transparent hover:border-gray-400"
                      }`}
                    >
                      {s.completed && (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    <span className="text-sm text-gray-400 w-12 shrink-0">
                      Set {s.setNumber}
                    </span>

                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder={lastWeights[`${s.exercise}:${s.setNumber}`] ?? "lbs"}
                        value={s.weight}
                        onChange={(e) =>
                          updateSet(s._index, { weight: e.target.value })
                        }
                        className="w-20 sm:w-24 h-11 bg-gray-800 border border-gray-700 rounded-lg px-2 text-base text-center focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder={String(s.targetReps)}
                        value={s.actualReps}
                        onChange={(e) =>
                          updateSet(s._index, { actualReps: e.target.value })
                        }
                        className="w-16 sm:w-20 h-11 bg-gray-800 border border-gray-700 rounded-lg px-2 text-base text-center focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-xs text-gray-500 shrink-0">reps</span>
                    </div>
                  </div>

                  {/* Note button */}
                  <div className="flex items-center gap-2 mt-2 ml-12 sm:ml-[3.25rem]">
                    <button
                      onClick={() =>
                        updateSet(s._index, { showNotes: !s.showNotes })
                      }
                      title="Add note"
                      className={`min-h-[44px] min-w-[44px] text-sm px-3 rounded-lg transition ${
                        s.notes
                          ? "bg-blue-600/20 text-blue-400"
                          : "text-gray-500 bg-gray-800 hover:text-gray-300"
                      }`}
                    >
                      Note
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
                      className="mt-2 w-full h-11 bg-gray-800 border border-gray-700 rounded-lg px-3 text-base focus:outline-none focus:border-blue-500"
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
        className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white py-3 min-h-[48px] rounded-lg font-medium text-lg transition mb-8"
      >
        {saving ? "Saving..." : "Finish Workout"}
      </button>
    </div>
  );
}
