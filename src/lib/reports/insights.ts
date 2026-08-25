/**
 * Deterministic, explainable report insights.
 *
 * Every sentence is derived from real computed values — no fabricated AI
 * copy. Rules are pure functions so they stay testable and safe.
 */

import type {
  CategoryCount,
  PlanProgressInfo,
  RangeSummary,
  StreakInfo,
  WeightSummary,
} from "./calculate";
import { compareMetric } from "./calculate";

export interface InsightInput {
  rangeLabel: string;
  summary: RangeSummary;
  previousSummary: RangeSummary | null;
  streak: StreakInfo;
  topCategory: CategoryCount | null;
  planProgress: PlanProgressInfo | null;
  weight: WeightSummary | null;
}

export interface Insight {
  id: string;
  text: string;
}

/** Build human-readable, data-backed insights. Empty input => []. */
export function buildInsights(input: InsightInput): Insight[] {
  const out: Insight[] = [];
  const { summary, previousSummary, streak } = input;

  if (summary.workouts === 0 && !streak.lastActiveDay) {
    return out; // New user — empty state handles messaging.
  }

  // Workout count this period.
  if (summary.workouts > 0) {
    const unit =
      summary.workouts === 1 ? "workout" : "workouts";
    let text = `You completed ${summary.workouts} ${unit} ${periodPhrase(input.rangeLabel)}.`;

    if (previousSummary && previousSummary.workouts > 0) {
      const cmp = compareMetric(summary.workouts, previousSummary.workouts);
      if (cmp && cmp.delta !== 0) {
        text += ` That is ${cmp.delta > 0 ? "+" : ""}${cmp.delta} vs the previous period.`;
      }
    }
    out.push({ id: "workouts", text });
  }

  // Duration change.
  if (summary.minutes > 0 && previousSummary && previousSummary.minutes > 0) {
    const cmp = compareMetric(summary.minutes, previousSummary.minutes);
    if (cmp && Math.abs(cmp.delta) >= 5) {
      out.push({
        id: "duration",
        text: `You trained ${Math.abs(cmp.delta)} minutes ${
          cmp.delta > 0 ? "more" : "less"
        } than the previous period.`,
      });
    }
  }

  // Active days + consistency.
  if (summary.activeDays > 1) {
    out.push({
      id: "activeDays",
      text: `You were active on ${summary.activeDays} different day${
        summary.activeDays === 1 ? "" : "s"
      } ${periodPhrase(input.rangeLabel)}.`,
    });
  }

  // Streak.
  if (streak.current >= 2) {
    out.push({
      id: "streak",
      text: `You are on a ${streak.current}-day streak — longest ever: ${streak.longest}.`,
    });
  }

  // Favorite category.
  if (input.topCategory && input.topCategory.count > 0) {
    out.push({
      id: "category",
      text: `${input.topCategory.label} leads your training with ${input.topCategory.count} session${
        input.topCategory.count === 1 ? "" : "s"
      }.`,
    });
  }

  // Plan progress.
  if (input.planProgress && input.planProgress.totalDays > 0) {
    const p = input.planProgress;
    if (p.finished) {
      out.push({
        id: "plan",
        text: `Plan complete — all ${p.totalDays} days crushed. Start a new challenge to keep momentum.`,
      });
    } else {
      out.push({
        id: "plan",
        text: `Plan progress: day ${p.nextDayNumber ?? p.completedDays} of ${p.totalDays} (${p.percent}%).`,
      });
    }
  }

  // Weight movement (no health claims).
  if (input.weight && Math.abs(input.weight.totalChange) >= 0.1) {
    out.push({
      id: "weight",
      text: `Your weight has moved ${
        input.weight.totalChange > 0 ? "+" : ""
      }${input.weight.totalChange} kg since your first entry.`,
    });
  }

  return out.slice(0, 5);
}

function periodPhrase(rangeLabel: string): string {
  const lower = rangeLabel.toLowerCase();
  if (lower === "today") return "today";
  if (lower === "all time") return "in total";
  return lower.startsWith("this") ? lower : `in the last ${lower.replace("last ", "")}`;
}
