import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type {
  PlanDayWithWorkoutName,
  UserPlanDayBlock,
} from "@/lib/types/database";
import { Flame, Lock, Play } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { getGatedNextDay, repairPlanProgression, getActivePlan } from "@/services/plan";
import { getProfile } from "@/services/onboarding";
import { formatClock } from "@/lib/duration";
import { cn } from "@/lib/utils";
import { getPlanDayThumbnail } from "@/lib/plan-thumbnails";
import {
  DAILY_SESSION_TARGET_KCAL,
  plannedDailyDeficitKcal,
  type PlanDurationDays,
} from "@/lib/weight-loss";
import { RecoverPlanButton } from "@/components/recover-plan-button";
import { PlanDays } from "./plan-days";

export default async function PlanPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) redirect("/login");

  const [profile, activePlanResult] = await Promise.all([
    getProfile(user.id),
    getActivePlan(user.id).then((data) => ({ data })),
  ]);

  // Guard against onboarding loop: if the flag is missing but an active plan
  // exists, the user completed onboarding but the flag wasn't persisted.
  if (!profile?.onboarding_completed_at && !activePlanResult.data) {
    redirect("/onboarding");
  }

  const plan = activePlanResult.data;

  // Heal stalled progression + enforce daily pacing before reading plan days.
  const timeZone = profile?.timezone || "UTC";
  await repairPlanProgression(user.id, timeZone);

  let days: PlanDayWithWorkoutName[] = [];

  if (plan) {
    const { data: planDays } = await supabase
      .from("user_plan_days")
      .select("*, workouts(name)")
      .eq("user_plan_id", plan.id)
      .order("day_number");

    days = (planDays as PlanDayWithWorkoutName[]) ?? [];
  }

  const completedDays = days.filter((d) => d.status === "completed").length;
  const progressPercent =
    days.length > 0 ? Math.round((completedDays / days.length) * 100) : 0;

  const totalCalories = days
    .filter((d) => d.status !== "completed")
    .reduce((sum, d) => sum + d.target_calories, 0);
  const nextUp = days.find((d) => d.status === "available") ?? null;
  const opensTomorrowDay = getGatedNextDay(days, timeZone);
  const currentDayThumbnail =
    nextUp?.day_number ?? (opensTomorrowDay !== null ? opensTomorrowDay : null);
  const planDuration = plan ? (Number(plan.plan_duration_days) as PlanDurationDays) : 30;
  const currentDayThumbnailSrc =
    currentDayThumbnail && plan
      ? getPlanDayThumbnail(currentDayThumbnail, planDuration)
      : null;

  // Composed hour for the featured day: ordered videos summing to exactly
  // 3,600 s / 1,100 kcal at the uniform session rate.
  let nextUpBlocks: (UserPlanDayBlock & {
    workouts: { name: string; duration_seconds: number } | null;
  })[] = [];
  if (nextUp) {
    const { data: blocksData } = await supabase
      .from("user_plan_day_blocks")
      .select("*, workouts(name, duration_seconds)")
      .eq("user_plan_day_id", nextUp.id)
      .order("position");
    nextUpBlocks =
      (blocksData as (UserPlanDayBlock & {
        workouts: { name: string; duration_seconds: number } | null;
      })[] | null) ?? [];
  }

  // §3 Tier pacing: planned loss spread over the plan length (7,700 kcal/kg)
  // gives the TOTAL daily deficit the plan is paced for — nutrition +
  // activity combined. Never a single workout's burn, never a guarantee.
  const dailyPlanningDeficit =
    plan && Number(plan.planned_loss_kg) > 0
      ? plannedDailyDeficitKcal(
          Number(plan.planned_loss_kg),
          Number(plan.plan_duration_days)
        )
      : null;

  return (
    <div className="font-[family-name:var(--font-geist-sans)]">
      <PageHeader
        title="Your Plan"
        subtitle={
          plan
            ? `${completedDays} of ${days.length} days conquered — keep the streak alive.`
            : "Create your personalized program to get started."
        }
      />

      {!plan ? (
        // §21 Onboarded user, missing plan → controlled recovery, never a
        // trip back through onboarding.
        <div className="titan-card relative overflow-hidden p-8 text-center sm:p-14">
          <p className="relative text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
            No active plan
          </p>
          <h2 className="relative mx-auto mt-4 max-w-md text-4xl font-black leading-[1.05] tracking-tighter text-foreground sm:text-5xl">
            Your plan could not be loaded.
          </h2>
          <p className="relative mx-auto mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
            Restore it from your saved onboarding answers — takes one tap.
          </p>
          <div className="relative mt-9 flex justify-center">
            <RecoverPlanButton label="Restore my plan" />
          </div>
        </div>
      ) : days.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No workout days found for this plan.
        </div>
      ) : (
        <>
          {/* Progress band */}
          <section className="titan-hero relative overflow-hidden rounded-3xl shadow-xl shadow-black/15">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-20 -right-16 size-72 rounded-full bg-white/8 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-28 -left-14 size-64 rounded-full bg-black/40 blur-3xl"
            />

            <div className="relative flex flex-col gap-7 p-7 sm:flex-row sm:items-center sm:gap-10 sm:p-9">
              <div className="flex items-center gap-6">
                <span className="text-6xl font-black leading-none tracking-tighter text-white tabular-nums sm:text-7xl">
                  {progressPercent}
                  <span className="align-top text-2xl font-extrabold text-amber-400">
                    %
                  </span>
                </span>
                <div className="hidden h-16 w-px bg-white/15 sm:block" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/50">
                    Transformation progress
                  </p>
                  <p className="mt-1.5 text-xl font-extrabold text-white tabular-nums">
                    {completedDays}
                    <span className="font-semibold text-white/50">
                      {" "}
                      / {days.length} days conquered
                    </span>
                  </p>
                  {dailyPlanningDeficit !== null && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/85 tabular-nums">
                      <Flame className="size-3.5 text-amber-400" aria-hidden />
                      ≈ {dailyPlanningDeficit.toLocaleString()} kcal/day planning deficit
                      <span className="font-normal text-white/55">(workouts + nutrition)</span>
                    </p>
                  )}
                </div>
              </div>

              {nextUp ? (
                <Link
                  href={`/workout?planDayId=${nextUp.id}&autoStart=1`}
                  className="group relative flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur transition-all duration-300 outline-none hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-white sm:ml-auto sm:w-auto sm:max-w-[440px]"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-zinc-900 shadow-lg transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
                      <Play className="ml-0.5 size-4.5 fill-zinc-900" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
                        <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
                        Up next · Day {nextUp.day_number}
                      </span>
                      <span className="block truncate text-sm font-extrabold text-white">
                        {nextUp.workouts?.name ?? "Today's workout"}
                      </span>
                    </span>
                  </div>

                  {currentDayThumbnailSrc && (
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/10 shadow-lg shadow-black/20">
                      <Image
                        src={currentDayThumbnailSrc}
                        alt={`Day ${nextUp.day_number} plan thumbnail`}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  )}
                </Link>
              ) : opensTomorrowDay !== null ? (
                <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur sm:ml-auto sm:w-auto sm:max-w-[440px]">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 text-amber-400">
                      <Lock className="size-4.5" aria-hidden />
                    </span>
                    <span className="text-xs font-semibold text-zinc-300">
                      Day {opensTomorrowDay} unlocks tomorrow — you&apos;ve done
                      your part today.
                    </span>
                  </div>

                  {currentDayThumbnailSrc && (
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/10 shadow-lg shadow-black/20">
                      <Image
                        src={currentDayThumbnailSrc}
                        alt={`Day ${opensTomorrowDay} plan thumbnail`}
                        fill
                        className="object-cover opacity-90"
                        sizes="80px"
                      />
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Day tracker */}
            <div className="relative border-t border-white/10 px-7 py-5 sm:px-9">
              <div className="flex items-center gap-[3px]" aria-hidden>
                {days.map((d) => {
                  const done = d.status === "completed";
                  const current = d.status === "available" || d.status === "in_progress";
                  return (
                    <span
                      key={d.id}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors duration-500",
                        done && "bg-gradient-to-r from-orange-500 to-amber-400",
                        current && "bg-white/15",
                        !done && !current && "bg-white/10"
                      )}
                    >
                      {current && (
                        <span className="block h-full w-full animate-pulse rounded-full bg-amber-400" />
                      )}
                    </span>
                  );
                })}
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/40">
                <span>Day 1</span>
                {totalCalories > 0 && (
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Flame className="size-3 text-energy" aria-hidden />
                    {totalCalories.toLocaleString()} kcal left
                  </span>
                )}
                <span>Day {days.length}</span>
              </div>
            </div>
          </section>

          {/* Composed hour for the featured day */}
          {nextUp && nextUpBlocks.length > 0 && (
            <section className="titan-card mt-6 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  Day {nextUp.day_number} · 60-minute block
                </p>
                <p className="inline-flex items-center gap-1.5 text-[11px] font-bold text-foreground tabular-nums">
                  <Flame className="size-3.5 text-energy" aria-hidden />
                  {DAILY_SESSION_TARGET_KCAL.toLocaleString()} kcal · {nextUpBlocks.length} videos back-to-back
                </p>
              </div>
              <ol className="mt-4 space-y-2">
                {nextUpBlocks.map((b, i) => (
                  <li
                    key={b.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                      i === 0
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-border bg-card"
                    )}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-foreground/8 text-xs font-black tabular-nums">
                      {b.position}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">
                      {b.workouts?.name ?? "Workout"}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
                      {formatClock(b.duration_seconds)} ·{" "}
                      {b.calories} kcal
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Play the videos in order — the last one closes the hour, so it may
                run a few minutes long or short.
              </p>
            </section>
          )}

          <div className="mt-8">
            <PlanDays
              days={days}
              opensTomorrowDay={opensTomorrowDay}
              planDuration={Number(plan.plan_duration_days) as PlanDurationDays}
            />
          </div>
        </>
      )}
    </div>
  );
}
