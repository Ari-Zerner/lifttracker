export interface ExerciseConfig {
  key: string;
  name: string;
  sets: number;
  reps: number;
}

export interface WorkoutConfig {
  name: string;
  exercises: ExerciseConfig[];
}

export const defaultWorkout: WorkoutConfig = {
  name: "Full Body",
  exercises: [
    { key: "deadlift", name: "Deadlifts", sets: 3, reps: 10 },
    { key: "squat", name: "Squats", sets: 3, reps: 10 },
    { key: "bench", name: "Bench Presses", sets: 3, reps: 10 },
    { key: "row", name: "Rows", sets: 3, reps: 10 },
  ],
};
