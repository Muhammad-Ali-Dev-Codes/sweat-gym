"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Check, Clock, CloudOff, Flame, Trophy } from "lucide-react";
import type { CompletionInfo } from "./page";
import { formatClock } from "@/lib/duration";

type WorkoutCompleteProps = {
  workoutName: string;
  durationSeconds: number;
  calories: number;
  exercisesCompleted: number;
  totalExercises: number;
  info: CompletionInfo | null;
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 260, damping: 24 },
  },
};

export function WorkoutComplete({
  workoutName,
  durationSeconds,
  calories,
  exercisesCompleted,
  totalExercises,
  info,
}: WorkoutCompleteProps) {
  const synced = info?.synced ?? true;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto flex max-w-lg flex-col items-center py-8 text-center font-[family-name:var(--font-geist-sans)] sm:py-14"
    >
      {/* Animated check */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="grid size-24 place-items-center rounded-full bg-foreground shadow-xl shadow-black/20"
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.25, type: "spring", stiffness: 300, damping: 16 }}
          className="grid place-items-center"
        >
          <Check className="size-12 text-background" strokeWidth={3} aria-hidden />
        </motion.span>
      </motion.div>

      <motion.div variants={item} className="mt-7">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-energy">
          Session complete
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Strong work.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          You finished{" "}
          <span className="font-semibold text-foreground">{workoutName}</span>.
          That&apos;s another rep in the bank.
        </p>
      </motion.div>

      {/* Sync state — never claim success that hasn't reached the server */}
      {!synced && (
        <motion.p
          variants={item}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-xs font-semibold text-muted-foreground"
        >
          <CloudOff className="size-3.5" aria-hidden />
          Saved on this device — will sync when you&apos;re back online
        </motion.p>
      )}

      {/* Stats */}
      <motion.div
        variants={item}
        className="titan-card mt-8 grid w-full grid-cols-3 divide-x divide-border overflow-hidden"
      >
        <div className="px-2 py-5">
          <p className="text-2xl font-extrabold tabular-nums text-foreground">
            {formatClock(durationSeconds)}
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Duration
          </p>
        </div>
        <div className="px-2 py-5">
          <p className="text-2xl font-extrabold tabular-nums text-energy">
            {calories.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Kcal burned
          </p>
        </div>
        <div className="px-2 py-5">
          <p className="text-2xl font-extrabold tabular-nums text-foreground">
            {exercisesCompleted}
            <span className="text-base font-bold text-muted-foreground">
              /{totalExercises}
            </span>
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Exercises
          </p>
        </div>
      </motion.div>

      {/* Progression + achievements */}
      {(info?.nextDayUnlocked ||
        info?.planCompleted ||
        (info?.currentStreak ?? 0) > 0 ||
        (info?.achievements.length ?? 0) > 0) && (
        <motion.ul variants={item} className="mt-5 w-full space-y-2 text-left">
          {(info?.achievements.length ?? 0) > 0 &&
            info!.achievements.map((a) => (
              <li
                key={a.key}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <Trophy className="size-4.5 shrink-0 text-energy" aria-hidden />
                <p className="text-sm font-bold text-foreground">
                  Achievement unlocked: {a.title}
                </p>
              </li>
            ))}
          {(info?.currentStreak ?? 0) > 0 && (
            <li className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <Flame className="size-4.5 shrink-0 text-energy" aria-hidden />
              <p className="text-sm font-bold text-foreground">
                {info!.currentStreak}-day streak
                {info!.currentStreak === 1 ? " started" : " — keep it alive"}
              </p>
            </li>
          )}
          {info?.nextDayUnlocked && (
            <li className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <Clock className="size-4.5 shrink-0 text-muted-foreground" aria-hidden />
              <p className="text-sm font-bold text-foreground">
                Next workout unlocks tomorrow — rest and recover today
              </p>
            </li>
          )}
          {info?.planCompleted && (
            <li className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <Trophy className="size-4.5 shrink-0 text-energy" aria-hidden />
              <p className="text-sm font-bold text-foreground">
                Plan complete. Time for a new challenge.
              </p>
            </li>
          )}
        </motion.ul>
      )}

      {/* CTAs */}
      <motion.div
        variants={item}
        className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center"
      >
        <Link
          href="/dashboard"
          className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-8 text-sm font-bold text-background shadow-md transition-transform duration-200 hover:scale-[1.03] active:scale-95"
        >
          Back to Dashboard
        </Link>
        <Link
          href="/reports"
          className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card px-8 text-sm font-bold text-foreground transition-colors duration-200 hover:bg-secondary active:scale-95"
        >
          View Reports
        </Link>
      </motion.div>
    </motion.div>
  );
}
