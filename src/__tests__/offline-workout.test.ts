import { describe, it, expect, beforeEach } from "vitest";
import {
  startOfflineWorkout,
  completeOfflineExercise,
  skipOfflineExercise,
  finishOfflineWorkout,
  abandonOfflineWorkout,
  getActiveOfflineSessions,
  getAllOfflineSessions,
  findResumableOfflineSession,
  saveOfflineWorkoutProgress,
} from "@/lib/offline/workout";
import { db } from "@/lib/offline/db";

beforeEach(async () => {
  await db.offlineWorkoutSessions.clear();
  await db.pendingSync.clear();
});

const baseExercises = [
  { exerciseId: "ex1", workoutExerciseId: "we1", sets: 3, reps: 10 },
  { exerciseId: "ex2", workoutExerciseId: "we2", sets: 2, durationSeconds: 30 },
];

describe("Offline workout execution", () => {
  it("should start an offline workout session", async () => {
    const dbId = await startOfflineWorkout({
      workoutId: "w1",
      source: "plan",
      exercises: baseExercises,
    });
    expect(dbId).toBeGreaterThan(0);

    const sessions = await getAllOfflineSessions();
    expect(sessions.length).toBe(1);
    expect(sessions[0].status).toBe("in_progress");
    expect(sessions[0].exercises.length).toBe(2);
  });

  it("should start with discover source", async () => {
    await startOfflineWorkout({
      workoutId: "w2",
      source: "discover",
      exercises: baseExercises,
    });
    const sessions = await getAllOfflineSessions();
    expect(sessions[0].source).toBe("discover");
  });

  it("should include plan day info when provided", async () => {
    await startOfflineWorkout({
      workoutId: "w1",
      source: "plan",
      userPlanDayId: "pd1",
      planDayNumber: 5,
      exercises: baseExercises,
    });
    const sessions = await getAllOfflineSessions();
    expect(sessions[0].userPlanDayId).toBe("pd1");
    expect(sessions[0].planDayNumber).toBe(5);
  });

  it("should complete an exercise in a session", async () => {
    const dbId = await startOfflineWorkout({
      workoutId: "w1",
      source: "plan",
      exercises: baseExercises,
    });

    await completeOfflineExercise(dbId, 0, {
      completedSets: 3,
      actualReps: 12,
    });

    const sessions = await getAllOfflineSessions();
    const ex = sessions[0].exercises[0];
    expect(ex.status).toBe("completed");
    expect(ex.completedSets).toBe(3);
    expect(ex.actualReps).toBe(12);
  });

  it("should skip an exercise in a session", async () => {
    const dbId = await startOfflineWorkout({
      workoutId: "w1",
      source: "plan",
      exercises: baseExercises,
    });

    await skipOfflineExercise(dbId, 1);

    const sessions = await getAllOfflineSessions();
    expect(sessions[0].exercises[1].status).toBe("skipped");
  });

  it("should finish a workout and enqueue sync", async () => {
    const dbId = await startOfflineWorkout({
      workoutId: "w1",
      source: "plan",
      userPlanDayId: "pd1",
      exercises: baseExercises,
    });

    await completeOfflineExercise(dbId, 0, { completedSets: 3 });
    await completeOfflineExercise(dbId, 1, { completedSets: 2, actualDurationSeconds: 30 });
    await finishOfflineWorkout(dbId, 600, 250);

    const sessions = await getAllOfflineSessions();
    expect(sessions[0].status).toBe("completed");
    expect(sessions[0].durationSeconds).toBe(600);
    expect(sessions[0].estimatedCalories).toBe(250);

    const pendingCount = await db.pendingSync
      .where("status")
      .equals("pending")
      .count();
    expect(pendingCount).toBe(1);
  });

  it("should abandon a workout session", async () => {
    const dbId = await startOfflineWorkout({
      workoutId: "w1",
      source: "plan",
      exercises: baseExercises,
    });

    await abandonOfflineWorkout(dbId);

    const sessions = await getAllOfflineSessions();
    expect(sessions[0].status).toBe("abandoned");
  });

  it("should return only active sessions from getActiveOfflineSessions", async () => {
    await startOfflineWorkout({ workoutId: "w1", source: "plan", exercises: baseExercises });
    const dbId2 = await startOfflineWorkout({ workoutId: "w2", source: "discover", exercises: baseExercises });

    await finishOfflineWorkout(dbId2, 300, 100);

    const active = await getActiveOfflineSessions();
    expect(active.length).toBe(1);
    expect(active[0].workoutId).toBe("w1");
  });

  it("should throw on completeExercise for missing session", async () => {
    await expect(completeOfflineExercise(99999, 0, { completedSets: 3 })).rejects.toThrow(
      "Offline session not found"
    );
  });

  it("should throw on finishWorkout for missing session", async () => {
    await expect(finishOfflineWorkout(99999, 300, 100)).rejects.toThrow(
      "Offline session not found"
    );
  });
});

describe("Offline refresh-resume", () => {
  beforeEach(async () => {
    await db.offlineWorkoutSessions.clear();
    await db.pendingSync.clear();
  });

  it("finds the in-progress session for the same workout + plan day", async () => {
    const dbId = await startOfflineWorkout({
      workoutId: "w1",
      source: "plan",
      userPlanDayId: "pd1",
      exercises: baseExercises,
    });
    await completeOfflineExercise(dbId, 0, { completedSets: 3 });

    const resumable = await findResumableOfflineSession("w1", "pd1");
    expect(resumable?.id).toBe(dbId);
    // Per-exercise outcomes recorded before the "refresh" survive.
    expect(resumable?.exercises[0].status).toBe("completed");
    expect(resumable?.exercises[1].status).toBe("pending");
  });

  it("does not resume sessions of a different workout or plan day", async () => {
    await startOfflineWorkout({
      workoutId: "w1",
      source: "plan",
      userPlanDayId: "pd1",
      exercises: baseExercises,
    });
    expect(await findResumableOfflineSession("w2", null)).toBeNull();
    expect(await findResumableOfflineSession("w1", "other-day")).toBeNull();
    // Discover (no plan day) never inherits a plan-day session.
    expect(await findResumableOfflineSession("w1", null)).toBeNull();
  });

  it("never resumes a finished or abandoned session", async () => {
    const dbId = await startOfflineWorkout({
      workoutId: "w1",
      source: "plan",
      exercises: baseExercises,
    });
    await finishOfflineWorkout(dbId, 600, 200);
    expect(await findResumableOfflineSession("w1", null)).toBeNull();
  });

  it("persists and restores live progress fields", async () => {
    const dbId = await startOfflineWorkout({
      workoutId: "w1",
      source: "discover",
      exercises: baseExercises,
    });

    await saveOfflineWorkoutProgress(dbId, {
      activeSeconds: 720,
      currentExerciseIndex: 1,
      currentSet: 2,
    });

    const resumable = await findResumableOfflineSession("w1", null);
    expect(resumable?.activeSeconds).toBe(720);
    expect(resumable?.currentExerciseIndex).toBe(1);
    expect(resumable?.currentSet).toBe(2);
  });
});
