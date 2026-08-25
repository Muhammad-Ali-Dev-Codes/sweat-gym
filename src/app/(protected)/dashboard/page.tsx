import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Flame,
  TrendingUp,
  Clock,
  Dumbbell,
  Target,
  ChevronRight,
  Zap,
  Trophy,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Heart,
  Scale,
} from "lucide-react";
import { formatClock, formatMinutes } from "@/lib/duration";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Reveal } from "@/components/layout/reveal";
import {
  getGatedNextDay,
  getPacingBlockedDayNumber,
  repairPlanProgression,
} from "@/services/plan";
import { cn } from "@/lib/utils";
import { computeStreaks, getLocalDayKey } from "@/lib/dates";
import { RegeneratePlanButton } from "./regenerate-plan-button";
import { RecoverPlanButton } from "@/components/recover-plan-button";
import type { ReactNode } from "react";
import type {
  Profile,
  FitnessProfile,
  UserPlan,
  UserPlanDay,
  WorkoutSession,
  WeightEntry,
} from "@/lib/types/database";

type SessionRow = WorkoutSession & { workouts: { name: string } | null };

/** Display fallback when no plan exists yet; active plans use real length. */
const DEFAULT_PLAN_DAYS = 30;

/** Dashboard "week" strip is a rolling 7-day window ending today. */
const ROLLING_WINDOW_DAYS = 7;

const MOTIVATIONS = [
  "Fresh week, fresh grind. Set the tone.",
  "Small steps daily beat heroic efforts monthly.",
  "Halfway warriors push hardest today.",
  "Momentum is building — don't break the chain.",
  "Finish the week stronger than you started.",
  "Saturday sweat is earned, never given.",
  "Rest is part of the plan. Recovery counts too.",
];

function getGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const WEEKDAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Calendar-day key (YYYY-MM-DD) for an instant, rendered in the member's timezone. */
function dayKeyInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Local hour + weekday index in the member's timezone (not the server clock). */
function localHourAndWeekday(
  date: Date,
  timeZone: string
): { hour: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hour: "numeric",
    weekday: "short",
  }).formatToParts(date);
  const rawHour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const weekday = WEEKDAY_ORDER.indexOf(
    (parts.find((p) => p.type === "weekday")?.value ?? "Sun") as (typeof WEEKDAY_ORDER)[number]
  );
  return { hour: ((rawHour % 24) + 24) % 24, weekday: Math.max(0, weekday) };
}

function getFirstName(fullName: string | undefined): string {
  const first = fullName?.trim().split(/\s+/)[0];
  return first || "Athlete";
}

function computeStreak(sessions: SessionRow[], timeZone: string): number {
  return computeStreaks(
    sessions
      .filter((s) => s.completed_at)
      .map((s) => s.completed_at as string),
    timeZone
  ).current;
}

function buildWeekActivity(sessions: SessionRow[], timeZone: string) {
  const now = new Date();
  const days = Array.from(
    { length: ROLLING_WINDOW_DAYS },
    (_, i) => new Date(now.getTime() - (ROLLING_WINDOW_DAYS - 1 - i) * 86_400_000)
  );

  // Bucket minutes by the user's local calendar day, not the server clock.
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    if (!s.completed_at) continue;
    const key = getLocalDayKey(s.completed_at, timeZone);
    byDay.set(key, (byDay.get(key) ?? 0) + Math.round((s.duration_seconds ?? 0) / 60));
  }

  const minutes = days.map((d) => byDay.get(getLocalDayKey(d, timeZone)) ?? 0);

  const maxMinutes = Math.max(...minutes, 1);
  const sessionCount = days.filter((_, i) => minutes[i] > 0).length;

  return { days, minutes, maxMinutes, sessionCount };
}

function formatSessionDate(completedAt: string, timeZone: string): string {
  const now = new Date();
  const date = new Date(completedAt);
  // Day keys are computed in the member's timezone so the Today/Yesterday
  // boundary follows their local calendar, not the server clock.
  const nowKey = dayKeyInTz(now, timeZone);
  const dateKey = dayKeyInTz(date, timeZone);
  const daysAgo = Math.round(
    (Date.parse(`${nowKey}T00:00:00Z`) - Date.parse(`${dateKey}T00:00:00Z`)) /
      86_400_000
  );

  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone,
  });
}

function StatBlock({
  icon: Icon,
  tone,
  value,
  label,
}: {
  icon: typeof Flame;
  tone: string;
  value: ReactNode;
  label: string;
}) {
  return (
    <div>
      <Icon className={cn("size-5", tone)} aria-hidden />
      <p className="mt-5 text-5xl font-black leading-none tracking-tighter text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const profile = profileData as Profile | null;

  // Fetch the active plan early — used both as an onboarding-loop guard and
  // for the main dashboard rendering below.
  const { data: activePlanResult } = await supabase
    .from("user_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasActivePlan = Boolean(activePlanResult);

  // Redirect to onboarding ONLY when the flag is missing AND no plan exists.
  // If a plan exists, the user completed onboarding (plan generation succeeded)
  // but the completion flag was not persisted — don't trap them in a loop.
  if (!profile?.onboarding_completed_at && !hasActivePlan) redirect("/onboarding");

  const [fpResult, sessionsResult, weightsResult] = await Promise.all([
    supabase.from("fitness_profiles").select("*").eq("user_id", user.id).single(),
    supabase
      .from("workout_sessions")
      .select("id, completed_at, duration_seconds, estimated_calories, workouts(name)")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      // Aligned with the reports/stats caps (1000): keeps rendering bounded
      // for huge histories while covering >3 years of daily training.
      .limit(1000),
    supabase
      .from("weight_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: false })
      .limit(60),
  ]);

  const fitnessProfile = fpResult.data as FitnessProfile | null;
  const plan = activePlanResult as UserPlan | null;
  const sessions = (sessionsResult.data as SessionRow[] | null) ?? [];
  const weights = (weightsResult.data as WeightEntry[] | null) ?? [];

  let planDays: (UserPlanDay & { workouts: { name: string } | null })[] = [];
  let currentDay: (UserPlanDay & { workouts: { name: string } | null }) | null =
    null;
  let completedDays = 0;

  // Heal stalled progression + enforce daily pacing (one workout per day).
  // Await BEFORE reading days so a same-day re-lock is always reflected.
  if (plan) {
    await repairPlanProgression(user.id, profile?.timezone);

    const { data: daysResult } = await supabase
      .from("user_plan_days")
      .select("*, workouts(name)")
      .eq("user_plan_id", plan.id)
      .order("day_number");

    planDays =
      (daysResult as (UserPlanDay & { workouts: { name: string } | null })[] | null) ??
      [];
    // Belt-and-braces: never surface the pacing-blocked day as today's
    // workout, even if a stale read slips past the repair.
    const pacingBlockedDay = getPacingBlockedDayNumber(
      planDays,
      profile?.timezone || "UTC"
    );
    currentDay =
      planDays.find(
        (d) => d.status === "available" && d.day_number !== pacingBlockedDay
      ) ??
      planDays.find(
        (d) => d.status === "in_progress" && d.day_number !== pacingBlockedDay
      ) ??
      planDays[0] ??
      null;
    completedDays = planDays.filter((d) => d.status === "completed").length;
  }

  // ---- Derived stats -------------------------------------------------------
  // profile is guaranteed non-null when onboarding_completed_at is set; it may
  // be null when we arrived via the active-plan fallback, but in that case the
  // profile row must exist (plan generation requires it).
  const firstName = getFirstName(profile?.full_name);
  // Greeting and daily motivation follow the member's local calendar.
  const timeZone = profile?.timezone || "UTC";
  const { hour: localHour, weekday: localWeekday } = localHourAndWeekday(new Date(), timeZone);
  const greeting = getGreeting(localHour);
  const motivation = MOTIVATIONS[localWeekday];

  const totalCalories = sessions.reduce(
    (sum, s) => sum + (s.estimated_calories ?? 0),
    0
  );
  const totalMinutes = sessions.reduce(
    (sum, s) => sum + Math.round((s.duration_seconds ?? 0) / 60),
    0
  );
  const streak = computeStreak(sessions, timeZone);
  const week = buildWeekActivity(sessions, timeZone);
  const recentSessions = sessions.slice(0, 5);

  const progressPercent = Math.min(
    100,
    Math.round((completedDays / (planDays.length || DEFAULT_PLAN_DAYS)) * 100)
  );

  const allDaysDone = plan ? planDays.length > 0 && completedDays >= planDays.length : false;
  const isRecoveryDay = Boolean(currentDay && currentDay.status === "completed" && !allDaysDone);
  // Daily pacing: today's workout is done — next day opens tomorrow.
  const gatedNextDay = getGatedNextDay(planDays, timeZone);

  const currentWeight = weights[0] ?? null;
  const previousWeight = weights[1] ?? null;
  const startWeight = weights.length > 0 ? weights[weights.length - 1] : null;
  const weightDelta =
    currentWeight && previousWeight
      ? Number((currentWeight.weight_kg - previousWeight.weight_kg).toFixed(1))
      : null;
  const targetWeight = fitnessProfile?.target_weight_kg ?? null;

  // ---- Weight-goal journey (weight-loss only — SWEAT has no gain path) -----
  // A target above the current weight is rejected at onboarding; legacy data
  // in that state shows no journey rather than a gain goal.
  const goalDirection: "lose" | null =
    currentWeight &&
    targetWeight !== null &&
    targetWeight < currentWeight.weight_kg - 0.05
      ? "lose"
      : null;
  const remainingKg =
    currentWeight && targetWeight !== null
      ? Math.abs(currentWeight.weight_kg - targetWeight)
      : null;
  const goalReached = remainingKg !== null && remainingKg < 0.15;
  let journeyPercent: number | null = null;
  if (
    startWeight &&
    currentWeight &&
    targetWeight !== null &&
    startWeight.weight_kg - targetWeight >= 0.05
  ) {
    const totalKg = startWeight.weight_kg - targetWeight;
    const doneKg = Math.max(
      0,
      startWeight.weight_kg - currentWeight.weight_kg
    );
    journeyPercent = Math.min(
      100,
      Math.max(0, Math.round((doneKg / totalKg) * 100))
    );
  }
  // §12 Actual scale change ≠ fat loss. Direction only; never converted to
  // calories or planning equivalents here.
  const deltaIsGood = weightDelta !== null && weightDelta < 0;

  const ctaLabel = isRecoveryDay
    ? null
    : currentDay?.status === "in_progress"
      ? "Resume Workout"
      : "Start Workout";

  const heroTitle = isRecoveryDay
    ? gatedNextDay !== null
      ? "Recovery day — see you tomorrow"
      : "Recovery day — you earned it"
    : currentDay?.workouts?.name ?? "Today's Workout";

  return (
    <div className="space-y-14 font-[family-name:var(--font-geist-sans)] sm:space-y-20">
      {/* ============================================================
          Hero band — greeting, streak, today's session, plan ring
         ============================================================ */}
      <Reveal>
        <section>
          {/* Header row */}
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
                {greeting}
              </p>
              <h1 className="mt-3 text-5xl font-black leading-none tracking-tighter text-foreground sm:text-6xl">
                {firstName}.
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium text-muted-foreground sm:text-base">
                  {motivation}
                </p>
                {goalDirection && remainingKg !== null && !goalReached && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-energy/10 px-3 py-1 text-xs font-bold text-energy">
                    <Target className="size-3.5" aria-hidden />
                    Losing ·{" "}
                    <span className="tabular-nums">
                      {remainingKg.toFixed(1)} kg
                    </span>{" "}
                    to go
                  </span>
                )}
              </div>
            </div>

            {/* Streak + week strip */}
            <div className="flex flex-col gap-4">
              {streak > 0 && (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-energy/10 px-3.5 py-1.5 text-sm font-bold text-energy tabular-nums sm:self-end">
                  <Flame
                    className="size-4 fill-energy/25"
                    aria-hidden
                  />
                  {streak} day streak
                </span>
              )}
              <div className="flex items-start gap-2">
                {week.days.map((day, i) => {
                  const active = week.minutes[i] > 0;
                  const isToday = i === 6;
                  return (
                    <div
                      key={day.toISOString()}
                      title={day.toLocaleDateString("en-US", {
                        weekday: "long",
                        timeZone,
                      })}
                      className="flex w-9 flex-col items-center gap-2"
                    >
                      <span
                        className={cn(
                          "grid size-9 place-items-center rounded-full text-xs font-black uppercase",
                          active
                            ? "bg-gradient-to-br from-orange-600 to-amber-400 text-white shadow-md shadow-orange-500/30"
                            : isToday
                              ? "border-2 border-dashed border-ring/60 text-muted-foreground"
                              : "bg-muted text-muted-foreground/70"
                        )}
                      >
                        {day
                          .toLocaleDateString("en-US", { weekday: "short", timeZone })
                          .charAt(0)}
                      </span>
                      <span
                        className={cn(
                          "size-1 rounded-full",
                          isToday ? "bg-energy" : "bg-transparent"
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Workout panel + ring */}
          <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
            {plan && currentDay && !allDaysDone ? (
              <Link
                href={
                  isRecoveryDay
                    ? "/discover"
                    : `/workout?planDayId=${currentDay.id}`
                }
                className="titan-card group relative block overflow-hidden p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:p-8"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {!isRecoveryDay && (
                    <span className="rounded-md bg-energy/10 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-energy tabular-nums">
                      Day {currentDay.day_number}
                      <span className="font-semibold opacity-60">
                        {" "}
                        / {planDays.length || DEFAULT_PLAN_DAYS}
                      </span>
                    </span>
                  )}
                  {isRecoveryDay ? (
                    gatedNextDay !== null ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                        <Clock className="size-3" aria-hidden />
                        Day {gatedNextDay} unlocks tomorrow — see you then
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                        <Trophy className="size-3" aria-hidden />
                        Recovery — explore something new
                      </span>
                    )
                  ) : currentDay.status === "in_progress" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                      <span className="size-1.5 animate-pulse rounded-full bg-energy" />
                      In progress
                    </span>
                  ) : null}
                </div>

                <h2 className="mt-5 max-w-xl text-3xl font-black leading-[1.02] tracking-tight text-foreground sm:text-4xl">
                  {heroTitle}
                </h2>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 tabular-nums">
                    <Clock className="size-4" aria-hidden />
                    {formatClock(currentDay.target_duration_seconds)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 tabular-nums">
                    <Flame className="size-4 text-energy" aria-hidden />
                    {currentDay.target_calories.toLocaleString()} kcal
                  </span>
                </div>

                  <div className="mt-6 max-w-sm">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <span>Plan progress</span>
                      <span className="tabular-nums text-foreground">
                        {progressPercent}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-400 transition-all duration-700"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-7 flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 px-7 py-3 text-base font-bold text-white shadow-lg shadow-orange-600/30 transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
                      <Zap className="size-5 fill-white" aria-hidden />
                      {ctaLabel ?? "Explore extra workouts"}
                    </span>
                    <ChevronRight
                      className="size-6 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1"
                      aria-hidden
                    />
                  </div>
                </Link>
              ) : plan && allDaysDone ? (
                <div className="titan-card relative overflow-hidden p-6 sm:p-8">
                  <span className="inline-flex items-center gap-2 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    <Trophy className="size-3.5" aria-hidden />
                    Challenge complete
                  </span>
                  <h2 className="mt-5 text-3xl font-black leading-[1.02] tracking-tight text-foreground sm:text-4xl">
                    You crushed all {planDays.length || DEFAULT_PLAN_DAYS} days.
                  </h2>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
                    Incredible dedication, {firstName}. Ready for your next
                    challenge?
                  </p>
                  <div className="mt-7">
                    <RegeneratePlanButton label="Start a New Plan" />
                  </div>
                </div>
              ) : (
                // §21 Controlled recovery state: the user IS onboarded, so
                // never restart onboarding here. Rebuild the plan from their
                // stored selection instead.
                <div className="titan-card relative overflow-hidden p-6 sm:p-8">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-red-600 dark:text-red-400">
                    <Target className="size-3.5" aria-hidden />
                    Plan unavailable
                  </span>
                  <h2 className="mt-5 text-3xl font-black leading-[1.02] tracking-tight text-foreground sm:text-4xl">
                    Your plan could not be loaded.
                  </h2>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
                    This can happen after an interrupted update. We can rebuild
                    it from your saved onboarding answers right now.
                  </p>
                  <RecoverPlanButton />
                </div>
              )}

              {/* Ring panel */}
              <div className="titan-card flex flex-row items-center justify-around gap-4 p-6 lg:w-64 lg:flex-col lg:justify-center lg:text-center">
                <ProgressRing
                  value={progressPercent}
                  size={124}
                  strokeWidth={10}
                  color="energy"
                />
                <div className="lg:mt-3">
                  <p className="text-lg font-bold text-foreground tabular-nums">
                    {completedDays}
                    <span className="font-semibold text-muted-foreground">
                      {" "}
                      / {planDays.length || DEFAULT_PLAN_DAYS} days
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    {plan ? "of your plan conquered" : "restore your plan to begin"}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold text-foreground tabular-nums lg:mt-4">
                    <TrendingUp className="size-3.5 text-energy" aria-hidden />
                    {week.sessionCount} active this week
                  </p>
                </div>
              </div>
            </div>
        </section>
      </Reveal>

      {/* Weight goal journey + weekly activity */}
      <Reveal delay={0.08}>
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {currentWeight ? (
            <div className="titan-card flex flex-col p-7 sm:p-9 lg:col-span-3">
              <div className="mb-5 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-energy/10 text-energy">
                    <Scale className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-base font-extrabold text-foreground">
                      Weight Goal
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground">
                      {goalDirection === "lose"
                        ? "Cutting — burn it off"
                        : "Track your progress"}
                    </p>
                  </div>
                </div>
                {weightDelta !== null && weightDelta !== 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
                      deltaIsGood
                        ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400"
                        : "bg-red-500/10 text-red-600 dark:bg-red-400/10 dark:text-red-400"
                    )}
                  >
                    {weightDelta < 0 ? (
                      <ArrowDownRight className="size-3.5" aria-hidden />
                    ) : (
                      <ArrowUpRight className="size-3.5" aria-hidden />
                    )}
                    {Math.abs(weightDelta).toFixed(1)} kg
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex items-end gap-2">
                  <span className="text-6xl font-black leading-none tracking-tighter text-foreground tabular-nums">
                    {currentWeight.weight_kg.toFixed(1)}
                  </span>
                  <span className="pb-1.5 text-base font-bold text-muted-foreground">
                    kg
                  </span>
                </div>
                {goalReached ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-2 text-sm font-bold text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
                    <Trophy className="size-4" aria-hidden />
                    Target reached 🎉
                  </span>
                ) : remainingKg !== null ? (
                  <span className="rounded-2xl bg-muted px-4 py-2 text-right">
                    <span className="block text-xl font-black leading-none text-foreground tabular-nums">
                      {remainingKg.toFixed(1)}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      kg to go
                    </span>
                  </span>
                ) : null}
              </div>

              {journeyPercent !== null &&
              startWeight &&
              targetWeight !== null ? (
                <div className="mt-6">
                  <div className="flex items-center justify-between text-xs font-semibold tabular-nums text-muted-foreground">
                    <span>{startWeight.weight_kg.toFixed(1)} start</span>
                    <span className="font-extrabold uppercase tracking-wider text-energy">
                      {journeyPercent}% there
                    </span>
                    <span className="font-bold text-foreground">
                      {targetWeight.toFixed(1)} goal
                    </span>
                  </div>
                  <div className="relative mt-2.5 h-3 rounded-full bg-muted">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-orange-600 to-amber-400 transition-all duration-700"
                      style={{ width: `${journeyPercent}%` }}
                    />
                    <div
                      className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-card bg-energy shadow-md transition-all duration-700"
                      style={{ left: `${journeyPercent}%` }}
                    />
                  </div>
                </div>
              ) : targetWeight !== null ? (
                <p className="mt-6 rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-muted-foreground">
                  First weigh-in logged — your journey to{" "}
                  <span className="font-bold tabular-nums text-foreground">
                    {targetWeight.toFixed(1)} kg
                  </span>{" "}
                  starts now.
                </p>
              ) : null}

              <p className="mt-auto pt-5 text-xs font-medium text-muted-foreground">
                Last logged {formatSessionDate(currentWeight.recorded_at, timeZone)}
                {goalReached
                  ? " — target reached! Keep training for fitness, not for the scale."
                  : goalDirection === "lose"
                    ? " — consistency beats crash diets."
                    : ""}
              </p>
            </div>
          ) : (
            <Link
              href="/reports"
              className="titan-card group flex flex-col items-start justify-center gap-3 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md lg:col-span-3 sm:p-7"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-energy/10 text-energy">
                <Scale className="size-5.5" aria-hidden />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-foreground">
                  Log your starting weight
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Every transformation begins with a first weigh-in. Add yours
                  to unlock goal tracking.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-energy">
                Log weight
                <ChevronRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden
                />
              </span>
            </Link>
          )}

          {/* Weekly activity */}
          <div className="titan-card p-7 sm:p-9 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Calendar className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">
                    Last 7 Days
                  </h3>
                  <p className="text-xs font-medium text-muted-foreground">
                    Minutes trained per day
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-extrabold tabular-nums text-foreground">
                {formatMinutes(week.minutes.reduce((a, b) => a + b, 0))}
              </span>
            </div>

            <div className="flex h-40 items-end gap-2 sm:gap-3">
              {week.days.map((day, i) => {
                const mins = week.minutes[i];
                const isToday = i === 6;
                const barHeight =
                  mins === 0 ? 0 : Math.max(14, (mins / week.maxMinutes) * 100);

                return (
                  <div
                    key={day.toISOString()}
                    className="flex h-full min-w-0 flex-1 flex-col items-center gap-2"
                  >
                    <div className="flex h-full w-full items-end overflow-hidden rounded-full bg-muted">
                      <div
                        role="meter"
                        aria-label={`${day.toLocaleDateString("en-US", { weekday: "long", timeZone })}: ${mins} minutes`}
                        aria-valuemin={0}
                        aria-valuemax={week.maxMinutes}
                        aria-valuenow={mins}
                        title={formatMinutes(mins)}
                        className={cn(
                          "w-full rounded-full transition-all duration-500",
                          isToday
                            ? "bg-gradient-to-t from-orange-600 to-amber-400 shadow-[0_0_14px_-2px_var(--energy)]"
                            : mins > 0
                              ? "bg-primary/70"
                              : ""
                        )}
                        style={{ height: `${barHeight}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-xs font-bold",
                        isToday ? "text-energy" : "text-muted-foreground"
                      )}
                    >
                      {day
                        .toLocaleDateString("en-US", { weekday: "short", timeZone })
                        .charAt(0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </Reveal>

      {/* Quick stats — editorial */}
      <Reveal delay={0.12}>
        <section aria-label="Quick stats">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
            All-time hustle
          </p>
          <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-12 lg:grid-cols-4 lg:gap-x-12">
            <StatBlock
              icon={Flame}
              tone="text-energy"
              value={streak}
              label="Day streak"
            />
            <StatBlock
              icon={Zap}
              tone="text-orange-500 dark:text-orange-400"
              value={totalCalories.toLocaleString()}
              label="Calories burned"
            />
            <StatBlock
              icon={Clock}
              tone="text-sky-500 dark:text-sky-400"
              value={formatMinutes(totalMinutes)}
              label="Time trained"
            />
            <StatBlock
              icon={Dumbbell}
              tone="text-emerald-500 dark:text-emerald-400"
              value={sessions.length.toLocaleString()}
              label="Workouts done"
            />
          </div>
        </section>
      </Reveal>

      {/* Recent workouts */}
      <Reveal delay={0.16}>
        <section aria-label="Recent workouts">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                History
              </p>
              <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                Recent workouts
              </h2>
            </div>
            {recentSessions.length > 0 && (
              <Link
                href="/plan"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-foreground underline-offset-4 transition-colors hover:underline"
              >
                View plan
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>

          {recentSessions.length === 0 ? (
            <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-border bg-card p-16 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <Dumbbell className="size-7" aria-hidden />
              </span>
              <p className="mt-5 text-base font-bold text-foreground">
                No workouts yet
              </p>
              <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                Your history will appear here after your first session.
              </p>
            </div>
          ) : (
            <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 no-scrollbar sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
              {recentSessions.map((session) => (
                <article
                  key={session.id}
                  className="titan-card w-[270px] shrink-0 snap-start p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                      <Dumbbell className="size-5" aria-hidden />
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {session.completed_at
                        ? formatSessionDate(session.completed_at, timeZone)
                        : "—"}
                    </span>
                  </div>
                  <h3 className="mt-5 truncate text-base font-extrabold text-foreground">
                    {session.workouts?.name ?? "Workout"}
                  </h3>
                  <div className="mt-2.5 flex items-center gap-4 text-sm font-semibold text-muted-foreground tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-4" aria-hidden />
                      {formatClock(session.duration_seconds ?? 0)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Flame className="size-4 text-energy" aria-hidden />
                      {(session.estimated_calories ?? 0).toLocaleString()} kcal
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      {/* Motivation footer */}
      <Reveal delay={0.2}>
        <section className="titan-card flex items-center gap-4 p-6 sm:p-7">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-energy/10 text-energy">
            <Heart className="size-5" aria-hidden />
          </span>
          <p className="text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
            {remainingKg !== null && !goalReached ? (
              <>
                Only{" "}
                <span className="font-bold text-foreground tabular-nums">
                  {remainingKg.toFixed(1)} kg
                </span>{" "}
                stands between you and your goal, {firstName}.
              </>
            ) : (
              <>Every rep counts, {firstName}.</>
            )}{" "}
            <span className="font-bold text-foreground">
              See you at the next workout.
            </span>
          </p>
        </section>
      </Reveal>
    </div>
  );
}
