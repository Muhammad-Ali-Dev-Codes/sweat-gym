import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

function mockSupabaseChain(result: unknown, error: { message: string } | null = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const builder: Record<string, unknown> = {};

  const methods = [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "in", "order", "limit", "single", "maybeSingle",
  ];

  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(builder);
    builder[method] = chain[method];
  }

  builder.then = (resolve: (val: { data: unknown; error: typeof error }) => void) => {
    resolve({ data: result, error });
  };

  return chain;
}

describe("plan service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getActivePlan queries user_plans with active status", async () => {
    const mockPlan = { id: "plan-1", status: "active" };
    const chain = mockSupabaseChain(mockPlan);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue(chain),
    } as never);

    const { getActivePlan } = await import("@/services/plan");
    const result = await getActivePlan("user-1");

    expect(result).toEqual(mockPlan);
  });

  it("getActivePlan returns null when no plan found", async () => {
    const chain = mockSupabaseChain(null);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue(chain),
    } as never);

    const { getActivePlan } = await import("@/services/plan");
    const result = await getActivePlan("user-1");

    expect(result).toBeNull();
  });

  it("unlockNextDay does nothing for day 30+", async () => {
    const chain = mockSupabaseChain(null);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue(chain),
    } as never);

    const { unlockNextDay } = await import("@/services/plan");
    await unlockNextDay("plan-1", 30);

    expect(chain.update).not.toHaveBeenCalled();
  });

  it("unlockNextDay updates next day to available", async () => {
    const chain = mockSupabaseChain(null);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue(chain),
    } as never);

    const { unlockNextDay } = await import("@/services/plan");
    await unlockNextDay("plan-1", 5);

    expect(chain.update).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("day_number", 6);
  });

  it("completePlanDay only completes available days", async () => {
    const chain = mockSupabaseChain(null);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue(chain),
    } as never);

    const { completePlanDay } = await import("@/services/plan");
    await completePlanDay("day-1");

    expect(chain.update).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("status", "available");
  });
});

describe("workout service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getSession returns workout session", async () => {
    const mockSession = { id: "sess-1", status: "in_progress" };
    const chain = mockSupabaseChain(mockSession);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue(chain),
    } as never);

    const { getSession } = await import("@/services/workout");
    const result = await getSession("sess-1");

    expect(result).toEqual(mockSession);
  });

  it("getSession returns null when not found", async () => {
    const chain = mockSupabaseChain(null);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue(chain),
    } as never);

    const { getSession } = await import("@/services/workout");
    const result = await getSession("nonexistent");

    expect(result).toBeNull();
  });

  it("getIncompleteSession queries with in_progress status", async () => {
    const chain = mockSupabaseChain(null);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue(chain),
    } as never);

    const { getIncompleteSession } = await import("@/services/workout");
    await getIncompleteSession("user-1", "workout-1");

    expect(chain.eq).toHaveBeenCalledWith("status", "in_progress");
  });

  it("skipExerciseSession updates status to skipped", async () => {
    const chain = mockSupabaseChain(null);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue(chain),
    } as never);

    const { skipExerciseSession } = await import("@/services/workout");
    await skipExerciseSession("ex-sess-1");

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "skipped" })
    );
  });

  it("completeWorkoutSession updates status and duration", async () => {
    const chain = mockSupabaseChain(null);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue(chain),
    } as never);

    const { completeWorkoutSession } = await import("@/services/workout");
    await completeWorkoutSession("sess-1", 3600, 175);

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        duration_seconds: 3600,
        estimated_calories: 175,
      })
    );
  });
});

describe("discover service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getDiscoverWorkouts returns active workouts with exercises", async () => {
    const mockWorkouts = [
      { id: "w1", name: "Workout A", workout_exercises: [{ id: "we1" }] },
      { id: "w2", name: "Workout B", workout_exercises: [{ id: "we2" }] },
    ];
    const chain = mockSupabaseChain(mockWorkouts);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue(chain),
    } as never);

    const { getDiscoverWorkouts } = await import("@/services/discover");
    const result = await getDiscoverWorkouts();

    expect(result).toEqual([
      { id: "w1", name: "Workout A" },
      { id: "w2", name: "Workout B" },
    ]);
    expect(chain.eq).toHaveBeenCalledWith("is_active", true);
  });

  it("getDiscoverWorkouts hides workouts that have no exercises", async () => {
    const chain = mockSupabaseChain([
      { id: "w1", name: "Real Workout", workout_exercises: [{ id: "we1" }] },
      { id: "wEmpty", name: "Empty Shell", workout_exercises: [] },
    ]);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue(chain),
    } as never);

    const { getDiscoverWorkouts } = await import("@/services/discover");
    const result = await getDiscoverWorkouts();

    expect(result.map((w) => w.id)).toEqual(["w1"]);
  });
});

describe("onboarding service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getProfile returns profile data", async () => {
    const mockProfile = { id: "p1", user_id: "u1", full_name: "Test" };
    const chain = mockSupabaseChain(mockProfile);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue(chain),
    } as never);

    const { getProfile } = await import("@/services/onboarding");
    const result = await getProfile("u1");

    expect(result).toEqual(mockProfile);
  });

  it("getProfile returns null on error", async () => {
    const chain = mockSupabaseChain(null, { message: "not found" });
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue(chain),
    } as never);

    const { getProfile } = await import("@/services/onboarding");
    const result = await getProfile("u1");

    expect(result).toBeNull();
  });

  it("getLatestWeight queries weight_entries ordered by recorded_at", async () => {
    const mockWeight = { id: "w1", weight_kg: 75 };
    const chain = mockSupabaseChain(mockWeight);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn() },
      from: vi.fn().mockReturnValue(chain),
    } as never);

    const { getLatestWeight } = await import("@/services/onboarding");
    const result = await getLatestWeight("u1");

    expect(result).toEqual(mockWeight);
    expect(chain.order).toHaveBeenCalledWith("recorded_at", { ascending: false });
  });
});
