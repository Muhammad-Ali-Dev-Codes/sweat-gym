"use client";

import { motion } from "motion/react";
import { Flame, CalendarClock } from "lucide-react";
import { STREAK_MILESTONES } from "@/lib/reports/calculate";
import type { StreakInfo } from "@/lib/reports/calculate";
import { getLocalToday, shiftDayKey } from "@/lib/dates";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";

type StreakCardProps = {
  streak: StreakInfo;
  timeZone: string;
};

function formatLastActive(dayKey: string | null, timeZone: string): string {
  if (!dayKey) return "No activity yet";
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const todayKey = getLocalToday(timeZone);
  if (dayKey === todayKey) return "Today";
  if (dayKey === shiftDayKey(todayKey, -1)) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function StreakCard({ streak, timeZone }: StreakCardProps) {
  // Next milestone the user is working toward.
  const nextMilestone =
    STREAK_MILESTONES.find((m) => m > streak.current) ?? null;
  const progressPercent = nextMilestone
    ? Math.min(100, Math.round((streak.current / nextMilestone) * 100))
    : 100;
  const daysToGo = nextMilestone ? nextMilestone - streak.current : 0;

  return (
    <section
      aria-label="Streak"
      className="titan-card relative overflow-hidden p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-9 items-center justify-center rounded-full bg-energy/10 text-energy">
            <Flame className="size-4.5" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground">Streak</h3>
            <p className="text-xs text-muted-foreground">
              Consecutive active days
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
          <CalendarClock className="size-3" aria-hidden />
          Last: {formatLastActive(streak.lastActiveDay, timeZone)}
        </span>
      </div>

      <div className="mt-5 flex items-end gap-8">
        <div>
          <p className="text-5xl font-black leading-none tracking-tighter text-foreground tabular-nums">
            <AnimatedNumber value={streak.current} />
          </p>
          <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Current
          </p>
        </div>
        <div>
          <p className="text-3xl font-black leading-none tracking-tighter text-muted-foreground tabular-nums">
            <AnimatedNumber value={streak.longest} />
          </p>
          <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
            Longest
          </p>
        </div>

        {/* Milestone markers */}
        <div className="ml-auto hidden items-end gap-1.5 sm:flex" aria-hidden>
          {STREAK_MILESTONES.slice(0, 5).map((m) => {
            const reached = streak.current >= m || streak.longest >= m;
            return (
              <motion.span
                key={m}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15 + m * 0.01, type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-black tabular-nums",
                  reached
                    ? "bg-energy/15 text-energy"
                    : "bg-muted text-muted-foreground/60"
                )}
              >
                {m}
              </motion.span>
            );
          })}
        </div>
      </div>

      {/* Progress toward next milestone */}
      {nextMilestone !== null && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Next milestone</span>
            <span className="tabular-nums text-foreground">
              {daysToGo} day{daysToGo === 1 ? "" : "s"} to {nextMilestone}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-400"
            />
          </div>
        </div>
      )}
    </section>
  );
}
