import Link from "next/link";
import { formatClock } from "@/lib/duration";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Flame,
  Dumbbell,
  Timer,
  Play,
  Repeat,
} from "lucide-react";
import { getDiscoverWorkoutWithExercises } from "@/services/discover";
import { Badge } from "@/components/ui/badge";
import { ExerciseAnimationImage } from "./exercise-animation-image";

type WorkoutWithExercises = {
  id: string;
  name: string;
  slug?: string;
  description: string | null;
  duration_seconds: number;
  estimated_calories: number;
  is_active: boolean;
  workout_exercises:
    | {
        id: string;
        exercise_order: number;
        sets: number;
        reps: number | null;
        duration_seconds: number | null;
        rest_seconds: number;
        exercises: {
          id: string;
          name: string;
          animation_url: string | null;
          instructions: string | null;
          exercise_mode: string;
          is_low_impact: boolean;
          requires_jumping: boolean;
        } | null;
      }[]
    | null;
};

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = (await getDiscoverWorkoutWithExercises(
    id
  )) as WorkoutWithExercises | null;

  if (!data || !data.is_active) notFound();

  const exercises = (data.workout_exercises ?? []).sort(
    (a, b) => a.exercise_order - b.exercise_order
  );

  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);

  return (
    <div className="font-[family-name:var(--font-geist-sans)]">
      {/* Hero */}
      <section className="titan-hero relative mb-6 overflow-hidden rounded-2xl p-6 shadow-xl shadow-black/15 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-12 size-56 rounded-full bg-white/8 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-black/40 blur-2xl"
        />

        <Link
          href="/discover"
          aria-label="Back to Discover"
          className="relative inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>

        <h1 className="relative mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-[2.75rem] sm:leading-[1.05]">
          {data.name}
        </h1>
        {data.description && (
          <p className="relative mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            {data.description}
          </p>
        )}

        <div className="relative mt-5 flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3.5 py-1.5 text-sm font-semibold text-zinc-200 tabular-nums">
            <Clock className="size-4" aria-hidden />
            {formatClock(data.duration_seconds)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3.5 py-1.5 text-sm font-semibold text-zinc-200 tabular-nums">
            <Flame className="size-4 text-energy" aria-hidden />
            {data.estimated_calories.toLocaleString()} kcal
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3.5 py-1.5 text-sm font-semibold text-zinc-200 tabular-nums">
            <Dumbbell className="size-4" aria-hidden />
            {exercises.length} exercises
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3.5 py-1.5 text-sm font-semibold text-zinc-200 tabular-nums">
            <Repeat className="size-4" aria-hidden />
            {totalSets} total sets
          </span>
        </div>
      </section>

      {/* Exercise list */}
      <section aria-label="Exercises in this workout" className="mb-28 lg:mb-8">
        <h2 className="mb-3 text-lg font-bold text-foreground">
          Exercises ({exercises.length})
        </h2>

        {exercises.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No exercises have been added to this workout yet.
          </div>
        ) : (
          <ol className="space-y-3">
            {exercises.map((entry, index) => {
              const detail = entry.exercises;
              return (
                <li key={entry.id}>
                  <div className="titan-card flex items-center gap-4 p-4 transition-shadow duration-300 hover:shadow-md">
                    {detail?.animation_url ? (
                      <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-secondary sm:size-20">
                        <ExerciseAnimationImage src={detail.animation_url} />
                        <span className="absolute top-1 left-1 grid size-5 place-items-center rounded-md bg-black/60 text-[10px] font-extrabold text-white backdrop-blur-sm">
                          {index + 1}
                        </span>
                      </span>
                    ) : (
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-base font-extrabold text-secondary-foreground">
                        {index + 1}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-foreground sm:text-base">
                        {detail?.name ?? "Exercise"}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground tabular-nums">
                        <span>
                          {entry.sets} set{entry.sets > 1 ? "s" : ""}
                        </span>
                        {entry.reps !== null ? (
                          <span>{entry.reps} reps</span>
                        ) : entry.duration_seconds ? (
                          <span className="inline-flex items-center gap-1">
                            <Timer className="size-3" aria-hidden />
                            {formatClock(entry.duration_seconds)}
                          </span>
                        ) : null}
                        <span>rest {formatClock(entry.rest_seconds)}</span>
                        {detail?.is_low_impact && (
                          <Badge variant="blue" size="sm">
                            Low impact
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-border/70 bg-background/90 p-3 backdrop-blur-xl lg:sticky lg:bottom-6 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="mx-auto max-w-6xl lg:max-w-md">
          <Link
            href={`/workout?workoutId=${data.id}`}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-foreground px-8 py-3.5 text-base font-bold text-background shadow-lg transition-transform duration-200 hover:scale-[1.02] active:scale-95"
          >
            <Play className="size-5 fill-background" aria-hidden />
            Start Workout
          </Link>
        </div>
      </div>
    </div>
  );
}
