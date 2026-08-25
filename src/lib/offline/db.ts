import Dexie, { type Table } from "dexie";

export interface PendingSync {
  id?: number;
  operationId: string;
  operationType: "START_WORKOUT" | "EXERCISE_COMPLETED" | "EXERCISE_SKIPPED" | "WORKOUT_COMPLETED";
  payload: unknown;
  createdAt: number;
  /**
   * Lifecycle: pending -> syncing -> synced, or pending/failed on error.
   * After MAX_SYNC_ATTEMPTS an op becomes "dead": it is excluded from all
   * automatic retries and surfaced in the UI for explicit user action,
   * so one poison operation can never block the queue forever.
   */
  status: "pending" | "syncing" | "synced" | "failed" | "dead";
  retryCount: number;
  lastError?: string;
  nextRetryAt?: number;
}

export interface OfflineWorkoutSession {
  id?: number;
  workoutSessionId: string;
  workoutId: string;
  source: "plan" | "discover";
  userPlanDayId?: string;
  planDayNumber?: number;
  startedAt: string;
  exercises: OfflineExerciseState[];
  status: "in_progress" | "completed" | "abandoned";
  completedAt?: string;
  durationSeconds?: number;
  estimatedCalories?: number;
  /** Live-progress mirrors so a mid-workout refresh can resume exactly. */
  activeSeconds?: number;
  currentExerciseIndex?: number;
  currentSet?: number;
}

export interface OfflineExerciseState {
  exerciseId: string;
  workoutExerciseId: string;
  workoutExerciseSessionId?: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  completedSets: number;
  actualReps?: number;
  actualDurationSeconds?: number;
}

export interface CachedWorkout {
  workoutId: string;
  name: string;
  slug: string;
  description: string | null;
  durationSeconds: number;
  estimatedCalories: number;
  exercises: CachedExercise[];
  cachedAt: number;
}

export interface CachedExercise {
  workoutExerciseId: string;
  exerciseId: string;
  exerciseOrder: number;
  sets: number;
  reps: number | null;
  durationSeconds: number | null;
  restSeconds: number;
  name: string;
  animationUrl: string | null;
  instructions: string[] | null;
  exerciseMode: string;
}

export interface CachedMedia {
  url: string;
  status: "pending" | "downloading" | "cached" | "failed";
  cachedAt?: number;
  error?: string;
}

export interface LocalMeta {
  key: string;
  value: string;
  updatedAt: number;
}

class GymDatabase extends Dexie {
  pendingSync!: Table<PendingSync>;
  offlineWorkoutSessions!: Table<OfflineWorkoutSession>;
  cachedWorkouts!: Table<CachedWorkout>;
  cachedExercises!: Table<CachedExercise>;
  cachedMedia!: Table<CachedMedia>;
  localMeta!: Table<LocalMeta>;

  constructor() {
    super("gym-pwa-db");
    this.version(2).stores({
      pendingSync:
        "++id, operationId, status, createdAt",
      offlineWorkoutSessions:
        "++id, workoutSessionId, workoutId, source, status, startedAt",
      cachedWorkouts:
        "workoutId, cachedAt",
      cachedExercises:
        "exerciseId, workoutExerciseId",
      cachedMedia:
        "url, status",
      localMeta:
        "key",
    });
  }
}

export const db = new GymDatabase();
