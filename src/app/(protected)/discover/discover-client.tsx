"use client";

import { formatClock } from "@/lib/duration";
import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Clock, Flame, Heart, Play, SearchX, ServerCrash, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getVerifiedUser } from "@/lib/supabase/auth-user";
import { getWorkoutThumbnails } from "@/lib/workout-images";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type DiscoverWorkout = {
  id: string;
  name: string;
  description: string | null;
  duration_seconds: number;
  estimated_calories: number;
  categories: { name: string; slug: string }[];
  level: string;
  /** Personalization engine score (server-ranked order). */
  score?: number;
  /** Top-ranked recommendations for this specific user. */
  isPick?: boolean;
};

type DiscoverClientProps = {
  workouts: DiscoverWorkout[];
  initialFavorites: Set<string>;
  loadError?: boolean;
  resumeWorkout?: { id: string; name: string } | null;
};

const COVER_STYLES = [
  "from-zinc-900 via-zinc-900 to-zinc-800",
  "from-zinc-900 via-stone-900 to-stone-800",
  "from-neutral-900 via-neutral-900 to-zinc-800",
  "from-zinc-950 via-zinc-900 to-zinc-800",
  "from-stone-900 via-neutral-900 to-neutral-800",
  "from-zinc-900 via-zinc-800 to-stone-700",
];

const LEVEL_VARIANTS = {
  beginner: "green",
  intermediate: "orange",
  advanced: "pink",
} as const;

function hashIndex(id: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % mod;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 260, damping: 26 },
  },
};

export function DiscoverClient({
  workouts,
  initialFavorites,
  loadError = false,
  resumeWorkout,
}: DiscoverClientProps) {
  const [favorites, setFavorites] = useState<Set<string>>(initialFavorites);

  async function toggleFavorite(workoutId: string) {
    const isFavorite = favorites.has(workoutId);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFavorite) next.delete(workoutId);
      else next.add(workoutId);
      return next;
    });

    const supabase = createClient();
    const user = await getVerifiedUser(supabase);
    if (!user) return;

    // Roll the optimistic state back when persistence fails.
    if (isFavorite) {
      const { error } = await supabase
        .from("favorite_workouts")
        .delete()
        .eq("user_id", user.id)
        .eq("workout_id", workoutId);
      if (error) {
        console.error("Unfavorite failed:", error.message);
        setFavorites((prev) => new Set(prev).add(workoutId));
      }
    } else {
      const { error } = await supabase
        .from("favorite_workouts")
        .insert({ user_id: user.id, workout_id: workoutId });
      if (error) {
        console.error("Favorite failed:", error.message);
        setFavorites((prev) => {
          const next = new Set(prev);
          next.delete(workoutId);
          return next;
        });
      }
    }
  }

  const filtered = workouts;

  // One unique image per workout card: exact name match first, no repeats.
  const thumbnails = useMemo(
    () => getWorkoutThumbnails(filtered.map((w) => w.name)),
    [filtered]
  );

  return (
    <div className="font-[family-name:var(--font-geist-sans)]">
      <PageHeader
        title="Discover"
        subtitle="Ranked for your level, goal, and pace — pick one and press play."
        className="mb-12"
      />

      {loadError && (
        <div
          role="alert"
          className="mb-8 flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"
        >
          <ServerCrash className="size-5 shrink-0" aria-hidden />
          Couldn&apos;t load the workout catalog. Check your connection and try again.
        </div>
      )}

      {resumeWorkout && (
        <Link
          href={`/workout?workoutId=${resumeWorkout.id}`}
          className="group mb-8 flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 outline-none transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/30">
            <Play className="ml-0.5 size-5 fill-current" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              Resume workout
            </span>
            <span className="block truncate text-sm font-extrabold text-foreground">
              {resumeWorkout.name}
            </span>
          </span>
        </Link>
      )}

      <p
        className="mb-8 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground"
        aria-live="polite"
      >
        {filtered.length} {filtered.length === 1 ? "workout" : "workouts"}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card p-16 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="size-8" aria-hidden />
          </span>
          <p className="mt-6 text-lg font-extrabold text-foreground">
            No workouts found
          </p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Check your connection and try again.
          </p>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
          {filtered.map((workout, index) => {
            const thumbnail = thumbnails[index] ?? getWorkoutThumbnails([workout.name])[0];
            const isFavorite = favorites.has(workout.id);

              return (
                <motion.article
                  key={workout.id}
                  layout
                  variants={cardItem}
                  exit={{ opacity: 0, scale: 0.96 }}
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className="group relative overflow-hidden rounded-3xl bg-card shadow-sm transition-shadow duration-500 outline-none hover:shadow-xl hover:shadow-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Link
                    href={`/discover/${workout.id}`}
                    aria-label={`View ${workout.name}`}
                    className="block outline-none"
                  >
                    {/* Cover */}
                    <div
                      className={cn(
                        "relative h-52 overflow-hidden bg-gradient-to-br",
                        COVER_STYLES[hashIndex(workout.id, COVER_STYLES.length)]
                      )}
                    >
                      <Image
                        src={thumbnail}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div
                        aria-hidden
                        className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"
                      />
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                        {workout.isPick ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-black shadow-md">
                            <Sparkles className="size-3" aria-hidden />
                            For you
                          </span>
                        ) : (
                          <span />
                        )}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 pt-14">
                        <div className="flex flex-wrap gap-1.5">
                          {workout.categories.slice(0, 2).map((c) => (
                            <span
                              key={c.slug}
                              className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm"
                            >
                              {c.name}
                            </span>
                          ))}
                        </div>
                        <span className="grid size-12 shrink-0 translate-y-1 place-items-center rounded-full bg-white shadow-lg opacity-90 transition-all duration-300 group-hover:translate-y-0 group-hover:scale-105 group-hover:opacity-100">
                          <Play
                            className="ml-0.5 size-5 fill-black text-black"
                            aria-hidden
                          />
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 pb-7">
                      <h3 className="truncate text-lg font-extrabold tracking-tight text-foreground">
                        {workout.name}
                      </h3>
                      {workout.description && (
                        <p className="mt-2 line-clamp-2 min-h-10 text-[13px] leading-relaxed text-muted-foreground">
                          {workout.description}
                        </p>
                      )}
                      <div className="mt-6 flex items-center gap-4">
                        {workout.level && (
                          <Badge
                            variant={
                              LEVEL_VARIANTS[
                                workout.level as keyof typeof LEVEL_VARIANTS
                              ] ?? "purple"
                            }
                            size="sm"
                            className="capitalize"
                          >
                            {workout.level}
                          </Badge>
                        )}
                        <span className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground tabular-nums">
                          <Clock className="size-4" aria-hidden />
                          {formatClock(workout.duration_seconds)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground tabular-nums">
                          <Flame className="size-4 text-energy" aria-hidden />
                          {workout.estimated_calories.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* Favorite */}
                  <motion.button
                    type="button"
                    aria-label={
                      isFavorite
                        ? `Remove ${workout.name} from favorites`
                        : `Add ${workout.name} to favorites`
                    }
                    aria-pressed={isFavorite}
                    onClick={() => toggleFavorite(workout.id)}
                    whileTap={{ scale: 0.8 }}
                    className="absolute top-4 right-4 z-10 grid size-10 place-items-center rounded-full bg-black/25 backdrop-blur-sm outline-none transition-colors hover:bg-black/40 focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <Heart
                      className={cn(
                        "size-5 transition-colors",
                        isFavorite
                          ? "fill-rose-500 text-rose-500"
                          : "text-white"
                      )}
                      aria-hidden
                    />
                  </motion.button>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
