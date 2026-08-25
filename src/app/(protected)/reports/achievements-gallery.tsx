"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import {
  Flame,
  Trophy,
  Zap,
  Clock,
  CalendarCheck,
  Dumbbell,
  Lock,
  Award,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ACHIEVEMENTS,
  achievementProgress,
  getAchievement,
  type AchievementStats,
} from "@/lib/personalization/achievements";
import { cn } from "@/lib/utils";

type AchievementsGalleryProps = {
  stats: AchievementStats;
  /** achievement_key -> earned_at */
  earned: Map<string, string>;
};

const GROUP_ICONS: Record<string, LucideIcon> = {
  "Getting Started": Zap,
  Consistency: Flame,
  Workouts: Dumbbell,
  Calories: Zap,
  Time: Clock,
  Plans: CalendarCheck,
};

export function AchievementsGallery({
  stats,
  earned,
}: AchievementsGalleryProps) {
  const items = useMemo(
    () =>
      ACHIEVEMENTS.map((def) => ({
        def,
        progress: achievementProgress(def.key, stats),
        earnedAt: earned.get(def.key) ?? null,
      })),
    [stats, earned]
  );

  const unlockedCount = items.filter((i) => i.earnedAt).length;

  return (
    <section id="achievements" aria-label="Achievements" className="scroll-mt-20">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
            Milestones
          </p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Achievements
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-600 tabular-nums dark:text-yellow-400">
          <Trophy className="size-3.5" aria-hidden />
          {unlockedCount} / {ACHIEVEMENTS.length} unlocked
        </span>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(({ def, progress, earnedAt }, i) => {
          const GroupIcon = GROUP_ICONS[def.group] ?? Trophy;
          const unlocked = Boolean(earnedAt);
          const percent = progress?.percent ?? 0;

          return (
            <motion.li
              key={def.key}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                delay: Math.min(i * 0.04, 0.3),
                type: "spring",
                stiffness: 260,
                damping: 24,
              }}
              className={cn(
                "relative overflow-hidden rounded-2xl border p-4 transition-shadow sm:p-5",
                unlocked
                  ? "border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-card to-card shadow-sm"
                  : "border-border bg-card"
              )}
            >
              <div className="flex items-start gap-3.5">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    unlocked
                      ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md shadow-amber-500/25"
                      : "bg-secondary text-muted-foreground"
                  )}
                  aria-hidden
                >
                  {unlocked ? (
                    <GroupIcon className="size-5" />
                  ) : (
                    <Lock className="size-4.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={cn(
                        "truncate text-sm",
                        unlocked
                          ? "font-extrabold text-foreground"
                          : "font-bold text-muted-foreground"
                      )}
                    >
                      {def.title}
                    </h3>
                    {unlocked && (
                      <span className="shrink-0 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                        Earned
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {def.description}
                  </p>

                  {/* Locked => progress toward unlock */}
                  {!unlocked && progress && (
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span>{def.group}</span>
                        <span className="tabular-nums">
                          {Math.min(progress.current, progress.target)}/
                          {progress.target}
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={`Progress toward ${def.title}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percent}
                        className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${percent}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className={cn(
                            "h-full rounded-full",
                            percent >= 70
                              ? "bg-gradient-to-r from-orange-600 to-amber-400"
                              : "bg-primary/70"
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {unlocked && (
                    <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground tabular-nums">
                      <Award className="size-3 text-yellow-500" aria-hidden />
                      Unlocked{" "}
                      {new Date(earnedAt as string).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

export function achievementTitle(key: string): string | null {
  return getAchievement(key)?.title ?? null;
}
