import { describe, it, expect } from "vitest";
import {
  evaluateAchievements,
  getAchievement,
  achievementProgress,
  ACHIEVEMENTS,
  type AchievementStats,
} from "@/lib/personalization/achievements";

function stats(overrides: Partial<AchievementStats> = {}): AchievementStats {
  return {
    totalCompletedWorkouts: 0,
    currentStreak: 0,
    totalCalories: 0,
    totalMinutes: 0,
    plansCompleted: 0,
    ...overrides,
  };
}

describe("evaluateAchievements", () => {
  it("returns nothing for a brand-new user", () => {
    expect(evaluateAchievements(stats())).toEqual([]);
  });

  it("awards first workout after one completion", () => {
    expect(evaluateAchievements(stats({ totalCompletedWorkouts: 1 }))).toEqual([
      "first_workout",
    ]);
  });

  it("awards the 7-day streak only at 7+ days", () => {
    expect(evaluateAchievements(stats({ currentStreak: 6 }))).not.toContain("streak_7");
    expect(evaluateAchievements(stats({ currentStreak: 7 }))).toContain("streak_7");
  });

  it("awards thresholds exactly", () => {
    const s = stats({
      totalCompletedWorkouts: 10,
      totalCalories: 1000,
      totalMinutes: 60,
    });
    const keys = evaluateAchievements(s);
    expect(keys).toEqual(
      expect.arrayContaining(["workouts_10", "calories_1000", "minutes_60"])
    );
    expect(keys).not.toContain("plan_complete");
  });

  it("awards plan completion", () => {
    expect(evaluateAchievements(stats({ plansCompleted: 1 }))).toContain(
      "plan_complete"
    );
  });

  it("awards everything at extreme values", () => {
    const keys = evaluateAchievements(
      stats({
        totalCompletedWorkouts: 500,
        currentStreak: 100,
        totalCalories: 50_000,
        totalMinutes: 5_000,
        plansCompleted: 3,
      })
    );
    expect(keys).toHaveLength(ACHIEVEMENTS.length);
  });
});

describe("definitions", () => {
  it("has unique keys and non-empty metadata", () => {
    const keys = new Set(ACHIEVEMENTS.map((a) => a.key));
    expect(keys.size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(0);
      expect(getAchievement(a.key)).toBeDefined();
    }
  });
});

describe("evaluateAchievements — extended tiers", () => {
  it("awards the 3-day streak only at 3+ days", () => {
    expect(evaluateAchievements(stats({ currentStreak: 2 }))).not.toContain("streak_3");
    expect(evaluateAchievements(stats({ currentStreak: 3 }))).toContain("streak_3");
  });

  it("awards 14-day, 25-workout and 50-workout tiers", () => {
    const keys = evaluateAchievements(
      stats({ currentStreak: 14, totalCompletedWorkouts: 25 })
    );
    expect(keys).toContain("streak_14");
    expect(keys).toContain("workouts_25");
    expect(keys).not.toContain("workouts_50");
  });

  it("awards calories_5000 and minutes_600 exactly at thresholds", () => {
    const keys = evaluateAchievements(
      stats({ totalCalories: 5000, totalMinutes: 600 })
    );
    expect(keys).toContain("calories_5000");
    expect(keys).toContain("minutes_600");
  });
});

describe("achievementProgress", () => {
  it("returns null for unknown keys", () => {
    expect(achievementProgress("nope", stats())).toBeNull();
  });

  it("computes clamped percent toward the target", () => {
    const p = achievementProgress("workouts_10", stats({ totalCompletedWorkouts: 7 }))!;
    expect(p.current).toBe(7);
    expect(p.target).toBe(10);
    expect(p.percent).toBe(70);
    expect(p.unlocked).toBe(false);
  });

  it("marks unlocked without exceeding 100%", () => {
    const p = achievementProgress("calories_1000", stats({ totalCalories: 4321 }))!;
    expect(p.unlocked).toBe(true);
    expect(p.percent).toBe(100);
  });

  it("is zero-safe", () => {
    const p = achievementProgress("streak_7", stats())!;
    expect(p.percent).toBe(0);
    expect(p.unlocked).toBe(false);
  });
});
