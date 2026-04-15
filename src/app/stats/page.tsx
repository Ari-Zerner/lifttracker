"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { defaultWorkout } from "@/config/workouts";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

const EXERCISE_COLORS: Record<string, string> = {
  deadlift: "#ef4444",
  squat: "#3b82f6",
  bench: "#22c55e",
  row: "#f59e0b",
};

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

interface EditSetState {
  exercise: string;
  setNumber: number;
  targetReps: number;
  actualReps: string;
  weight: string;
  notes: string;
}

function StatsContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [expandedWorkouts, setExpandedWorkouts] = useState<Record<string, SessionWithSets>>({});
  const [editingWorkout, setEditingWorkout] = useState<string | null>(null);
  const [editSets, setEditSets] = useState<EditSetState[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [visibleExercises, setVisibleExercises] = useState<Set<string>>(
    () => new Set(defaultWorkout.exercises.map((ex) => ex.key))
  );
  const [chartType, setChartType] = useState<"weight" | "completion">("weight");
  const [maxWeights, setMaxWeights] = useState<Record<string, string>>({});
  const [chartData, setChartData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  async function toggleWorkout(id: string) {
    if (expandedWorkouts[id]) {
      if (editingWorkout === id) setEditingWorkout(null);
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

  function startEditing(workout: SessionWithSets) {
    setEditingWorkout(workout.id);
    setEditNotes(workout.notes ?? "");
    setEditSets(
      workout.sets.map((s) => ({
        exercise: s.exercise,
        setNumber: s.setNumber,
        targetReps: s.targetReps,
        actualReps: s.actualReps != null ? String(s.actualReps) : "",
        weight: s.weight != null ? String(s.weight) : "",
        notes: s.notes ?? "",
      }))
    );
  }

  function updateEditSet(index: number, updates: Partial<EditSetState>) {
    setEditSets((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/workouts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: editNotes || null,
          sets: editSets.map((s) => ({
            exercise: s.exercise,
            setNumber: s.setNumber,
            targetReps: s.targetReps,
            actualReps: s.actualReps ? parseInt(s.actualReps) : null,
            weight: s.weight ? parseInt(s.weight) : null,
            notes: s.notes || null,
          })),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setExpandedWorkouts((prev) => ({ ...prev, [id]: updated }));
        setEditingWorkout(null);
      }
    } finally {
      setSaving(false);
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
        if (statsData.chartData) setChartData(statsData.chartData);
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

  function formatShortDate(dateStr: string) {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  function toggleExercise(key: string) {
    setVisibleExercises((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const filteredExercises = defaultWorkout.exercises.filter((ex) =>
    visibleExercises.has(ex.key)
  );

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

      {/* Exercise toggles */}
      <div className="mb-4 flex flex-wrap gap-2">
        {defaultWorkout.exercises.map((ex) => {
          const active = visibleExercises.has(ex.key);
          const color = EXERCISE_COLORS[ex.key] ?? "#8b5cf6";
          return (
            <button
              key={ex.key}
              onClick={() => toggleExercise(ex.key)}
              className={`text-sm px-3 py-1.5 rounded-lg transition border ${
                active
                  ? "text-white border-transparent"
                  : "text-gray-500 border-gray-700 bg-gray-900"
              }`}
              style={active ? { backgroundColor: color } : undefined}
            >
              {ex.name}
            </button>
          );
        })}
      </div>

      {/* Charts */}
      {chartData.length > 1 && (
        <div className="mb-6 bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setChartType("weight")}
              className={`text-sm px-3 py-1.5 rounded-lg transition ${
                chartType === "weight"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-gray-300"
              }`}
            >
              Weight
            </button>
            <button
              onClick={() => setChartType("completion")}
              className={`text-sm px-3 py-1.5 rounded-lg transition ${
                chartType === "completion"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-gray-300"
              }`}
            >
              Completion
            </button>
          </div>

          {chartType === "weight" && (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  label={{ value: "lbs", angle: -90, position: "insideLeft", fill: "#6b7280", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelFormatter={(label) => formatShortDate(String(label))}
                  formatter={(value, name) => {
                    const n = String(name);
                    const ex = defaultWorkout.exercises.find((e) => n === `weight_${e.key}`);
                    return [`${value} lbs`, ex?.name ?? n];
                  }}
                />
                {filteredExercises.map((ex) => (
                  <Line
                    key={ex.key}
                    type="monotone"
                    dataKey={`weight_${ex.key}`}
                    name={ex.name}
                    stroke={EXERCISE_COLORS[ex.key] ?? "#8b5cf6"}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}

          {chartType === "completion" && (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  domain={[0, 100]}
                  label={{ value: "%", angle: -90, position: "insideLeft", fill: "#6b7280", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelFormatter={(label) => formatShortDate(String(label))}
                  formatter={(value, name) => {
                    const n = String(name);
                    const ex = defaultWorkout.exercises.find((e) => n === `completion_${e.key}`);
                    return [`${value}%`, ex?.name ?? n];
                  }}
                />
                {filteredExercises.map((ex) => (
                  <Bar
                    key={ex.key}
                    dataKey={`completion_${ex.key}`}
                    name={ex.name}
                    fill={EXERCISE_COLORS[ex.key] ?? "#8b5cf6"}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Workouts list */}
      {workouts.length === 0 ? (
        <p className="text-gray-500">No workouts recorded yet.</p>
      ) : (
        <ul className="space-y-2">
          {workouts.map((w) => {
            const expanded = expandedWorkouts[w.id];
            const isEditing = editingWorkout === w.id;
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

                {expanded && !isEditing && (
                  <div className="px-4 pb-4 border-t border-gray-800 pt-3">
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => startEditing(expanded)}
                        className="text-sm text-blue-400 hover:text-blue-300 min-h-[44px] px-3"
                      >
                        Edit
                      </button>
                    </div>

                    {expanded.notes && (
                      <p className="text-sm text-gray-400 mb-3 italic">
                        {expanded.notes}
                      </p>
                    )}

                    {defaultWorkout.exercises
                      .filter(
                        (ex) => visibleExercises.has(ex.key)
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

                {expanded && isEditing && (
                  <div className="px-4 pb-4 border-t border-gray-800 pt-3">
                    {defaultWorkout.exercises
                      .filter(
                        (ex) => visibleExercises.has(ex.key)
                      )
                      .map((ex) => {
                        const sets = editSets
                          .map((s, i) => ({ ...s, _index: i }))
                          .filter((s) => s.exercise === ex.key);
                        if (sets.length === 0) return null;

                        return (
                          <div key={ex.key} className="mb-4">
                            <h3 className="text-sm font-medium text-gray-300 mb-2">
                              {ex.name}
                            </h3>
                            <div className="space-y-2">
                              {sets.map((s) => (
                                <div
                                  key={s._index}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <span className="text-gray-400 w-12 shrink-0">
                                    Set {s.setNumber}
                                  </span>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={s.weight}
                                    onChange={(e) =>
                                      updateEditSet(s._index, { weight: e.target.value })
                                    }
                                    className="w-16 h-10 bg-gray-800 border border-gray-700 rounded-lg px-2 text-base text-center focus:outline-none focus:border-blue-500"
                                  />
                                  <span className="text-xs text-gray-500">lbs</span>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    placeholder={String(s.targetReps)}
                                    value={s.actualReps}
                                    onChange={(e) =>
                                      updateEditSet(s._index, { actualReps: e.target.value })
                                    }
                                    className="w-14 h-10 bg-gray-800 border border-gray-700 rounded-lg px-2 text-base text-center focus:outline-none focus:border-blue-500"
                                  />
                                  <span className="text-xs text-gray-500">reps</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                    <div className="mb-3">
                      <input
                        type="text"
                        placeholder="Workout notes..."
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full h-10 bg-gray-800 border border-gray-700 rounded-lg px-3 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(w.id)}
                        disabled={saving}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white py-2 min-h-[44px] rounded-lg text-sm font-medium transition"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingWorkout(null)}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 min-h-[44px] rounded-lg text-sm font-medium transition"
                      >
                        Cancel
                      </button>
                    </div>
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
