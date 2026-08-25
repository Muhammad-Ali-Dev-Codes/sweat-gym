import { describe, it, expect } from "vitest";
import {
  inferGoal,
  scoreWorkouts,
  scoreWorkout,
  DEFAULT_SCORING_WEIGHTS,
  type ScorableWorkout,
  type UserFitnessContext,
} from "@/lib/personalization/scoring";

function ctx(overrides: Partial<UserFitnessContext> = {}): UserFitnessContext {
  return {
    fitnessLevel: "beginner",
    goal: "fat_burning",
    preferredDurationSeconds: 600,
    favoriteWorkoutIds: new Set<string>(),
    recentCompletedWorkoutIds: [],
    ...overrides,
  };
}

const w = (
  id: string,
  opts: Partial<ScorableWorkout> = {}
): ScorableWorkout => ({
  id,
  duration_seconds: 600,
  categories: [],
  level: "beginner",
  ...opts,
});

describe("inferGoal", () => {
  it("maps weight loss to fat burning", () => {
    expect(inferGoal(80, 72)).toBe("fat_burning");
  });

  it("maps maintenance to general", () => {
    expect(inferGoal(70, 70)).toBe("general");
    expect(inferGoal(70, 71)).toBe("general"); // within 2% band
  });

  it("never maps a gain direction to a gain goal (weight-loss only product)", () => {
    // Target above current is rejected upstream (§10); if legacy data slips
    // through, the engine must treat it as a non-loss fitness goal.
    expect(inferGoal(60, 66)).toBe("general");
  });

  it("falls back to general for missing data", () => {
    expect(inferGoal(null, 70)).toBe("general");
    expect(inferGoal(70, null)).toBe("general");
    expect(inferGoal(0, 70)).toBe("general");
  });
});

describe("scoreWorkouts — level matching", () => {
  const catalog = [
    w("beginner-exact", { level: "beginner" }),
    w("advanced-far", { level: "advanced" }),
  ];

  it("prefers the user's exact level", () => {
    const ranked = scoreWorkouts(catalog, ctx({ fitnessLevel: "beginner" }));
    expect(ranked[0].item.id).toBe("beginner-exact");
    expect(ranked[1].breakdown.levelMatch).toBe(0);
  });

  it("treats unknown workout level as a mild fit, not a hard zero", () => {
    const ranked = scoreWorkouts([w("mystery", { level: null })], ctx());
    expect(ranked[0].breakdown.levelMatch).toBeGreaterThan(0);
  });

  it("adjacent levels still score partially", () => {
    const ranked = scoreWorkouts([w("intermediate", { level: "intermediate" })], ctx());
    expect(ranked[0].breakdown.levelMatch).toBe(
      DEFAULT_SCORING_WEIGHTS.levelMatch * 0.4
    );
  });
});

describe("scoreWorkouts — duration matching", () => {
  it("prefers workouts close to the preferred duration", () => {
    const ranked = scoreWorkouts(
      [w("short", { duration_seconds: 300 }), w("fit", { duration_seconds: 600 }), w("long", { duration_seconds: 1800 })],
      ctx({ preferredDurationSeconds: 600 })
    );
    expect(ranked[0].item.id).toBe("fit");
    // A 30-min workout is heavily penalized for a 10-min user.
    const longScore = ranked.find((r) => r.item.id === "long")!;
    expect(longScore.breakdown.durationMatch).toBeLessThan(
      DEFAULT_SCORING_WEIGHTS.durationMatch * 0.7
    );
  });
});

describe("scoreWorkouts — goal matching", () => {
  it("rewards primary category match with full weight", () => {
    const ranked = scoreWorkouts(
      [w("cardio", { categories: ["fat_burning"] }), w("warmup", { categories: ["stretching_and_warmup"] })],
      ctx({ goal: "fat_burning" })
    );
    expect(ranked[0].item.id).toBe("cardio");
    expect(ranked[0].breakdown.goalMatch).toBe(DEFAULT_SCORING_WEIGHTS.goalMatch);
    expect(ranked[1].breakdown.goalMatch).toBe(
      DEFAULT_SCORING_WEIGHTS.goalMatch * 0.5
    );
  });

  it("different goals produce different rankings for the same catalog", () => {
    const catalog = [
      w("hiit", { categories: ["fat_burning"] }),
      w("strength", { categories: ["strength_and_tone"] }),
    ];

    const fatLoss = scoreWorkouts(catalog, ctx({ goal: "fat_burning" }));
    const strength = scoreWorkouts(catalog, ctx({ goal: "strength" }));

    expect(fatLoss[0].item.id).toBe("hiit");
    expect(strength[0].item.id).toBe("strength");
  });
});

describe("scoreWorkouts — history signals", () => {
  it("favorites get a boost", () => {
    const base = scoreWorkouts([w("a"), w("b")], ctx());
    const faved = scoreWorkouts([w("a"), w("b")], ctx({
      favoriteWorkoutIds: new Set(["a"]),
    }));

    const aBase = base.find((r) => r.item.id === "a")!.score;
    const aFaved = faved.find((r) => r.item.id === "a")!.score;
    expect(aFaved - aBase).toBeCloseTo(DEFAULT_SCORING_WEIGHTS.favoriteSignal);
  });

  it("recently completed workouts are penalized (repetition penalty)", () => {
    const ranked = scoreWorkouts(
      [w("recent"), w("fresh")],
      ctx({ recentCompletedWorkoutIds: ["recent"] })
    );
    expect(ranked[0].item.id).toBe("fresh");
    const recent = ranked.find((r) => r.item.id === "recent")!;
    expect(recent.breakdown.repetitionPenalty).toBeGreaterThan(0);
    expect(recent.breakdown.noveltyBonus).toBe(0);
  });

  it("never-completed workouts receive the novelty bonus", () => {
    const ranked = scoreWorkouts([w("brand-new")], ctx());
    expect(ranked[0].breakdown.noveltyBonus).toBe(DEFAULT_SCORING_WEIGHTS.noveltyBonus);
  });
});

describe("scoreWorkout — clamping and stability", () => {
  it("never returns a negative total even with maximal penalties", () => {
    const b = scoreWorkout(
      w("old-news", {
        duration_seconds: 3600,
        level: "advanced",
      }),
      ctx({
        fitnessLevel: "beginner",
        preferredDurationSeconds: 300,
        recentCompletedWorkoutIds: ["old-news"],
      })
    );
    expect(b.total).toBeGreaterThanOrEqual(0);
  });

  it("is deterministic for identical inputs", () => {
    const c = ctx();
    const s1 = scoreWorkouts([w("x"), w("y")], c);
    const s2 = scoreWorkouts([w("x"), w("y")], ctx(c));
    expect(s1.map((s) => [s.item.id, s.score])).toEqual(
      s2.map((s) => [s.item.id, s.score])
    );
  });
});
