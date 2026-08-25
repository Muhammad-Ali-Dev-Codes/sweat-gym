"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { formatMinutes } from "@/lib/duration";
import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Clock, Dumbbell, Flame, Zap, CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  dailyActivity,
  levelDistribution,
  categoryDistribution,
  monthlySeries,
  planProgress,
  streakInfo,
  summarizeSessions,
  weeklyActivity,
  weightSummary,
  compareMetric,
} from "@/lib/reports/calculate";
import {
  REPORT_RANGE_OPTIONS,
  previousReportRange,
  reportRangeLabel,
  resolveReportRange,
  type ReportRangeKey,
} from "@/lib/reports/ranges";
import { buildInsights } from "@/lib/reports/insights";
import {
  planningEquivalentKg,
  recognizedExerciseKcalByDay,
} from "@/lib/weight-loss";
import { getLocalDayKey } from "@/lib/dates";
import type { ReportsData } from "@/services/reports";
import { StreakCard } from "./streak-card";
import { PlanProgressCard } from "./plan-progress-card";
import { InsightsCard } from "./insights-card";
import { AchievementsGallery } from "./achievements-gallery";

// Chart-heavy surfaces load lazily: recharts is split into its own chunk
// and fetched only when these render (client-only), keeping the reports
// route's initial JS lean.
const CHART_SKELETON = "animate-pulse rounded-xl bg-muted";
function ChartSkeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn(CHART_SKELETON, className)} />;
}

const MinutesChart = dynamic(
  () => import("./activity-charts").then((m) => m.MinutesChart),
  { ssr: false, loading: () => <ChartSkeleton className="h-56 w-full sm:h-64" /> }
);
const CaloriesChart = dynamic(
  () => import("./activity-charts").then((m) => m.CaloriesChart),
  { ssr: false, loading: () => <ChartSkeleton className="h-52 w-full sm:h-56" /> }
);
const CategoryAnalyticsCard = dynamic(
  () => import("./category-analytics-card").then((m) => m.CategoryAnalyticsCard),
  { ssr: false, loading: () => <ChartSkeleton className="h-72 w-full" /> }
);
const WeightProgressCard = dynamic(
  () => import("./weight-progress-card").then((m) => m.WeightProgressCard),
  { ssr: false, loading: () => <ChartSkeleton className="h-80 w-full" /> }
);

type ReportsClientProps = {
  data: ReportsData;
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 260, damping: 24 },
  },
};

export function ReportsClient({ data }: ReportsClientProps) {
  const { sessions, weights, targetWeight, timeZone, planDays, plansCompleted, earnedAchievements } =
    data;

  const [rangeKey, setRangeKey] = useState<ReportRangeKey>("thisWeek");

  // ---- Centralized calculations (lib/reports) -----------------------------
  const range = useMemo(
    () => resolveReportRange(rangeKey, timeZone),
    [rangeKey, timeZone]
  );
  const prevRange = useMemo(() => previousReportRange(range), [range]);

  const summary = useMemo(
    () => summarizeSessions(sessions, range, timeZone),
    [sessions, range, timeZone]
  );
  const prevSummary = useMemo(
    () => (prevRange ? summarizeSessions(sessions, prevRange, timeZone) : null),
    [sessions, prevRange, timeZone]
  );

  const allTime = useMemo(
    () => summarizeSessions(sessions, { key: "allTime", startDayKey: null, endDayKey: range.endDayKey, days: null }, timeZone),
    [sessions, range.endDayKey, timeZone]
  );

  const timestamps = useMemo(
    () =>
      sessions
        .map((s) => s.completed_at)
        .filter((d): d is string => Boolean(d)),
    [sessions]
  );
  const streak = useMemo(() => streakInfo(timestamps, timeZone), [timestamps, timeZone]);

  const categories = useMemo(
    () => categoryDistribution(sessions, range, timeZone),
    [sessions, range, timeZone]
  );
  const levels = useMemo(
    () => levelDistribution(sessions, range, timeZone),
    [sessions, range, timeZone]
  );

  const plan = useMemo(() => planProgress(planDays), [planDays]);

  const weight = useMemo(
    () => weightSummary(weights, targetWeight, timeZone),
    [weights, targetWeight, timeZone]
  );

  // §3/§6/§12 Planning equivalent — computed from PER-DAY CAPPED exercise
  // energy (1,000 kcal/day recognition cap). This is a rough planning
  // estimate, NOT actual fat loss: exercise calories are not total
  // expenditure and not an energy deficit. Actual weight is tracked
  // separately in the Weight Progress card.
  const planningEquivalent = useMemo(() => {
    const byDay = recognizedExerciseKcalByDay(sessions, (completedAt) =>
      getLocalDayKey(completedAt, timeZone)
    );
    const totalRecognized = [...byDay.values()].reduce((a, b) => a + b, 0);
    return planningEquivalentKg(totalRecognized);
  }, [sessions, timeZone]);

  const insights = useMemo(
    () =>
      buildInsights({
        rangeLabel: reportRangeLabel(rangeKey),
        summary,
        previousSummary: prevSummary,
        streak,
        topCategory: categories[0] ?? null,
        planProgress: plan.totalDays > 0 ? plan : null,
        weight,
      }),
    [rangeKey, summary, prevSummary, streak, categories, plan, weight]
  );

  // Chart series adapt to the window size and share one normalized row shape.
  type ActivityPoint = {
    key: string;
    label: string;
    minutes: number;
    calories: number;
    count: number;
  };
  const chartData = useMemo<ActivityPoint[]>(() => {
    if (range.key === "allTime") {
      return monthlySeries(sessions, timeZone).map((p) => ({
        key: p.key,
        label: p.label,
        minutes: p.minutes,
        calories: p.calories,
        count: p.workouts,
      }));
    }
    if (range.key === "last90Days") return weeklyActivity(sessions, 13, timeZone);
    return dailyActivity(sessions, range, timeZone);
  }, [range, sessions, timeZone]);

  const achievementStats = {
    totalCompletedWorkouts: allTime.workouts,
    currentStreak: streak.current,
    totalCalories: allTime.calories,
    totalMinutes: allTime.minutes,
    plansCompleted,
  };
  const earnedMap = useMemo(
    () => new Map(earnedAchievements.map((a) => [a.key, a.earned_at])),
    [earnedAchievements]
  );

  const workoutsComparison =
    prevSummary && prevSummary.workouts > 0 && summary.workouts !== prevSummary.workouts
      ? compareMetric(summary.workouts, prevSummary.workouts)
      : null;
  const minutesComparison =
    prevSummary && prevSummary.minutes > 0 && summary.minutes !== prevSummary.minutes
      ? compareMetric(summary.minutes, prevSummary.minutes)
      : null;
  const caloriesComparison =
    prevSummary && prevSummary.calories > 0 && summary.calories !== prevSummary.calories
      ? compareMetric(summary.calories, prevSummary.calories)
      : null;

  const isEmpty = sessions.length === 0;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="font-[family-name:var(--font-geist-sans)]"
    >
      <motion.div variants={item}>
        <PageHeader
          title="Reports"
          subtitle="Your training performance and body progress over time."
          action={
            <div
              role="tablist"
              aria-label="Date range"
              className="no-scrollbar -mx-4 flex max-w-full items-center overflow-x-auto rounded-full border border-border bg-card p-1 shadow-sm sm:mx-0"
            >
              {REPORT_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  role="tab"
                  aria-selected={rangeKey === opt.value}
                  onClick={() => setRangeKey(opt.value)}
                  className={cn(
                    "relative shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    rangeKey === opt.value
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {rangeKey === opt.value && (
                    <motion.span
                      layoutId="reports-range-pill"
                      className="absolute inset-0 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative">{opt.label}</span>
                </button>
              ))}
            </div>
          }
        />
      </motion.div>

      {isEmpty ? (
        <motion.div variants={item}>
          <EmptyState
            icon={Dumbbell}
            title="Your fitness journey starts here"
            description="Complete your first workout — or start your personalized plan — and this dashboard will fill up with real stats, streaks, and trends."
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/plan"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/30 transition-transform hover:scale-[1.03] active:scale-95"
                >
                  <Zap className="size-4 fill-white" aria-hidden />
                  Start Your Plan
                </Link>
                <Link
                  href="/discover"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
                >
                  Browse Workouts
                </Link>
              </div>
            }
            className="mt-8"
          />
          {/* Weight logging still available for brand-new users */}
          <div className="mt-6 grid grid-cols-1">
            <WeightProgressCard summary={weight} />
          </div>
        </motion.div>
      ) : (
        <>
          {/* Summary stats */}
          <section
            aria-label={`Summary for ${reportRangeLabel(rangeKey)}`}
            className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
          >
            <motion.div variants={item}>
              <StatCard
                label={`Workouts · ${reportRangeLabel(rangeKey)}`}
                value={<AnimatedNumber value={summary.workouts} />}
                icon={Dumbbell}
                color="purple"
                trend={
                  workoutsComparison
                    ? (workoutsComparison.direction as "up" | "down")
                    : undefined
                }
              />
            </motion.div>
            <motion.div variants={item}>
              <StatCard
                label={`Calories · ${reportRangeLabel(rangeKey)}`}
                value={<AnimatedNumber value={summary.calories} />}
                icon={Zap}
                color="pink"
              />
            </motion.div>
            <motion.div variants={item}>
              <StatCard
                label={`Time · ${reportRangeLabel(rangeKey)}`}
                value={<AnimatedNumber value={summary.minutes} suffix="min" />}
                icon={Clock}
                color="blue"
              />
            </motion.div>
            <motion.div variants={item}>
              <StatCard
                label="Day Streak"
                value={<AnimatedNumber value={streak.current} />}
                icon={Flame}
                color="orange"
              />
            </motion.div>
          </section>

          {/* Comparison line */}
          {(workoutsComparison || minutesComparison || caloriesComparison) && (
            <motion.p
              variants={item}
              className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-medium text-muted-foreground"
              aria-label="Change vs previous period"
            >
              <span className="font-bold uppercase tracking-wider">vs previous period:</span>
              {workoutsComparison && cmpDelta(workoutsComparison.delta)}
              {minutesComparison && cmpDelta(minutesComparison.delta, "min")}
              {caloriesComparison && cmpDelta(caloriesComparison.delta, "kcal")}
            </motion.p>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Activity chart */}
            <motion.section
              variants={item}
              className="titan-card p-5 sm:p-6 lg:col-span-2"
              aria-label="Training activity chart"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <CalendarCheck className="size-4.5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Minutes Trained
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {range.key === "last90Days"
                        ? "Per week"
                        : range.key === "allTime"
                          ? "Per month"
                          : `Per day · ${reportRangeLabel(rangeKey)}`}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold tabular-nums text-secondary-foreground">
                  {summary.activeDays} active{" "}
                  {range.key === "last90Days" || range.key === "allTime" ? "" : "day"}
                  {summary.activeDays === 1 ? "" : "s"} · {formatMinutes(summary.minutes)}
                </span>
              </div>

              <MinutesChart data={chartData} />
            </motion.section>

            {/* Calories chart */}
            <motion.section
              variants={item}
              className="titan-card p-5 sm:p-6"
              aria-label="Calories chart"
            >
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-full bg-energy/10 text-energy">
                  <Flame className="size-4.5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Calorie Trends</h3>
                  <p className="text-xs text-muted-foreground">
                    Estimated burn per{" "}
                    {range.key === "last90Days" ? "week" : range.key === "allTime" ? "month" : "day"}
                  </p>
                </div>
              </div>
              <CaloriesChart data={chartData} />
            </motion.section>

            {/* Workout mix */}
            <motion.div variants={item}>
              <CategoryAnalyticsCard categories={categories} levels={levels} />
            </motion.div>

            {/* Streak + Plan progress side by side */}
            <motion.div variants={item}>
              <StreakCard streak={streak} timeZone={timeZone} />
            </motion.div>
            <motion.div variants={item}>
              <PlanProgressCard plan={plan.totalDays > 0 ? plan : null} />
            </motion.div>

            {/* Insights */}
            <motion.div variants={item}>
              <InsightsCard insights={insights} />
            </motion.div>

            {/* Weight progress + history + log form */}
            <motion.div variants={item} className="lg:col-span-2">
              <WeightProgressCard summary={weight} />
            </motion.div>

            {/* All-time totals */}
            <motion.section
              variants={item}
              className="titan-hero relative overflow-hidden rounded-2xl p-5 shadow-lg shadow-black/10 sm:p-6 lg:col-span-2"
              aria-label="All-time totals"
            >
              <div className="relative grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-white/10">
                <HeroStat label="All-time workouts" value={allTime.workouts} />
                <HeroStat label="Calories burned" value={allTime.calories} energy />
                <HeroStat label="Longest streak" value={streak.longest} suffix="days" />
                <HeroStat label="Avg session" value={formatMinutes(allTime.avgMinutes)} />
              </div>
              {planningEquivalent > 0 && (
                <p className="relative mt-4 text-xs font-medium text-zinc-400">
                  Estimated planning equivalent:{" "}
                  <span className="font-bold text-white tabular-nums">
                    ~{planningEquivalent.toFixed(1)} kg
                  </span>{" "}
                  — planning estimate only (7,700 kcal ≈ 1 kg, exercise energy
                  capped at 1,000 kcal/day). Actual weight change varies; see
                  your weigh-in history for real progress.
                </p>
              )}
            </motion.section>
          </div>

          {/* Achievements gallery */}
          <motion.div variants={item} className="mt-10">
            <AchievementsGallery stats={achievementStats} earned={earnedMap} />
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

function HeroStat({
  label,
  value,
  suffix,
  energy,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  energy?: boolean;
}) {
  return (
    <div className="sm:px-6 sm:first:pl-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p
        className={cn(
          "mt-2 text-3xl font-extrabold tabular-nums",
          energy ? "text-energy" : "text-white"
        )}
      >
        {typeof value === "number" ? (
          <AnimatedNumber value={value} />
        ) : (
          value
        )}
        {suffix && <span className="ml-1 text-base font-bold text-zinc-400">{suffix}</span>}
      </p>
    </div>
  );
}

function cmpDelta(delta: number, unit?: string): ReactNode {
  const up = delta > 0;
  return (
    <span key={`${delta}${unit ?? ""}`} className="inline-flex items-center gap-1">
      <span
        className={cn(
          "font-extrabold tabular-nums",
          up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        )}
      >
        {up ? "+" : ""}
        {delta.toLocaleString()}
        {unit ? ` ${unit}` : ""}
      </span>
      {unit === undefined ? (Math.abs(delta) === 1 ? "workout" : "workouts") : null}
    </span>
  );
}
