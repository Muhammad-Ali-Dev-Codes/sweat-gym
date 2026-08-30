import { describe, it, expect } from "vitest";
import {
  summarizeSessions,
  dailyActivity,
  weeklyActivity,
  monthlySeries,
  categoryDistribution,
  levelDistribution,
  weightSummary,
  planProgress,
  compareMetric,
  streakInfo,
  EMPTY_SUMMARY,
  sumEstimatedCalories,
} from "@/lib/reports/calculate";

const TZ = "UTC";

function session(
  id: string,
  completedAt: string,
  minutes = 10,
  calories = 50,
  extra: Record<string, unknown> = {}
) {
  return {
    id,
    workout_id: `w-${id}`,
    completed_at: completedAt,
    duration_seconds: minutes * 60,
    estimated_calories: calories,
    source: "plan",
    ...extra,
  };
}

const RANGE_WEEK = {
  key: "last7Days" as const,
  startDayKey: "2026-08-16",
  endDayKey: "2026-08-22",
  days: 7,
};

describe("sumEstimatedCalories", () => {
  it("matches the report summary total across all sessions", () => {
    const sessions = [
      session("a", "2026-08-17T09:00:00Z", 20, 100),
      session("b", "2026-08-18T14:00:00Z", 30, 150),
      session("c", "2026-08-18T18:00:00Z", 10, 50),
      session("d", "2026-08-19T10:00:00Z", 25, 311),
    ];

    const allTime = summarizeSessions(
      sessions,
      { key: "allTime", startDayKey: null, endDayKey: "2026-08-19", days: null },
      TZ
    );

    expect(sumEstimatedCalories(sessions)).toBe(611);
    expect(allTime.calories).toBe(611);
  });
});

describe("summarizeSessions", () => {
  it("returns the zero summary for no workouts (no NaN)", () => {
    expect(summarizeSessions([], RANGE_WEEK, TZ)).toEqual(EMPTY_SUMMARY);
    expect(summarizeSessions([], RANGE_WEEK, TZ).avgMinutes).toBe(0);
    expect(summarizeSessions([], RANGE_WEEK, TZ).shortestSessionMinutes).toBeNull();
  });

  it("sums one workout correctly", () => {
    const s = summarizeSessions(
      [session("a", "2026-08-20T10:00:00Z", 25, 200)],
      RANGE_WEEK,
      TZ
    );
    expect(s).toMatchObject({
      workouts: 1,
      minutes: 25,
      calories: 200,
      activeDays: 1,
      avgMinutes: 25,
      longestSessionMinutes: 25,
      shortestSessionMinutes: 25,
    });
  });

  it("aggregates multiple workouts across days and scopes by range", () => {
    const sessions = [
      session("a", "2026-08-17T09:00:00Z", 20, 100),
      session("b", "2026-08-18T14:00:00Z", 30, 150),
      session("same-day", "2026-08-18T18:00:00Z", 10, 50),
      session("old", "2025-01-01T10:00:00Z", 60, 400), // out of range
    ];
    const s = summarizeSessions(sessions, RANGE_WEEK, TZ);
    expect(s.workouts).toBe(3);
    expect(s.minutes).toBe(60);
    expect(s.calories).toBe(300);
    expect(s.activeDays).toBe(2); // same-day double counts once
    expect(s.avgMinutes).toBe(20);
  });

  it("ignores null completed_at rows", () => {
    const s = summarizeSessions(
      [session("ghost", null as unknown as string)],
      { key: "allTime", startDayKey: null, endDayKey: "2026-08-22", days: null },
      TZ
    );
    expect(s.workouts).toBe(0);
  });
});

describe("dailyActivity", () => {
  it("produces one point per day including empty days", () => {
    const points = dailyActivity(
      [session("a", "2026-08-18T10:00:00Z", 15, 80)],
      RANGE_WEEK,
      TZ
    );
    expect(points).toHaveLength(7);
    expect(points.find((p) => p.key === "2026-08-18")).toMatchObject({
      minutes: 15,
      calories: 80,
      count: 1,
    });
    expect(points[0].count).toBe(0);
  });

  it("buckets by local day in non-UTC timezones", () => {
    // 23:30 UTC on Aug 18 is Aug 19 in Tokyo.
    const points = dailyActivity(
      [session("a", "2026-08-18T23:30:00Z")],
      {
        key: "last7Days",
        startDayKey: "2026-08-16",
        endDayKey: "2026-08-19",
        days: 4,
      },
      "Asia/Tokyo"
    );
    expect(points.find((p) => p.key === "2026-08-19")?.count).toBe(1);
    expect(points.find((p) => p.key === "2026-08-18")?.count).toBe(0);
  });
});

describe("weeklyActivity", () => {
  it("aligns buckets to Mondays ending with the current week", () => {
    const points = weeklyActivity(
      [session("a", "2026-08-19T10:00:00Z", 12)],
      4,
      TZ
    );
    expect(points).toHaveLength(4);
    for (const p of points) {
      expect(mondayIndex(p.key)).toBe(0);
    }
    const weekOfAug19 = points.find((p) => p.key === "2026-08-17");
    expect(weekOfAug19?.minutes).toBe(12);
  });
});

function mondayIndex(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

describe("monthlySeries", () => {
  it("buckets months chronologically with labels", () => {
    const points = monthlySeries([
      session("a", "2026-06-02T10:00:00Z", 10),
      session("b", "2026-07-05T10:00:00Z", 20),
      session("c", "2026-07-20T10:00:00Z", 30),
      session("d", "2026-08-01T10:00:00Z", 40),
    ], TZ);
    expect(points.map((p) => p.key)).toEqual(["2026-06", "2026-07", "2026-08"]);
    expect(points[1]).toMatchObject({ workouts: 2, minutes: 50 });
  });

  it("is empty without history", () => {
    expect(monthlySeries([], TZ)).toEqual([]);
  });
});

describe("distributions", () => {
  const meta = [
    session("a", "2026-08-18T10:00:00Z", 20, 0, {
      categories: [{ name: "Fat Burning", slug: "fat_burning" }],
      level: "beginner",
    }),
    session("b", "2026-08-19T10:00:00Z", 10, 0, {
      categories: [{ name: "Strength & Tone", slug: "strength_and_tone" }],
      level: "intermediate",
    }),
    session("c", "2026-08-20T10:00:00Z", 30, 0, {
      categories: [
        { name: "Strength & Tone", slug: "strength_and_tone" },
        { name: "Fat Burning", slug: "fat_burning" },
      ],
      level: "beginner",
    }),
  ];

  it("counts categories with minutes, sorted desc with deterministic ties", () => {
    const dist = categoryDistribution(meta, RANGE_WEEK, TZ);
    expect(dist[0]).toMatchObject({ slug: "fat_burning", count: 2, minutes: 50 });
    expect(dist[1]).toMatchObject({ slug: "strength_and_tone", count: 2, minutes: 40 });
  });

  it("orders levels beginner→advanced and skips missing", () => {
    const levels = levelDistribution(meta, RANGE_WEEK, TZ);
    expect(levels.map((l) => l.slug)).toEqual(["beginner", "intermediate"]);
    expect(levels[0].count).toBe(2);
  });

  it("empty range yields empty arrays (zero-safe)", () => {
    expect(categoryDistribution([], RANGE_WEEK, TZ)).toEqual([]);
    expect(levelDistribution([], RANGE_WEEK, TZ)).toEqual([]);
  });
});

describe("weightSummary", () => {
  it("null for no entries", () => {
    expect(weightSummary([], 70)).toBeNull();
  });

  it("single entry is flat with no change", () => {
    const w = weightSummary([{ recorded_at: "2026-08-01T10:00:00Z", weight_kg: 80 }], 75)!;
    expect(w.startWeight).toBe(80);
    expect(w.currentWeight).toBe(80);
    expect(w.totalChange).toBe(0);
    expect(w.direction).toBe("flat");
  });

  it("computes decrease and remaining to target", () => {
    const w = weightSummary(
      [
        { recorded_at: "2026-07-01T10:00:00Z", weight_kg: 85 },
        { recorded_at: "2026-08-01T10:00:00Z", weight_kg: 82.5 },
        { recorded_at: "2026-08-20T10:00:00Z", weight_kg: 83.2 },
      ],
      78
    )!;
    expect(w.currentWeight).toBe(83.2); // newest wins even if unordered input
    expect(w.totalChange).toBe(-1.8);
    expect(w.direction).toBe("down");
    expect(w.remainingToTarget).toBe(5.2);
    expect(w.entries).toHaveLength(3);
  });
});

describe("planProgress", () => {
  it("zero-safe for no plan", () => {
    expect(planProgress([])).toEqual({
      completedDays: 0,
      totalDays: 0,
      percent: 0,
      nextDayNumber: null,
      finished: false,
    });
  });

  it("day N of M with percent clamped to 100", () => {
    const days = Array.from({ length: 30 }, (_, i) => ({
      status: i < 8 ? "completed" : i === 8 ? "available" : "locked",
      day_number: i + 1,
    }));
    const p = planProgress(days);
    expect(p.completedDays).toBe(8);
    expect(p.percent).toBe(27);
    expect(p.nextDayNumber).toBe(9);
    expect(p.finished).toBe(false);
  });

  it("finished when every day completed", () => {
    const p = planProgress([
      { status: "completed", day_number: 1 },
      { status: "completed", day_number: 2 },
    ]);
    expect(p.finished).toBe(true);
    expect(p.percent).toBe(100);
  });
});

describe("compareMetric", () => {
  it("rejects meaningless comparisons against zero history", () => {
    expect(compareMetric(3, 0)).toBeNull();
  });

  it("reports direction and delta", () => {
    expect(compareMetric(4, 3)).toEqual({ delta: 1, direction: "up" });
    expect(compareMetric(3, 4)).toEqual({ delta: -1, direction: "down" });
    expect(compareMetric(3, 3)).toEqual({ delta: 0, direction: "flat" });
  });
});

describe("streakInfo", () => {
  it("empty history", () => {
    expect(streakInfo([], TZ)).toEqual({
      current: 0,
      longest: 0,
      lastActiveDay: null,
      milestones: [],
    });
  });

  it("consecutive days + multiple workouts same day count once (clock-safe)", () => {
    const info = streakInfo(
      [
        "2024-03-10T09:00:00Z",
        "2024-03-11T09:00:00Z",
        "2024-03-11T18:00:00Z",
        "2024-03-12T09:00:00Z",
      ],
      TZ
    );
    expect(info.longest).toBe(3);
    expect(info.lastActiveDay).toBe("2024-03-12");
    expect(info.milestones).toContain(3);
  });
});
