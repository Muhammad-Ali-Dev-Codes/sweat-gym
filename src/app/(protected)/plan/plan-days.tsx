"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { Check, Clock, Flame, Lock, Play, RotateCcw } from "lucide-react";
import type { PlanDayWithWorkoutName } from "@/lib/types/database";
import type { PlanDurationDays } from "@/lib/weight-loss";
import { formatClock } from "@/lib/duration";
import { cn } from "@/lib/utils";
import { getPlanDayThumbnail, getWorkoutTypeLabel } from "@/lib/plan-thumbnails";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 260, damping: 26 },
  },
};

export function PlanDays({
  days,
  opensTomorrowDay = null,
  planDuration = 30,
}: {
  days: PlanDayWithWorkoutName[];
  opensTomorrowDay?: number | null;
  planDuration?: PlanDurationDays;
}) {
  const weeks: PlanDayWithWorkoutName[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div>
      {weeks.map((weekDays, weekIndex) => {
        const doneCount = weekDays.filter((d) => d.status === "completed").length;

        return (
          <section
            key={weekIndex}
            aria-label={`Week ${weekIndex + 1}`}
            className={cn(weekIndex > 0 && "mt-9")}
          >
            <header className="mb-4 flex items-center gap-3">
              <h3 className="text-xs font-black uppercase tracking-[0.25em] text-muted-foreground">
                Week {weekIndex + 1}
              </h3>
              <span aria-hidden className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-bold text-muted-foreground/70 tabular-nums">
                {doneCount}/{weekDays.length} done
              </span>
            </header>

            <motion.ol
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
            >
              {weekDays.map((day) => {
                const isCompleted = day.status === "completed";
                const isAvailable = day.status === "available";
                const isInProgress = day.status === "in_progress";
                const isLocked = !isCompleted && !isAvailable && !isInProgress;
                const isActionable = isAvailable || isInProgress;

                const thumbnailSrc = getPlanDayThumbnail(day.day_number, planDuration);
                const workoutType = getWorkoutTypeLabel(day.day_number);

                return (
                  <motion.li key={day.id} variants={item} className="list-none">
                    <Link
                      href={isActionable || isCompleted ? `/plan/${day.id}` : "#"}
                      aria-disabled={!isActionable && !isCompleted}
                      tabIndex={isActionable || isCompleted ? 0 : -1}
                      className={cn(
                        "group relative flex overflow-hidden rounded-2xl outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring",
                        isAvailable &&
                          "shadow-lg shadow-orange-600/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-600/35",
                        isInProgress &&
                          "border-2 border-energy shadow-md shadow-energy/10 hover:-translate-y-1 hover:shadow-lg",
                        isCompleted &&
                          "titan-card hover:-translate-y-0.5 hover:shadow-lg",
                        isLocked &&
                          "pointer-events-none border border-dashed border-border bg-card/50"
                      )}
                    >
                      {/* Thumbnail image */}
                      <div className="relative h-28 w-28 shrink-0 overflow-hidden sm:h-32 sm:w-32">
                        <Image
                          src={thumbnailSrc}
                          alt={`Day ${day.day_number} - ${workoutType}`}
                          fill
                          className={cn(
                            "object-cover transition-transform duration-300 group-hover:scale-105",
                            isLocked && "opacity-40 grayscale"
                          )}
                          sizes="(max-width: 640px) 112px, 128px"
                        />
                        {/* Day number overlay */}
                        <span
                          className={cn(
                            "absolute top-2 left-2 grid size-8 place-items-center rounded-lg text-xs font-black tabular-nums shadow-md",
                            isAvailable && "bg-white text-orange-600",
                            isInProgress &&
                              "bg-gradient-to-br from-orange-600 to-amber-400 text-white",
                            isCompleted && "bg-emerald-500 text-white",
                            isLocked && "bg-muted text-muted-foreground"
                          )}
                        >
                          {isCompleted ? (
                            <Check className="size-4" strokeWidth={3} aria-hidden />
                          ) : isLocked ? (
                            <Lock className="size-3.5" aria-hidden />
                          ) : (
                            day.day_number
                          )}
                        </span>
                        {/* Status badge for available/in-progress */}
                        {(isAvailable || isInProgress) && (
                          <span className="absolute top-2 right-2">
                            {isAvailable && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-md">
                                <span className="size-1 animate-pulse rounded-full bg-white" />
                                Up next
                              </span>
                            )}
                            {isInProgress && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-energy px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-md">
                                <span className="size-1 animate-pulse rounded-full bg-white" />
                                In progress
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="relative flex flex-1 flex-col justify-between p-3 sm:p-4">
                        {/* Ghost day number */}
                        <span
                          aria-hidden
                          className={cn(
                            "pointer-events-none absolute -bottom-4 -right-1 select-none text-[4rem] font-black leading-none tracking-tighter",
                            isAvailable && "text-orange-500/10",
                            isInProgress && "text-energy/[0.07]",
                            isCompleted && "text-foreground/[0.05]",
                            isLocked && "text-muted-foreground/[0.07]"
                          )}
                        >
                          {String(day.day_number).padStart(2, "0")}
                        </span>

                        <div className="relative">
                          <p
                            className={cn(
                              "text-sm font-extrabold",
                              isAvailable ? "text-white" : "text-foreground"
                            )}
                          >
                            Day {day.day_number}
                          </p>
                          <p
                            className={cn(
                              "mt-0.5 truncate text-xs font-semibold",
                              isAvailable
                                ? "text-white/85"
                                : isInProgress
                                  ? "text-foreground/70"
                                  : "text-muted-foreground"
                            )}
                          >
                            {workoutType}
                          </p>
                        </div>

                        <div className="relative">
                          <p
                            className={cn(
                              "truncate text-[11px] font-medium",
                              isAvailable
                                ? "text-white/75"
                                : "text-muted-foreground/80"
                            )}
                          >
                            {day.workouts?.name ?? "Workout session"}
                          </p>
                          <div
                            className={cn(
                              "mt-1 flex flex-wrap items-center gap-x-2 text-[11px] font-semibold tabular-nums",
                              isAvailable ? "text-white/70" : "text-muted-foreground"
                            )}
                          >
                            <span className="inline-flex items-center gap-0.5">
                              <Clock className="size-3" aria-hidden />
                              {formatClock(day.target_duration_seconds)}
                            </span>
                            <span className="inline-flex items-center gap-0.5">
                              <Flame
                                className={cn("size-3", isAvailable && "text-white")}
                                aria-hidden
                              />
                              {day.target_calories.toLocaleString()} kcal
                            </span>
                          </div>
                        </div>

                        {/* Action button */}
                        <div className="absolute right-3 bottom-3 sm:right-4 sm:bottom-4">
                          {isAvailable ? (
                            <span className="grid size-9 place-items-center rounded-full bg-white text-orange-600 shadow-lg transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
                              <Play className="ml-0.5 size-4 fill-orange-600" aria-hidden />
                            </span>
                          ) : isInProgress ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-energy px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md shadow-energy/30 transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
                              <Play className="size-2.5 fill-white" aria-hidden />
                              Resume
                            </span>
                          ) : isCompleted ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors duration-200 group-hover:bg-energy/10 group-hover:text-energy">
                              <RotateCcw className="size-2.5" aria-hidden />
                              Repeat
                            </span>
                          ) : day.day_number === opensTomorrowDay ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              <Clock className="size-2.5" aria-hidden />
                              Opens tomorrow
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </motion.li>
                );
              })}
            </motion.ol>
          </section>
        );
      })}
    </div>
  );
}
