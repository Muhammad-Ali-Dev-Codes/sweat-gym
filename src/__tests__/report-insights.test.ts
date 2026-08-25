import { describe, it, expect } from "vitest";
import { buildInsights, type InsightInput } from "@/lib/reports/insights";
import {
  EMPTY_SUMMARY,
  type CategoryCount,
  type PlanProgressInfo,
  type RangeSummary,
} from "@/lib/reports/calculate";

function summary(overrides: Partial<RangeSummary> = {}): RangeSummary {
  return { ...EMPTY_SUMMARY, ...overrides };
}

function input(overrides: Partial<InsightInput> = {}): InsightInput {
  return {
    rangeLabel: "This Week",
    summary: summary(),
    previousSummary: null,
    streak: { current: 0, longest: 0, lastActiveDay: null, milestones: [] },
    topCategory: null,
    planProgress: null,
    weight: null,
    ...overrides,
  };
}

describe("buildInsights", () => {
  it("brand-new users get no insights (empty state handles them)", () => {
    expect(buildInsights(input())).toEqual([]);
  });

  it("counts workouts from real values", () => {
    const out = buildInsights(
      input({ summary: summary({ workouts: 4, minutes: 90 }) })
    );
    expect(out.some((i) => i.text.includes("4 workouts"))).toBe(true);
  });

  it("compares against the previous period only when meaningful", () => {
    const out = buildInsights(
      input({
        summary: summary({ workouts: 4 }),
        previousSummary: summary({ workouts: 3 }),
      })
    );
    expect(out.some((i) => i.text.includes("+1"))).toBe(true);
  });

  it("never fabricates a comparison when previous is empty", () => {
    const out = buildInsights(
      input({
        summary: summary({ workouts: 2 }),
        previousSummary: summary(),
      })
    );
    expect(out.every((i) => !i.text.includes("vs the previous period"))).toBe(true);
  });

  it("reports duration deltas of at least 5 minutes", () => {
    const out = buildInsights(
      input({
        summary: summary({ workouts: 3, minutes: 100 }),
        previousSummary: summary({ workouts: 3, minutes: 65 }),
      })
    );
    expect(out.some((i) => i.text.includes("35 minutes more"))).toBe(true);
  });

  it("mentions active streak", () => {
    const out = buildInsights(
      input({
        summary: summary({ workouts: 1 }),
        streak: { current: 6, longest: 9, lastActiveDay: "2026-08-22", milestones: [3] },
      })
    );
    expect(out.some((i) => i.text.includes("6-day streak"))).toBe(true);
  });

  it("names the leading category", () => {
    const topCategory: CategoryCount = {
      slug: "strength_and_tone",
      label: "Strength & Tone",
      count: 5,
      minutes: 60,
    };
    const out = buildInsights(input({ summary: summary({ workouts: 5 }), topCategory }));
    expect(out.some((i) => i.text.includes("Strength & Tone leads"))).toBe(true);
  });

  it("describes plan progress and completion distinctly", () => {
    const planProgress: PlanProgressInfo = {
      completedDays: 15,
      totalDays: 30,
      percent: 50,
      nextDayNumber: 16,
      finished: false,
    };
    const running = buildInsights(
      input({ summary: summary({ workouts: 1 }), planProgress })
    );
    expect(running.some((i) => i.text.includes("day 16 of 30"))).toBe(true);

    const finished = buildInsights(
      input({
        summary: summary({ workouts: 1 }),
        planProgress: { ...planProgress, finished: true },
      })
    );
    expect(finished.some((i) => i.text.includes("Plan complete"))).toBe(true);
  });

  it("caps output length for a clean UI", () => {
    const out = buildInsights(
      input({
        rangeLabel: "This Month",
        summary: summary({
          workouts: 12,
          minutes: 200,
          calories: 1500,
          activeDays: 10,
        }),
        previousSummary: summary({ workouts: 8, minutes: 120 }),
        streak: { current: 7, longest: 7, lastActiveDay: "2026-08-22", milestones: [3, 7] },
        topCategory: { slug: "fat_burning", label: "Fat Burning", count: 6, minutes: 80 },
        planProgress: { completedDays: 10, totalDays: 30, percent: 33, nextDayNumber: 11, finished: false },
      })
    );
    expect(out.length).toBeLessThanOrEqual(5);
  });
});
