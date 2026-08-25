import { db, type OfflineWorkoutSession, type OfflineExerciseState } from "./db";
import { enqueueSync } from "./sync";

export async function startOfflineWorkout(params: {
  workoutId: string;
  source: "plan" | "discover";
  userPlanDayId?: string;
  planDayNumber?: number;
  exercises: {
    exerciseId: string;
    workoutExerciseId: string;
    sets: number;
    reps?: number | null;
    durationSeconds?: number | null;
  }[];
  startedAt?: Date;
}): Promise<number> {
  const session: OfflineWorkoutSession = {
    workoutSessionId: crypto.randomUUID(),
    workoutId: params.workoutId,
    source: params.source,
    userPlanDayId: params.userPlanDayId,
    planDayNumber: params.planDayNumber,
    startedAt: (params.startedAt ?? new Date()).toISOString(),
    exercises: params.exercises.map(
      (e): OfflineExerciseState => ({
        exerciseId: e.exerciseId,
        workoutExerciseId: e.workoutExerciseId,
        status: "pending",
        completedSets: 0,
        actualReps: e.reps ?? undefined,
        actualDurationSeconds: e.durationSeconds ?? undefined,
      })
    ),
    status: "in_progress",
  };

  return db.offlineWorkoutSessions.add(session);
}

export async function completeOfflineExercise(
  sessionDbId: number,
  exerciseIndex: number,
  data: {
    completedSets: number;
    actualReps?: number;
    actualDurationSeconds?: number;
  }
): Promise<void> {
  const session = await db.offlineWorkoutSessions.get(sessionDbId);
  if (!session) throw new Error("Offline session not found");

  session.exercises[exerciseIndex] = {
    ...session.exercises[exerciseIndex],
    status: "completed",
    completedSets: data.completedSets,
    actualReps: data.actualReps,
    actualDurationSeconds: data.actualDurationSeconds,
  };

  await db.offlineWorkoutSessions.update(sessionDbId, { exercises: session.exercises });
}

export async function skipOfflineExercise(
  sessionDbId: number,
  exerciseIndex: number
): Promise<void> {
  const session = await db.offlineWorkoutSessions.get(sessionDbId);
  if (!session) throw new Error("Offline session not found");

  session.exercises[exerciseIndex] = {
    ...session.exercises[exerciseIndex],
    status: "skipped",
  };

  await db.offlineWorkoutSessions.update(sessionDbId, { exercises: session.exercises });
}

export async function finishOfflineWorkout(
  sessionDbId: number,
  durationSeconds: number,
  estimatedCalories: number
): Promise<void> {
  const session = await db.offlineWorkoutSessions.get(sessionDbId);
  if (!session) throw new Error("Offline session not found");

  await db.offlineWorkoutSessions.update(sessionDbId, {
    status: "completed",
    completedAt: new Date().toISOString(),
    durationSeconds,
    estimatedCalories,
  });

  await enqueueSync({
    operationId: session.workoutSessionId,
    operationType: "WORKOUT_COMPLETED",
    payload: {
      workoutSessionId: session.workoutSessionId,
      workoutId: session.workoutId,
      source: session.source,
      userPlanDayId: session.userPlanDayId,
      startedAt: session.startedAt,
      completedAt: new Date().toISOString(),
      durationSeconds,
      estimatedCalories,
      exercises: session.exercises,
    },
    createdAt: Date.now(),
    status: "pending",
    retryCount: 0,
  });
}

export async function getActiveOfflineSessions(): Promise<OfflineWorkoutSession[]> {
  return db.offlineWorkoutSessions
    .where("status")
    .equals("in_progress")
    .toArray();
}

/**
 * Find an offline session for THIS workout that can be resumed after a
 * mid-workout refresh. Matching mirrors the server-side resume rule:
 * source-scoped so a discover start can never hijack a plan day's session
 * (or vice versa) and strand its progression state.
 */
export async function findResumableOfflineSession(
  workoutId: string,
  planDayId?: string | null
): Promise<OfflineWorkoutSession | null> {
  const candidates = await db.offlineWorkoutSessions
    .where("workoutId")
    .equals(workoutId)
    .filter((s) =>
      s.status === "in_progress" &&
      (planDayId ? s.userPlanDayId === planDayId : !s.userPlanDayId)
    )
    .toArray();

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return candidates[0];
}

/** Persist live progress onto the offline session row (refresh resume). */
export async function saveOfflineWorkoutProgress(
  sessionDbId: number,
  patch: {
    activeSeconds?: number;
    currentExerciseIndex?: number;
    currentSet?: number;
  }
): Promise<void> {
  await db.offlineWorkoutSessions.update(sessionDbId, patch);
}

export async function getAllOfflineSessions(): Promise<OfflineWorkoutSession[]> {
  return db.offlineWorkoutSessions.toArray();
}

export async function abandonOfflineWorkout(sessionDbId: number): Promise<void> {
  await db.offlineWorkoutSessions.update(sessionDbId, { status: "abandoned" });
}
