"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Pause,
  Play,
  SkipForward,
  Timer,
} from "lucide-react";
import type {
  Exercise,
  Workout,
  WorkoutExercise,
  PlanDayWithWorkout,
} from "@/lib/types/database";
import { estimateCalories } from "@/lib/calories";
import { formatClock } from "@/lib/duration";
import {
  startWorkout as startWorkoutAction,
  finishWorkout as finishWorkoutAction,
  type WorkoutExerciseView,
} from "@/app/actions/workout";
import {
  startOfflineWorkout,
  completeOfflineExercise,
  skipOfflineExercise,
  finishOfflineWorkout,
  findResumableOfflineSession,
  saveOfflineWorkoutProgress,
} from "@/lib/offline/workout";
import { enqueueSync } from "@/lib/offline/sync";
import { ProgressRing } from "@/components/ui/progress-ring";
import { WorkoutComplete } from "./workout-complete";

type WorkoutMeta = {
  name: string;
  targetCalories: number;
  targetDurationSeconds: number;
};

type DayBlockRow = {
  position: number;
  duration_seconds: number;
  calories: number;
  workouts: { name: string } | null;
};

type ExerciseResult = {
  exerciseSessionId: string;
  /** Sync-schema ids (present when server views are available). */
  workoutExerciseId?: string;
  exerciseId?: string;
  status: "completed" | "skipped";
  completedSets: number;
};

type RecordedResult = {
  status: "completed" | "skipped";
  completedSets: number;
};

export type CompletionInfo = {
  synced: boolean;
  planDayCompleted: boolean;
  nextDayUnlocked: boolean;
  planCompleted: boolean;
  currentStreak: number;
  calories: number;
  exercisesCompleted: number;
  achievements: { key: string; title: string }[];
};

// ---------------------------------------------------------------------------
// Refresh-resume persistence
// A mid-workout refresh must not erase per-exercise progress. Online sessions
// are mirrored to localStorage keyed by the workout identity and validated
// against the server session id on resume (a NEW session never inherits old
// progress); offline sessions keep progress directly on the Dexie row.
// ---------------------------------------------------------------------------

type StoredResult = [number, "completed" | "skipped", number];

interface StoredWorkoutProgress {
  sessionId?: string;
  offlineDbId?: number;
  startedAtIso: string;
  activeSeconds: number;
  currentExerciseIndex: number;
  currentSet: number;
  results: StoredResult[];
}

function readStoredProgress(workoutKey: string): StoredWorkoutProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`titan-workout-progress:${workoutKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredWorkoutProgress>;
    if (
      typeof parsed.startedAtIso !== "string" ||
      typeof parsed.activeSeconds !== "number" ||
      typeof parsed.currentExerciseIndex !== "number" ||
      typeof parsed.currentSet !== "number" ||
      !Array.isArray(parsed.results)
    ) {
      return null;
    }
    const results: StoredResult[] = parsed.results.filter(
      ([i, st, sets]) =>
        typeof i === "number" &&
        i >= 0 &&
        (st === "completed" || st === "skipped") &&
        typeof sets === "number"
    );
    return { ...(parsed as StoredWorkoutProgress), results };
  } catch {
    return null;
  }
}

function writeStoredProgress(
  workoutKey: string,
  progress: StoredWorkoutProgress
): void {
  try {
    window.localStorage.setItem(
      `titan-workout-progress:${workoutKey}`,
      JSON.stringify(progress)
    );
  } catch {
    // Storage unavailable — resume simply won't work.
  }
}

function clearStoredProgress(workoutKey: string): void {
  try {
    window.localStorage.removeItem(`titan-workout-progress:${workoutKey}`);
  } catch {
    // Non-fatal.
  }
}

export default function WorkoutPage() {
  const searchParams = useSearchParams();
  const planDayId = searchParams.get("planDayId");
  const workoutIdParam = searchParams.get("workoutId");
  const autoStart = Boolean(planDayId || workoutIdParam);

  const [loading, setLoading] = useState(!!planDayId || !!workoutIdParam);
  const [notFound, setNotFound] = useState(false);
  const [planDay, setPlanDay] = useState<PlanDayWithWorkout | null>(null);
  const [workoutMeta, setWorkoutMeta] = useState<WorkoutMeta | null>(null);
  // Ordered videos composing this plan day (empty for non-plan workouts).
  const [dayBlocks, setDayBlocks] = useState<
    { position: number; durationSeconds: number; calories: number; name: string }[]
  >([]);
  const [rawExercises, setRawExercises] = useState<WorkoutExercise[]>([]);
  const [rawDetails, setRawDetails] = useState<Map<string, Exercise>>(new Map());
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [restTotal, setRestTotal] = useState(0);
  const [exerciseTimeLeft, setExerciseTimeLeft] = useState(0);
  const [exerciseElapsed, setExerciseElapsed] = useState(0);
  const [exerciseTimerRunning, setExerciseTimerRunning] = useState(false);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [workoutComplete, setWorkoutComplete] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Server-returned exercise views (authoritative once the session starts).
  const [activeViews, setActiveViews] = useState<WorkoutExerciseView[] | null>(null);
  // Dexie session id while running in offline mode.
  const [offlineDbId, setOfflineDbId] = useState<number | null>(null);
  const [completionInfo, setCompletionInfo] = useState<CompletionInfo | null>(null);
  const startWorkoutRef = useRef<() => void>(() => undefined);
  const autoStartTriggeredRef = useRef(false);

  const resultsRef = useRef<Map<number, RecordedResult>>(new Map());
  // Bumped whenever resultsRef changes so persistence effects can observe it.
  const [resultsVersion, setResultsVersion] = useState(0);
  const finishingRef = useRef(false);

  // Live mirror of timer state so a single interval always acts on fresh values.
  const liveTimerRef = useRef({
    isResting,
    restTimeLeft,
    isTimedExercise: false,
    exerciseTimeLeft,
  });

  // Effective exercise list: server views win over the initial DB load so
  // restriction replacements are reflected in the live session.
  const exercises = useMemo<WorkoutExercise[]>(() => {
    if (!activeViews) return rawExercises;
    return activeViews.map((v, i) => ({
      id: v.workoutExerciseId || `view-${i}`,
      workout_id: planDay?.workout_id ?? workoutIdParam ?? "",
      exercise_id: v.workoutExerciseId || `view-${i}`,
      exercise_order: i + 1,
      sets: v.sets,
      reps: v.reps,
      duration_seconds: v.durationSeconds,
      rest_seconds: v.restSeconds,
      created_at: "",
    }));
  }, [activeViews, rawExercises, planDay, workoutIdParam]);

  const exerciseDetails = useMemo<Map<string, Exercise>>(() => {
    if (!activeViews) return rawDetails;
    const m = new Map<string, Exercise>();
    activeViews.forEach((v, i) => {
      m.set(v.workoutExerciseId || `view-${i}`, {
        id: "",
        name: v.name,
        animation_url: v.animationUrl,
        instructions: v.instructions,
        description: null,
        external_source: null,
        external_exercise_id: null,
        thumbnail_url: null,
        video_url: null,
        media_source: "",
        exercise_mode: v.mode,
        is_low_impact: false,
        requires_jumping: false,
        is_active: true,
        created_at: "",
        updated_at: "",
      });
    });
    return m;
  }, [activeViews, rawDetails]);

  const currentExercise = exercises[currentExerciseIndex];
  const currentExerciseDetail =
    currentExercise ? exerciseDetails.get(currentExercise.exercise_id) : null;
  const isTimedExercise =
    !!currentExercise &&
    currentExercise.reps === null &&
    currentExercise.duration_seconds != null;

  useEffect(() => {
    liveTimerRef.current = {
      isResting,
      restTimeLeft,
      isTimedExercise,
      exerciseTimeLeft,
    };
  }, [isResting, restTimeLeft, isTimedExercise, exerciseTimeLeft]);

  // ---- Data loading --------------------------------------------------------
  useEffect(() => {
    if (!planDayId && !workoutIdParam) return;

    let cancelled = false;
    const supabase = createClient();

    async function loadExercises(workoutId: string) {
      const { data: workoutExercises, error } = await supabase
        .from("workout_exercises")
        .select("*")
        .eq("workout_id", workoutId)
        .order("exercise_order");

      if (error) console.error("loadExercises failed:", error.message);

      const weList = (workoutExercises as WorkoutExercise[]) ?? [];
      if (cancelled) return;
      setRawExercises(weList);

      const exerciseIds = weList.map((we) => we.exercise_id);
      if (exerciseIds.length > 0) {
        const { data: exData } = await supabase
          .from("exercises")
          .select("*")
          .in("id", exerciseIds);

        if (cancelled) return;
        const exMap = new Map<string, Exercise>();
        (exData as Exercise[])?.forEach((ex) => exMap.set(ex.id, ex));
        setRawDetails(exMap);
      }
    }

    async function loadWorkout() {
      setNotFound(false);

      if (planDayId) {
        const { data: day } = await supabase
          .from("user_plan_days")
          .select("*, workouts(*)")
          .eq("id", planDayId)
          .single();

        if (cancelled) return;

        if (!day) {
          setLoading(false);
          setNotFound(true);
          return;
        }

        setPlanDay(day as PlanDayWithWorkout);
        setWorkoutMeta({
          name:
            (day as PlanDayWithWorkout).workouts?.name ?? `Day ${(day as PlanDayWithWorkout).day_number}`,
          targetCalories: (day as PlanDayWithWorkout).target_calories ?? 0,
          targetDurationSeconds:
            (day as PlanDayWithWorkout).target_duration_seconds ?? 0,
        });

        // Composed hour: the ordered video sequence for this day.
        const { data: blocksRows } = await supabase
          .from("user_plan_day_blocks")
          .select("*, workouts(name)")
          .eq("user_plan_day_id", planDayId)
          .order("position");
        if (!cancelled) {
          setDayBlocks(
            ((blocksRows as DayBlockRow[] | null) ?? []).map((b) => ({
              position: b.position,
              durationSeconds: b.duration_seconds,
              calories: b.calories,
              name: b.workouts?.name ?? "Workout",
            }))
          );
        }

        if ((day as PlanDayWithWorkout).workout_id) {
          await loadExercises((day as PlanDayWithWorkout).workout_id as string);
        }
      } else if (workoutIdParam) {
        const { data: workout } = await supabase
          .from("workouts")
          .select("*")
          .eq("id", workoutIdParam)
          .eq("is_active", true)
          .single();

        if (cancelled) return;

        if (!workout) {
          setLoading(false);
          setNotFound(true);
          return;
        }

        const w = workout as Workout;
        setPlanDay(null);
        setWorkoutMeta({
          name: w.name,
          targetCalories: w.estimated_calories ?? 0,
          targetDurationSeconds: w.duration_seconds ?? 0,
        });
        await loadExercises(w.id);
      }

      if (!cancelled) setLoading(false);
    }

    loadWorkout();

    return () => {
      cancelled = true;
    };
  }, [planDayId, workoutIdParam]);

  // ---- Countdown reset (on exercise/set change) -----------------------------
  const exerciseTimerKey = `${currentExerciseIndex}-${currentSet}-${isTimedExercise ? "timed" : "reps"}`;
  const [prevTimerKey, setPrevTimerKey] = useState(exerciseTimerKey);
  if (prevTimerKey !== exerciseTimerKey) {
    setPrevTimerKey(exerciseTimerKey);
    setExerciseTimerRunning(false);
    setExerciseElapsed(0);
    if (isTimedExercise && currentExercise?.duration_seconds != null) {
      setExerciseTimeLeft(currentExercise.duration_seconds);
    }
  }

  const timerStarted = isTimedExercise
    ? currentExercise?.duration_seconds != null &&
      exerciseTimeLeft < currentExercise.duration_seconds
    : exerciseElapsed > 0;

  // ---- Actions -------------------------------------------------------------
  const mirrorToOffline = useCallback(
    (index: number, status: "completed" | "skipped", completedSets: number) => {
      if (offlineDbId == null) return;
      const p =
        status === "completed"
          ? completeOfflineExercise(offlineDbId, index, { completedSets })
          : skipOfflineExercise(offlineDbId, index);
      p.catch((err) => console.warn("Offline exercise mirror failed:", err));
    },
    [offlineDbId]
  );

  const recordResult = useCallback(
    (index: number, status: "completed" | "skipped") => {
      const ex = exercises[index];
      resultsRef.current.set(index, {
        status,
        completedSets: status === "completed" ? ex?.sets ?? 0 : 0,
      });
      setResultsVersion((v) => v + 1);
      mirrorToOffline(index, status, ex?.sets ?? 0);
    },
    [exercises, mirrorToOffline]
  );

  // ---- Refresh-resume ------------------------------------------------------
  // Identity of THIS workout for progress storage ("plan:<dayId>" or
  // "discover:<workoutId>").
  const progressKey = planDayId
    ? `plan:${planDayId}`
    : workoutIdParam
      ? `discover:${workoutIdParam}`
      : null;

  const applyStoredProgress = useCallback(
    (stored: StoredWorkoutProgress) => {
      resultsRef.current.clear();
      for (const [index, status, completedSets] of stored.results) {
        resultsRef.current.set(index, { status, completedSets });
      }
      setResultsVersion((v) => v + 1);
      setCurrentExerciseIndex(
        Math.max(0, Math.min(stored.currentExerciseIndex, exercises.length - 1))
      );
      setCurrentSet(Math.max(1, stored.currentSet));
      setActiveSeconds(Math.max(0, Math.floor(stored.activeSeconds)));
    },
    [exercises.length]
  );

  // Latest live snapshot for persistence effects (kept out of callback
  // identities so saves fire only when structure changes or every 15s).
  const snapshotRef = useRef({
    sessionId: undefined as string | undefined,
    offlineDbId: undefined as number | undefined,
    startedAtIso: "",
    activeSeconds: 0,
    currentExerciseIndex: 0,
    currentSet: 1,
  });
  useEffect(() => {
    snapshotRef.current = {
      sessionId: sessionId ?? undefined,
      offlineDbId: offlineDbId ?? undefined,
      startedAtIso: (startTime ?? new Date()).toISOString(),
      activeSeconds,
      currentExerciseIndex,
      currentSet,
    };
  });

  const persistSnapshot = useCallback(() => {
    if (!progressKey || !workoutStarted || workoutComplete) return;
    writeStoredProgress(progressKey, {
      ...snapshotRef.current,
      startedAtIso:
        snapshotRef.current.startedAtIso || new Date().toISOString(),
      results: Array.from(resultsRef.current.entries()).map(
        ([index, r]) => [index, r.status, r.completedSets] as StoredResult
      ),
    });
  }, [progressKey, workoutStarted, workoutComplete]);

  // Structural changes (exercise marked done, advanced, set changed) persist
  // immediately; wall-clock elapsed mirrors every 15s.
  useEffect(() => {
    persistSnapshot();
  }, [persistSnapshot, resultsVersion]);

  useEffect(() => {
    if (!workoutStarted || workoutComplete) return;
    const id = window.setInterval(() => {
      persistSnapshot();
      const snap = snapshotRef.current;
      if (snap.offlineDbId != null) {
        void saveOfflineWorkoutProgress(snap.offlineDbId, {
          activeSeconds: snap.activeSeconds,
          currentExerciseIndex: snap.currentExerciseIndex,
          currentSet: snap.currentSet,
        }).catch(() => undefined);
      }
    }, 15_000);
    return () => window.clearInterval(id);
  }, [workoutStarted, workoutComplete, persistSnapshot]);

  const buildBulkResults = useCallback((): ExerciseResult[] => {
    const out: ExerciseResult[] = [];
    for (let i = 0; i < exercises.length; i++) {
      const view = activeViews?.[i];
      const sessionKey = view?.exerciseSessionId ?? "";
      if (!sessionKey) continue;
      const syncIds = {
        workoutExerciseId: view?.workoutExerciseId || String(exercises[i]?.id || ""),
        exerciseId: String(exercises[i]?.exercise_id || ""),
      };
      const rec = resultsRef.current.get(i);
      if (rec) {
        out.push({ exerciseSessionId: sessionKey, ...syncIds, status: rec.status, completedSets: rec.completedSets });
      } else if (i < currentExerciseIndex) {
        // Reached past this exercise before finishing — treat as completed.
        out.push({
          exerciseSessionId: sessionKey,
          ...syncIds,
          status: "completed",
          completedSets: exercises[i].sets,
        });
      } else {
        out.push({
          exerciseSessionId: sessionKey,
          ...syncIds,
          status: "skipped",
          completedSets: 0,
        });
      }
    }
    return out;
  }, [exercises, activeViews, currentExerciseIndex]);

  const startWorkout = async () => {
    setStartError(null);

    const workoutKey = planDay?.workout_id ?? workoutIdParam;
    if (!workoutKey) return;

    const source = planDayId ? ("plan" as const) : ("discover" as const);
    const startedAt = new Date();

    // Online path: authoritative server-side session creation.
    if (typeof navigator === "undefined" || navigator.onLine) {
      try {
        const res = await startWorkoutAction({
          workoutId: workoutKey,
          source,
          planDayId: planDayId ?? undefined,
        });

        if (!res.error && res.sessionId) {
          setActiveViews(res.exercises.length > 0 ? res.exercises : null);
          setSessionId(res.sessionId);
          setWorkoutStarted(true);

          // Resume a refresh-interrupted session: only when the server
          // handed back the SAME session we stored progress for.
          const stored = progressKey ? readStoredProgress(progressKey) : null;
          if (stored && stored.sessionId === res.sessionId) {
            setStartTime(new Date(stored.startedAtIso));
            applyStoredProgress(stored);
          } else {
            // New session (fresh start or repeat of a completed day).
            setStartTime(startedAt);
            if (progressKey) clearStoredProgress(progressKey);
          }
          return;
        }

        // Business rejection (locked day etc.) — do not silently go offline.
        setStartError(res.error ?? "Could not start workout.");
        return;
      } catch {
        // Network/transport failure — fall through to offline mode.
        console.warn("startWorkout unreachable; using offline mode");
      }
    }

    // Offline path: resume an in-progress Dexie session for this workout
    // when one exists (refresh mid-offline-workout), otherwise create one.
    try {
      const resumable = workoutKey
        ? await findResumableOfflineSession(workoutKey, planDayId)
        : null;

      let dbId: number;
      let startedAtIso: string;
      if (resumable?.id != null) {
        dbId = resumable.id;
        startedAtIso = resumable.startedAt;
        setOfflineDbId(dbId);
        setStartTime(new Date(startedAtIso));
        setWorkoutStarted(true);
        // Rehydrate per-exercise outcomes recorded before the refresh.
        resultsRef.current.clear();
        resumable.exercises.forEach((exState, index) => {
          if (exState.status === "completed" || exState.status === "skipped") {
            resultsRef.current.set(index, {
              status: exState.status,
              completedSets: exState.completedSets,
            });
          }
        });
        setResultsVersion((v) => v + 1);

        const stored = progressKey ? readStoredProgress(progressKey) : null;
        if (stored && stored.offlineDbId === dbId) {
          setCurrentExerciseIndex(
            Math.max(
              0,
              Math.min(stored.currentExerciseIndex, rawExercises.length - 1)
            )
          );
          setCurrentSet(Math.max(1, stored.currentSet));
          setActiveSeconds(Math.max(0, Math.floor(stored.activeSeconds)));
        }
        return;
      }

      const created = await startOfflineWorkout({
        workoutId: workoutKey,
        source,
        userPlanDayId: planDayId ?? undefined,
        planDayNumber: planDay?.day_number,
        startedAt,
        exercises: rawExercises.map((e) => ({
          exerciseId: e.exercise_id,
          workoutExerciseId: e.id,
          sets: e.sets,
          reps: e.reps,
          durationSeconds: e.duration_seconds,
        })),
      });
      setOfflineDbId(created);
      setStartTime(startedAt);
      setWorkoutStarted(true);
    } catch (err) {
      console.error("Offline start failed:", err);
      setStartError("Could not start workout on this device.");
    }
  };

  startWorkoutRef.current = startWorkout;

  useEffect(() => {
    if (
      !loading &&
      autoStart &&
      !workoutStarted &&
      !workoutComplete &&
      !autoStartTriggeredRef.current
    ) {
      autoStartTriggeredRef.current = true;
      void startWorkoutRef.current();
    }
  }, [autoStart, loading, workoutComplete, workoutStarted]);

  const finishWorkout = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;

    try {
      const durationSeconds = Math.max(activeSeconds, 1);
      // Uniform product burn rate: 1 kcal per 5 seconds of exercise.
      const burnedCalories = estimateCalories(durationSeconds);
      const results = buildBulkResults();
      const exercisesCompleted = Math.max(
        0,
        exercises.length - results.filter((r) => r.status === "skipped").length
      );

      let info: CompletionInfo;

      if (sessionId) {
        // Online completion through the authoritative server path.
        try {
          const summary = await finishWorkoutAction({
            sessionId,
            durationSeconds,
            exercises: results,
          });

          if (!summary.error) {
            info = {
              synced: true,
              planDayCompleted: summary.planDayCompleted,
              nextDayUnlocked: summary.nextDayUnlocked,
              planCompleted: summary.planCompleted,
              currentStreak: summary.currentStreak,
              calories: summary.calories,
              exercisesCompleted,
              achievements: summary.newAchievements.map((a) => ({
                key: a.key,
                title: a.title,
              })),
            };
            setCompletionInfo(info);
            setWorkoutComplete(true);
            return;
          }

          console.warn("finishWorkout action error:", summary.error);
        } catch {
          console.warn("finishWorkout unreachable; queuing for sync");
        }

        // Server path failed — queue the completion locally. The server
        // session UUID is reused so the sync upsert lands on the same row.
        // Per-exercise outcomes ride along when their sync ids are known;
        // the endpoint requires UUIDs, so unknown-id rows are dropped.
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const syncExercises = results
          .filter(
            (r) =>
              UUID_RE.test(r.workoutExerciseId ?? "") &&
              UUID_RE.test(r.exerciseId ?? "")
          )
          .map((r) => ({
            exerciseId: r.exerciseId as string,
            workoutExerciseId: r.workoutExerciseId as string,
            status: r.status,
            completedSets: r.completedSets,
          }));

        try {
          await enqueueSync({
            operationId: sessionId,
            operationType: "WORKOUT_COMPLETED",
            payload: {
              workoutSessionId: sessionId,
              workoutId: planDay?.workout_id ?? workoutIdParam,
              source: planDayId ? "plan" : "discover",
              userPlanDayId: planDayId,
              startedAt: startTime?.toISOString() ?? new Date().toISOString(),
              completedAt: new Date().toISOString(),
              durationSeconds,
              estimatedCalories: burnedCalories,
              exercises: syncExercises,
            },
            createdAt: Date.now(),
            status: "pending",
            retryCount: 0,
          });
          info = {
            synced: false,
            planDayCompleted: Boolean(planDayId),
            nextDayUnlocked: false,
            planCompleted: false,
            currentStreak: 0,
            calories: burnedCalories,
            exercisesCompleted,
            achievements: [],
          };
        } catch (err) {
          console.error("Failed to queue completion:", err);
          info = {
            synced: false,
            planDayCompleted: false,
            nextDayUnlocked: false,
            planCompleted: false,
            currentStreak: 0,
            calories: burnedCalories,
            exercisesCompleted,
            achievements: [],
          };
        }
      } else if (offlineDbId != null) {
        // Offline session: persist locally + enqueue sync op.
        await finishOfflineWorkout(offlineDbId, durationSeconds, burnedCalories);
        info = {
          synced: false,
          planDayCompleted: Boolean(planDayId),
          nextDayUnlocked: false,
          planCompleted: false,
          currentStreak: 0,
          calories: burnedCalories,
          exercisesCompleted,
          achievements: [],
        };
      } else {
        info = {
          synced: false,
          planDayCompleted: false,
          nextDayUnlocked: false,
          planCompleted: false,
          currentStreak: 0,
          calories: burnedCalories,
          exercisesCompleted,
          achievements: [],
        };
      }

      // The completion is durably recorded (server or local queue) — the
      // refresh-resume snapshot has served its purpose.
      if (progressKey) clearStoredProgress(progressKey);
      setCompletionInfo(info);
      setWorkoutComplete(true);
    } finally {
      finishingRef.current = false;
    }
  }, [
    sessionId,
    offlineDbId,
    activeSeconds,
    startTime,
    planDay,
    planDayId,
    workoutIdParam,
    buildBulkResults,
    exercises.length,
    progressKey,
  ]);

  // Screen-reader announcements are emitted from event handlers and the
  // timer tick (never from an effect body): phase transitions plus a polite
  // final-5-seconds countdown.
  const [timerAnnouncement, setTimerAnnouncement] = useState("");

  const advanceOrFinish = useCallback(() => {
    if (currentExerciseIndex < exercises.length - 1) {
      const nextName =
        exerciseDetails.get(exercises[currentExerciseIndex + 1].exercise_id)?.name ??
        "next exercise";
      setTimerAnnouncement(`Next exercise: ${nextName}. Set 1.`);
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSet(1);
    } else {
      setTimerAnnouncement("Workout complete.");
      void finishWorkout();
    }
  }, [currentExerciseIndex, exercises, finishWorkout, exerciseDetails]);

  const completeExercise = useCallback(() => {
    recordResult(currentExerciseIndex, "completed");
    advanceOrFinish();
  }, [currentExerciseIndex, recordResult, advanceOrFinish]);

  const skipCurrentExercise = useCallback(() => {
    recordResult(currentExerciseIndex, "skipped");
    advanceOrFinish();
  }, [currentExerciseIndex, recordResult, advanceOrFinish]);

  const completeSet = useCallback(() => {
    if (!currentExercise) return;

    if (currentSet < currentExercise.sets) {
      const restFor = currentExercise.rest_seconds || 60;
      setTimerAnnouncement(
        `Set ${currentSet} done. Rest for ${formatClock(restFor)}.`
      );
      setCurrentSet(currentSet + 1);
      setRestTotal(restFor);
      setRestTimeLeft(restFor);
      setIsResting(true);
    } else {
      completeExercise();
    }
  }, [currentExercise, currentSet, completeExercise]);

  // ---- Unified 1-second tick (single source of truth for all timers) --------
  const completeSetRef = useRef(completeSet);

  useEffect(() => {
    completeSetRef.current = completeSet;
  }, [completeSet]);

  useEffect(() => {
    if (workoutComplete || (!exerciseTimerRunning && !isResting)) return;

    const id = window.setInterval(() => {
      const snap = liveTimerRef.current;

      setActiveSeconds((s) => s + 1);

      if (snap.isResting) {
        if (snap.restTimeLeft <= 1) {
          setRestTimeLeft(0);
          setIsResting(false);
          const nextName =
            exerciseDetails.get(exercises[currentExerciseIndex]?.exercise_id)?.name ??
            "Exercise";
          setTimerAnnouncement(`Rest done. ${nextName}. Set ${currentSet}.`);
        } else {
          setRestTimeLeft(snap.restTimeLeft - 1);
          if (snap.restTimeLeft - 1 <= 5) {
            setTimerAnnouncement(`Rest ends in ${snap.restTimeLeft - 1}`);
          }
        }
        return;
      }

      if (snap.isTimedExercise) {
        if (snap.exerciseTimeLeft <= 1) {
          setExerciseTimeLeft(0);
          setExerciseTimerRunning(false);
          completeSetRef.current();
        } else {
          setExerciseTimeLeft(snap.exerciseTimeLeft - 1);
          if (snap.exerciseTimeLeft - 1 <= 5) {
            setTimerAnnouncement(`${formatClock(snap.exerciseTimeLeft - 1)} left`);
          }
        }
      } else {
        setExerciseElapsed((s) => s + 1);
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [
    exerciseTimerRunning,
    isResting,
    workoutComplete,
    currentExerciseIndex,
    currentSet,
    exerciseDetails,
    exercises,
  ]);

  // ---- Derived -------------------------------------------------------------
  const caloriesBurned = estimateCalories(activeSeconds);
  const setDuration = currentExercise?.duration_seconds ?? null;
  const buttonProgress =
    isTimedExercise && setDuration
      ? Math.min(100, ((setDuration - exerciseTimeLeft) / setDuration) * 100)
      : 0;
  const progressPercent =
    exercises.length > 0
      ? Math.round(((currentExerciseIndex + (isResting ? 0.5 : 0)) / exercises.length) * 100)
      : 0;

  // Preload upcoming exercise animations so they show instantly on stage.
  useEffect(() => {
    exercises
      .slice(currentExerciseIndex + 1, currentExerciseIndex + 4)
      .forEach((e) => {
        const url = exerciseDetails.get(e.exercise_id)?.animation_url;
        if (!url) return;
        const img = new window.Image();
        img.src = url;
      });
  }, [exercises, exerciseDetails, currentExerciseIndex]);

  // ---- Render branches -----------------------------------------------------
  if (loading) {
    if (autoStart) return null;

    return (
      <div className="space-y-4 font-[family-name:var(--font-geist-sans)]">
        <div className="titan-hero h-64 animate-pulse rounded-2xl" />
        <div className="h-4 w-1/3 animate-pulse rounded-full bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!planDayId && !workoutIdParam) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center font-[family-name:var(--font-geist-sans)]">
        <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Dumbbell className="size-7" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-extrabold text-foreground">
          No workout selected
        </h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Pick today&apos;s session from your plan, or choose any workout from
          Discover.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/plan"
            className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-bold text-background transition-transform hover:scale-[1.03] active:scale-95"
          >
            Go to Plan
          </Link>
          <Link
            href="/discover"
            className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-card px-6 text-sm font-bold text-foreground transition-colors hover:bg-secondary active:scale-95"
          >
            Browse Discover
          </Link>
        </div>
      </div>
    );
  }

  if (notFound || (!planDay && !workoutMeta)) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center font-[family-name:var(--font-geist-sans)]">
        <h1 className="text-xl font-extrabold text-foreground">
          Workout not found
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This workout may have been removed.
        </p>
        <Link
          href="/discover"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-bold text-background transition-transform hover:scale-[1.03] active:scale-95"
        >
          Back to Discover
        </Link>
      </div>
    );
  }

  if (!workoutStarted && autoStart && !startError) {
    return null;
  }

  if (!workoutStarted && startError) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card p-10 text-center font-[family-name:var(--font-geist-sans)]">
        <p role="alert" className="text-sm font-semibold text-destructive">{startError}</p>
        <Link href="/plan" className="mt-5 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background">Back to Plan</Link>
      </div>
    );
  }

  if (workoutComplete) {
    return (
      <WorkoutComplete
        workoutName={workoutMeta?.name ?? "Workout"}
        durationSeconds={activeSeconds}
        calories={completionInfo?.calories ?? caloriesBurned}
        exercisesCompleted={
          completionInfo?.exercisesCompleted ?? exercises.length
        }
        totalExercises={exercises.length}
        info={completionInfo}
      />
    );
  }

  const metaName = workoutMeta?.name ?? `Day ${planDay?.day_number ?? ""}`;
  const metaCalories = workoutMeta?.targetCalories ?? 0;

  // ---- Start screen --------------------------------------------------------
  if (!workoutStarted && Boolean(searchParams.get("showPreview"))) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-2xl font-[family-name:var(--font-geist-sans)]"
      >
        <button
          onClick={() => window.history.back()}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full px-2 py-1"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </button>

        <div className="titan-hero relative overflow-hidden rounded-2xl p-6 shadow-xl shadow-black/15 sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full bg-white/8 blur-3xl"
          />
          <p className="relative text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
            Ready when you are
          </p>
          <h1 className="relative mt-3 text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
            {metaName}
          </h1>

          <div className="relative mt-6 flex flex-wrap gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3.5 py-1.5 text-sm font-semibold text-zinc-200 tabular-nums">
              <Clock className="size-4" aria-hidden />
              {formatClock(workoutMeta?.targetDurationSeconds ?? 0)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3.5 py-1.5 text-sm font-semibold text-zinc-200 tabular-nums">
              <Flame className="size-4 text-energy" aria-hidden />
              {metaCalories.toLocaleString()} kcal
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3.5 py-1.5 text-sm font-semibold text-zinc-200 tabular-nums">
              <Dumbbell className="size-4" aria-hidden />
              {exercises.length} exercises
            </span>
          </div>

          {dayBlocks.length > 1 && (
            <div className="relative mt-6">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
                60-minute block · play in order
              </p>
              <ol className="mt-3 space-y-1.5">
                {dayBlocks.map((b, i) => (
                  <li
                    key={`${b.position}-${b.name}`}
                    className={
                      i === 0
                        ? "flex items-center gap-2.5 text-sm font-bold text-white"
                        : "flex items-center gap-2.5 text-sm font-medium text-zinc-300"
                    }
                  >
                    <span
                      className={
                        i === 0
                          ? "grid size-6 shrink-0 place-items-center rounded-full bg-amber-400 text-[11px] font-black text-zinc-900 tabular-nums"
                          : "grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-black text-zinc-300 tabular-nums"
                      }
                    >
                      {b.position}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{b.name}</span>
                    <span className="shrink-0 text-xs text-zinc-400 tabular-nums">
                      {formatClock(b.durationSeconds)} · {b.calories} kcal
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
                This session starts with block 1 — keep going down the list to fill
                the hour. The last video closes it exactly.
              </p>
            </div>
          )}

          {startError && (
            <p role="alert" className="relative mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
              {startError}
            </p>
          )}

          <button
            onClick={startWorkout}
            disabled={exercises.length === 0}
            className="relative mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-black shadow-lg transition-transform duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-40 sm:w-auto"
          >
            <Play className="size-5 fill-black" aria-hidden />
            Start Workout
          </button>
        </div>

        {/* Exercise preview */}
        {exercises.length > 0 && (
          <section aria-label="Exercise preview" className="mt-6">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Today&apos;s circuit
            </h2>
            <ol className="space-y-2">
              {exercises.map((entry, i) => {
                const detail = exerciseDetails.get(entry.exercise_id);
                return (
                  <li
                    key={entry.id}
                    className="titan-card flex items-center gap-3.5 p-3.5"
                  >
                    {detail?.animation_url ? (
                      <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={detail.animation_url}
                          alt=""
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.visibility = "hidden";
                          }}
                          className="absolute inset-0 size-full object-cover"
                        />
                      </span>
                    ) : (
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-sm font-extrabold text-secondary-foreground">
                        {i + 1}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">
                        {detail?.name ?? "Exercise"}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {entry.sets} sets ·{" "}
                        {entry.reps !== null
                          ? `${entry.reps} reps`
                          : entry.duration_seconds ? formatClock(entry.duration_seconds) : "—"}
                      </p>
                    </div>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </motion.div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center font-[family-name:var(--font-geist-sans)]">
        <p className="text-sm font-semibold text-foreground">
          No exercises found for this workout.
        </p>
      </div>
    );
  }

  // ---- Rest screen ---------------------------------------------------------
  if (isResting) {
    const restProgress =
      restTotal > 0 ? ((restTotal - restTimeLeft) / restTotal) * 100 : 0;
    return (
      <motion.div
        key="rest"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      className="flex flex-col items-center py-10 text-center font-[family-name:var(--font-geist-sans)]"
    >
        <p className="sr-only" role="status" aria-live="polite">
          {timerAnnouncement}
        </p>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-energy">
          Rest
        </p>
        <h2 className="mt-2 text-2xl font-extrabold text-foreground sm:text-3xl">
          Recover for the next set
        </h2>

        <div className="mt-5 flex items-center justify-center gap-5 text-sm font-semibold text-muted-foreground tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden />
            {formatClock(activeSeconds)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Flame className="size-4 text-orange-500" aria-hidden />
            {caloriesBurned.toLocaleString()} kcal
          </span>
        </div>

        <div className="relative mt-8">
          <ProgressRing
            value={restProgress}
            size={220}
            strokeWidth={12}
            color="energy"
            showLabel={false}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={restTimeLeft}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="text-6xl font-extrabold tabular-nums text-foreground"
              >
                {formatClock(restTimeLeft)}
              </motion.span>
            </AnimatePresence>
            <span className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              rest
            </span>
          </div>
        </div>

        <p className="mt-8 max-w-xs text-sm text-muted-foreground">
          Next up:{" "}
          <span className="font-bold text-foreground">
            Set {currentSet} — {currentExerciseDetail?.name ?? "Exercise"}
          </span>
        </p>

        {currentExerciseDetail?.animation_url && (
          <div className="mt-4 size-28 overflow-hidden rounded-xl bg-secondary shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentExerciseDetail.animation_url}
              alt={`${currentExerciseDetail.name} preview`}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.visibility = "hidden";
              }}
              className="size-full object-cover"
            />
          </div>
        )}

        <button
          onClick={() => {
            setIsResting(false);
            setRestTimeLeft(0);
          }}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-secondary active:scale-95"
        >
          <SkipForward className="size-4" aria-hidden />
          Skip Rest
        </button>
      </motion.div>
    );
  }

  // ---- Exercise stage ------------------------------------------------------
  return (
    <div className="mx-auto max-w-2xl pb-44 font-[family-name:var(--font-geist-sans)] lg:pb-0">
      <p className="sr-only" role="status" aria-live="polite">
        {timerAnnouncement}
      </p>
      {/* Progress header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span>
            Exercise {currentExerciseIndex + 1} of {exercises.length}
          </span>
          <span className="tabular-nums">{progressPercent}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-foreground"
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: "spring", stiffness: 160, damping: 26 }}
          />
        </div>
        <div className="mt-3 flex items-center justify-center gap-5 text-sm font-semibold text-muted-foreground tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden />
            {formatClock(activeSeconds)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Flame className="size-4 text-orange-500" aria-hidden />
            {caloriesBurned.toLocaleString()} kcal
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentExerciseIndex}
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -32 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
        >
          {/* Exercise stage card */}
          <div className="titan-hero relative overflow-hidden rounded-2xl p-6 shadow-xl shadow-black/15 sm:p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-white/8 blur-3xl"
            />

            <p className="relative inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1 text-xs font-bold uppercase tracking-widest text-zinc-400">
              <Timer className="size-3.5" aria-hidden />
              Set {currentSet} of {currentExercise.sets}
            </p>

            <h1 className="relative mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              {currentExerciseDetail?.name ?? "Exercise"}
            </h1>

            {currentExerciseDetail?.animation_url ? (
              <div className="relative mx-auto mt-4 aspect-square w-full max-w-[200px] overflow-hidden rounded-xl bg-secondary shadow-lg sm:max-w-[240px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentExerciseDetail.animation_url}
                  alt={`${currentExerciseDetail.name} demonstration`}
                  onError={(e) => {
                    e.currentTarget.style.visibility = "hidden";
                  }}
                  className="absolute inset-0 size-full object-cover"
                />
                <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-3.5 py-1.5 text-3xl font-extrabold tabular-nums text-white backdrop-blur-sm">
                  {formatClock(isTimedExercise ? exerciseTimeLeft : exerciseElapsed)}
                  <span className="ml-0.5 text-lg font-bold">s</span>
                </span>
              </div>
            ) : (
              <div className="relative mx-auto mt-4 grid aspect-square w-full max-w-[200px] place-items-center rounded-xl bg-white/8 backdrop-blur-sm sm:max-w-[240px]">
                <span className="text-6xl font-extrabold tabular-nums text-white">
                  {formatClock(isTimedExercise ? exerciseTimeLeft : exerciseElapsed)}
                  <span className="ml-0.5 text-3xl font-bold text-zinc-300">s</span>
                </span>
              </div>
            )}

            <div className="relative mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/8 p-4 text-center backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                  Reps
                </p>
                <p className="mt-1 text-3xl font-extrabold tabular-nums text-white">
                  {currentExercise.reps ?? "—"}
                </p>
              </div>
              <div className="rounded-xl bg-white/8 p-4 text-center backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                  Duration
                </p>
                <p className="mt-1 text-3xl font-extrabold tabular-nums text-white">
                  {currentExercise.duration_seconds ? formatClock(currentExercise.duration_seconds) : "—"}
                </p>
              </div>
            </div>

            {currentExerciseDetail?.instructions && (
              <p className="relative mt-4 line-clamp-3 text-sm leading-relaxed text-zinc-400">
                {currentExerciseDetail.instructions}
              </p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls — pinned above the bottom nav on mobile */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-border/70 bg-background/90 p-3 backdrop-blur-xl lg:static lg:mt-5 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-2xl flex-col gap-2.5">
          <button
            type="button"
            onClick={() => setExerciseTimerRunning((r) => !r)}
            aria-label={
              exerciseTimerRunning
                ? "Pause set timer"
                : timerStarted
                  ? "Resume set timer"
                  : "Start set timer"
            }
            className="relative inline-flex h-16 w-full items-center justify-center overflow-hidden rounded-full bg-zinc-900 shadow-lg ring-1 ring-white/10 transition-transform duration-200 hover:scale-[1.01] active:scale-[0.98]"
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 transition-[width] duration-1000 ease-linear"
              style={{ width: `${exerciseTimerRunning || timerStarted ? buttonProgress : 0}%` }}
            />
            <span className="relative z-10 inline-flex items-center justify-center gap-2.5 px-8 text-base font-extrabold text-white">
              {isTimedExercise && setDuration != null && (
                <>
                  {exerciseTimerRunning ? (
                    <Pause className="size-6 fill-white" aria-hidden />
                  ) : (
                    <Play className="size-6 fill-white" aria-hidden />
                  )}
                  <span className="text-3xl font-black tabular-nums">
                    {formatClock(exerciseTimeLeft)}
                  </span>
                  <span className="sr-only">
                    {exerciseTimerRunning ? "Pause" : timerStarted ? "Resume" : "Start"}
                  </span>
                </>
              )}
              {!isTimedExercise && (
                <>
                  {exerciseTimerRunning ? (
                    <>
                      <Pause className="size-5 fill-white" aria-hidden />
                      <span className="text-xl tabular-nums">
                        Pause · {formatClock(exerciseElapsed)}
                      </span>
                    </>
                  ) : timerStarted ? (
                    <>
                      <Play className="size-5 fill-white" aria-hidden />
                      <span className="text-xl tabular-nums">
                        Resume · {formatClock(exerciseElapsed)}
                      </span>
                    </>
                  ) : (
                    <>
                      <Play className="size-5 fill-white" aria-hidden />
                      <span>Start</span>
                    </>
                  )}
                </>
              )}
            </span>
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={completeSet}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-bold text-foreground transition-colors hover:bg-secondary active:scale-[0.98]"
            >
              <CheckIcon />
              Complete Set {currentSet}
            </button>
            <button
              type="button"
              onClick={skipCurrentExercise}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-bold text-foreground transition-colors hover:bg-secondary active:scale-[0.98]"
            >
              <SkipForward className="size-4" aria-hidden />
              Skip
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming */}
      {currentExerciseIndex < exercises.length - 1 && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
          {(() => {
            const nextDetail = exerciseDetails.get(
              exercises[currentExerciseIndex + 1].exercise_id
            );
            return (
              <>
                {nextDetail?.animation_url ? (
                  <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={nextDetail.animation_url}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.visibility = "hidden";
                      }}
                      className="size-full object-cover"
                    />
                  </span>
                ) : (
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-xs font-extrabold text-secondary-foreground">
                    {currentExerciseIndex + 2}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Up next
                  </p>
                  <p className="truncate text-sm font-bold text-foreground">
                    {nextDetail?.name ?? "Exercise"}
                  </p>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
