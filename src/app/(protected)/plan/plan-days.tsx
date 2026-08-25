"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check, Clock, Flame, Lock, Play, RotateCcw } from "lucide-react";
import type { PlanDayWithWorkoutName } from "@/lib/types/database";
import { formatClock } from "@/lib/duration";
import { cn } from "@/lib/utils";

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
}: {
  days: PlanDayWithWorkoutName[];
  opensTomorrowDay?: number | null;
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

                return (
                  <motion.li key={day.id} variants={item} className="list-none">
                    <Link
                      href={isActionable || isCompleted ? `/workout?planDayId=${day.id}` : "#"}
                      aria-disabled={!isActionable && !isCompleted}
                      tabIndex={isActionable || isCompleted ? 0 : -1}
                      className={cn(
                        "group relative flex items-center gap-4 overflow-hidden rounded-2xl p-5 outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring sm:p-6",
                        isAvailable &&
                          "bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 shadow-lg shadow-orange-600/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-600/35",
                        isInProgress &&
                          "border-2 border-energy bg-energy/5 shadow-md shadow-energy/10 hover:-translate-y-1 hover:shadow-lg",
                        isCompleted &&
                          "titan-card hover:-translate-y-0.5 hover:shadow-lg",
                        isLocked &&
                          "pointer-events-none border border-dashed border-border bg-card/50"
                      )}
                    >
                      {/* Ghost day number */}
                      <span
                        aria-hidden
                        className={cn(
                          "pointer-events-none absolute -bottom-5 -right-1 select-none text-[5.5rem] font-black leading-none tracking-tighter",
                          isAvailable && "text-white/10",
                          isInProgress && "text-energy/[0.07]",
                          isCompleted && "text-foreground/[0.05]",
                          isLocked && "text-muted-foreground/[0.07]"
                        )}
                      >
                        {String(day.day_number).padStart(2, "0")}
                      </span>

                      {/* Day number / status */}
                      <span
                        className={cn(
                          "relative grid size-12 shrink-0 place-items-center rounded-xl text-sm font-black tabular-nums",
                          isAvailable && "bg-white text-orange-600 shadow-md",
                          isInProgress &&
                            "bg-gradient-to-br from-orange-600 to-amber-400 text-white shadow-md shadow-orange-500/30",
                          isCompleted &&
                            "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30",
                          isLocked && "bg-muted text-muted-foreground"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="size-5" strokeWidth={3} aria-hidden />
                        ) : isLocked ? (
                          <Lock className="size-4.5" aria-hidden />
                        ) : (
                          day.day_number
                        )}
                      </span>

                      <div className="relative min-w-0 flex-1">
                        <p
                          className={cn(
                            "flex flex-wrap items-center gap-2 text-sm font-extrabold",
                            isAvailable ? "text-white" : "text-foreground"
                          )}
                        >
                          Day {day.day_number}
                          {isAvailable && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur">
                              <span className="size-1.5 animate-pulse rounded-full bg-white" />
                              Up next
                            </span>
                          )}
                          {isInProgress && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-energy/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-energy">
                              <span className="size-1.5 animate-pulse rounded-full bg-energy" />
                              In progress
                            </span>
                          )}
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
                          {day.workouts?.name ?? "Workout session"}
                        </p>
                        <div
                          className={cn(
                            "mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-semibold tabular-nums",
                            isAvailable ? "text-white/80" : "text-muted-foreground"
                          )}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3.5" aria-hidden />
                            {formatClock(day.target_duration_seconds)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Flame
                              className={cn("size-3.5", isAvailable && "text-white")}
                              aria-hidden
                            />
                            {day.target_calories.toLocaleString()} kcal
                          </span>
                        </div>
                      </div>

                      {isAvailable ? (
                        <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-white text-orange-600 shadow-lg transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
                          <Play className="ml-0.5 size-4.5 fill-orange-600" aria-hidden />
                        </span>
                      ) : isInProgress ? (
                        <span className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full bg-energy px-3.5 py-2 text-[11px] font-black uppercase tracking-wider text-white shadow-md shadow-energy/30 transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
                          <Play className="size-3 fill-white" aria-hidden />
                          Resume
                        </span>
                      ) : isCompleted ? (
                        <span className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors duration-200 group-hover:bg-energy/10 group-hover:text-energy">
                          <RotateCcw className="size-3" aria-hidden />
                          Repeat
                        </span>
                      ) : day.day_number === opensTomorrowDay ? (
                        <span className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          <Clock className="size-3" aria-hidden />
                          Opens tomorrow
                        </span>
                      ) : null}
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
