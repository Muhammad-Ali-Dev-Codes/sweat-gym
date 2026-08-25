import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Integration-style tests for the ONE authoritative workout-completion
 * path (finalizeWorkoutCompletion) with a mocked Supabase wire format.
 * These pin the business rules that both the online server action and the
 * offline /api/sync endpoint depend on: idempotent replays, the daily
 * calorie-recognition cap, and duration fallbacks.
 */

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/services/onboarding", () => ({
  getProfile: vi.fn().mockResolvedValue({ timezone: "UTC" }),
}));
vi.mock("@/services/stats", () => ({
  getWorkoutStats: vi.fn().mockResolvedValue({
    totalCompletedWorkouts: 1,
    currentStreak: 1,
    totalCalories: 100,
    totalMinutes: 60,
    plansCompleted: 0,
  }),
}));
vi.mock("@/services/achievement", () => ({
  recordAchievements: vi.fn().mockResolvedValue([]),
}));

import { createClient } from "@/lib/supabase/server";

interface PostgrestLikeChain {
  [key: string]: ReturnType<typeof vi.fn>;
}

function tableChain(
  result: unknown,
  error: unknown = null,
  overrides: Record<string, unknown> = {}
) {
  const builder: Record<string, unknown> = {};
  const chain = {
    select: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(async () => ({ data: result, error })),
    maybeSingle: vi.fn(async () => ({ data: result, error })),
    then: (resolve: (v: { data: unknown; error: unknown }) => void) =>
      resolve({ data: result, error }),
  };
  // Every chained method returns `builder`, so overrides must land there.
  const merged = Object.assign(builder, chain, overrides);
  return merged as unknown as PostgrestLikeChain;
}

function setupSupabase(routes: {
  workoutSessionsSingle?: unknown;
  completedSameDay?: unknown[] | null;
  rpcResult?: unknown;
  rpcError?: { message: string } | null;
}) {
  const sessionRow = routes.workoutSessionsSingle ?? null;
  const sessionsChain = tableChain(sessionRow, sessionRow ? null : { message: "no rows" }, {
    single: vi.fn(async () => ({
      data: sessionRow,
      error: sessionRow ? null : { message: "no rows" },
    })),
  });
  const completedChain = tableChain(routes.completedSameDay ?? []);
  let sessionReads = 0;
  const from = vi.fn((table: string) => {
    if (table === "workout_sessions") {
      sessionReads += 1;
      // First call loads the session row; later calls read same-day completions.
      return sessionReads === 1 ? sessionsChain : completedChain;
    }
    return tableChain(null);
  });

  const rpc = vi.fn(async () => ({
    data: routes.rpcResult ?? {},
    error: routes.rpcError ?? null,
  }));

  vi.mocked(createClient).mockResolvedValue({ from, rpc } as never);
  return { from, rpc };
}

const SESSION = {
  id: "s1",
  started_at: new Date(Date.now() - 3_600_000).toISOString(),
  completed_at: null,
  duration_seconds: null,
  estimated_calories: null,
};

describe("finalizeWorkoutCompletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when the session does not exist or is not owned", async () => {
    setupSupabase({ workoutSessionsSingle: null });
    const { finalizeWorkoutCompletion } = await import(
      "@/services/workout/completion"
    );
    await expect(
      finalizeWorkoutCompletion({ userId: "u1", sessionId: "missing" })
    ).rejects.toThrow("Session not found");
  });

  it("passes recognized (capped) calories to the RPC and maps the summary", async () => {
    // One earlier session today already recognized 900 kcal -> only 100 remain.
    const { rpc } = setupSupabase({
      workoutSessionsSingle: SESSION,
      completedSameDay: [{ estimated_calories: 900 }],
      rpcResult: {
        already_completed: false,
        plan_day_completed: true,
        next_day_unlocked: true,
        plan_completed: false,
        current_streak: 3,
      },
    });
    const { finalizeWorkoutCompletion } = await import(
      "@/services/workout/completion"
    );

    const summary = await finalizeWorkoutCompletion({
      userId: "u1",
      sessionId: "s1",
      durationSeconds: 3600, // full hour = raw 1100 kcal at the uniform rate
    });

    expect(rpc).toHaveBeenCalledWith("complete_workout_session_rpc", {
      p_session_id: "s1",
      p_duration_seconds: 3600,
      p_estimated_calories: 100, // 1000/day recognition cap enforced
      p_timezone: "UTC",
    });
    expect(summary.planDayCompleted).toBe(true);
    expect(summary.nextDayUnlocked).toBe(true);
    expect(summary.currentStreak).toBe(3);
    expect(summary.calories).toBe(100);
  });

  it("treats an RPC already_completed reply as an idempotent replay", async () => {
    setupSupabase({
      workoutSessionsSingle: { ...SESSION, status: "completed" },
      completedSameDay: [],
      rpcResult: {
        already_completed: true,
        plan_day_completed: false,
        next_day_unlocked: false,
        plan_completed: false,
        current_streak: 5,
      },
    });
    const { finalizeWorkoutCompletion } = await import(
      "@/services/workout/completion"
    );

    const summary = await finalizeWorkoutCompletion({
      userId: "u1",
      sessionId: "s1",
      durationSeconds: 1800,
    });

    expect(summary.alreadyCompleted).toBe(true);
    expect(summary.planDayCompleted).toBe(false);
    expect(summary.nextDayUnlocked).toBe(false);
  });

  it("propagates RPC failures instead of reporting success", async () => {
    setupSupabase({
      workoutSessionsSingle: SESSION,
      rpcError: { message: "direct completion of workout_sessions is not permitted" },
    });
    const { finalizeWorkoutCompletion } = await import(
      "@/services/workout/completion"
    );

    await expect(
      finalizeWorkoutCompletion({ userId: "u1", sessionId: "s1", durationSeconds: 600 })
    ).rejects.toThrow("Failed to complete workout");
  });
});
