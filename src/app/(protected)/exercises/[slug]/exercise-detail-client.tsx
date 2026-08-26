"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  Dumbbell,
  Target,
  Flame,
} from "lucide-react";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { ExerciseCard } from "@/components/ui/exercise-card";
import { useToggleExerciseFavorite, useExerciseFavorites } from "@/hooks/use-exercises";
import type { ExerciseWithRelations } from "@/lib/types/database";

const LEVEL_VARIANTS: Record<string, BadgeProps["variant"]> = {
  beginner: "green",
  intermediate: "orange",
  advanced: "pink",
};

const TYPE_LABELS: Record<string, string> = {
  strength: "Strength",
  cardio: "Cardio",
  core: "Core",
  mobility: "Mobility",
  stretching: "Stretching",
  warm_up: "Warm Up",
  cool_down: "Cool Down",
  balance: "Balance",
};

function getPrimaryMuscles(exercise: ExerciseWithRelations): string[] {
  return (
    exercise.exercise_muscles
      ?.filter((m) => m.is_primary)
      .map((m) => m.muscles?.name)
      .filter(Boolean) as string[] ?? []
  );
}

function getSecondaryMuscles(exercise: ExerciseWithRelations): string[] {
  return (
    exercise.exercise_muscles
      ?.filter((m) => !m.is_primary)
      .map((m) => m.muscles?.name)
      .filter(Boolean) as string[] ?? []
  );
}

function getEquipmentNames(exercise: ExerciseWithRelations): string[] {
  return (
    exercise.exercise_equipment
      ?.map((e) => e.equipment?.name)
      .filter(Boolean) as string[] ?? []
  );
}

function getFocusAreaName(exercise: ExerciseWithRelations): string {
  return exercise.exercise_focus_areas?.[0]?.focus_areas?.name ?? "";
}

type Props = {
  exercise: ExerciseWithRelations;
  initialIsFavorited: boolean;
  userId: string;
  relatedExercises: ExerciseWithRelations[];
};

export function ExerciseDetailClient({
  exercise,
  initialIsFavorited,
  userId,
  relatedExercises,
}: Props) {
  const toggleFav = useToggleExerciseFavorite(userId);
  const { data: favoriteIds } = useExerciseFavorites(userId);
  const isFavorited = favoriteIds?.has(exercise.id) ?? initialIsFavorited;

  const primaryMuscles = getPrimaryMuscles(exercise);
  const secondaryMuscles = getSecondaryMuscles(exercise);
  const allMuscles = [...primaryMuscles, ...secondaryMuscles];
  const equipmentNames = getEquipmentNames(exercise);
  const focusArea = getFocusAreaName(exercise);
  const difficultyLabel =
    (exercise.difficulty ?? "beginner").charAt(0).toUpperCase() + (exercise.difficulty ?? "beginner").slice(1);
  const levelVariant = LEVEL_VARIANTS[exercise.difficulty ?? "beginner"] ?? "purple";
  const typeLabel = TYPE_LABELS[exercise.exercise_type ?? "strength"] ?? exercise.exercise_type ?? "Strength";

  const hasWorkoutParams =
    exercise.default_sets ||
    exercise.default_reps ||
    exercise.duration_seconds ||
    exercise.default_rest_seconds;

  return (
    <div className="font-[family-name:var(--font-geist-sans)]">
      {/* Back navigation */}
      <Link
        href="/exercises"
        className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Exercises
      </Link>

      {/* Hero image area */}
      <section className="titan-hero relative mb-6 overflow-hidden rounded-2xl p-6 shadow-xl shadow-black/15 sm:p-8">
        {exercise.animation_url ? (
          <div className="relative mx-auto aspect-square w-full max-w-[200px] overflow-hidden rounded-xl bg-secondary shadow-lg sm:max-w-[240px]">
            <img
              src={exercise.animation_url}
              alt={`${exercise.name} exercise demonstration`}
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
              onError={(e) => {
                e.currentTarget.style.visibility = "hidden";
              }}
            />
          </div>
        ) : (
          <div className="relative mx-auto grid aspect-square w-full max-w-[200px] place-items-center rounded-xl bg-white/8 backdrop-blur-sm sm:max-w-[240px]">
            <Dumbbell className="size-16 text-zinc-400" aria-hidden />
          </div>
        )}

        {/* Favorite button */}
        <div className="absolute top-4 right-4">
          <FavoriteButton
            isFavorited={isFavorited}
            exerciseName={exercise.name}
            size="md"
            onClick={() =>
              toggleFav.mutate({
                exerciseId: exercise.id,
                isFavorited,
              })
            }
          />
        </div>

        {/* Rep/duration badge */}
        {(exercise.default_reps || exercise.duration_seconds) && (
          <div className="absolute bottom-10 right-10">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
              {exercise.exercise_mode === "duration"
                ? `${exercise.duration_seconds ?? 30}s`
                : `${exercise.default_sets ?? 3}×${exercise.default_reps}`}
            </span>
          </div>
        )}
      </section>

      {/* Title + metadata */}
      <section className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {exercise.name}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={levelVariant} size="md" className="capitalize">
            {difficultyLabel}
          </Badge>
          {allMuscles.length > 0 && (
            <span className="text-sm font-medium text-muted-foreground">
              {allMuscles.join(" · ")}
            </span>
          )}
        </div>
      </section>

      {/* Metadata cards */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetaCard
          icon={<Shield className="size-4 text-emerald-500" aria-hidden />}
          label="Difficulty"
          value={difficultyLabel}
        />
        <MetaCard
          icon={<Target className="size-4 text-blue-500" aria-hidden />}
          label="Targets"
          value={allMuscles.length > 0 ? allMuscles.join(", ") : focusArea || "Full Body"}
        />
        <MetaCard
          icon={<Dumbbell className="size-4 text-purple-500" aria-hidden />}
          label="Equipment"
          value={
            equipmentNames.length > 0
              ? equipmentNames.filter((n) => n !== "None").join(", ") || "No Equipment"
              : "No Equipment"
          }
        />
        <MetaCard
          icon={<Flame className="size-4 text-orange-500" aria-hidden />}
          label="Type"
          value={typeLabel}
        />
      </section>

      {/* Overview */}
      {exercise.description && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold text-foreground">Overview</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {exercise.description}
          </p>
        </section>
      )}

      {/* Workout parameters */}
      {hasWorkoutParams && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold text-foreground">Suggested Workout</h2>
          <div className="flex flex-wrap gap-3">
            {exercise.default_sets && (
              <ParamChip value={`${exercise.default_sets}`} label="Sets" />
            )}
            {exercise.default_reps && (
              <ParamChip value={`${exercise.default_reps}`} label="Reps" />
            )}
            {exercise.duration_seconds && (
              <ParamChip value={`${exercise.duration_seconds}s`} label="Duration" />
            )}
            {exercise.default_rest_seconds && (
              <ParamChip value={`${exercise.default_rest_seconds}s`} label="Rest" />
            )}
            {exercise.calories_estimate && (
              <ParamChip value={`~${exercise.calories_estimate}`} label="kcal" />
            )}
          </div>
        </section>
      )}

      {/* Instructions */}
      {exercise.instructions && exercise.instructions.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-foreground">How to Perform</h2>
          <ol className="space-y-4">
            {exercise.instructions.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="pt-1 text-sm leading-relaxed text-muted-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Form Tips */}
      {exercise.form_tips && exercise.form_tips.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold text-foreground">Form Tips</h2>
          <ul className="space-y-2">
            {exercise.form_tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                {tip}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Safety Notes */}
      {exercise.safety_notes && exercise.safety_notes.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-foreground">
            <AlertTriangle className="size-5 text-amber-500" aria-hidden />
            Safety
          </h2>
          <ul className="space-y-2">
            {exercise.safety_notes.map((note, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                {note}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Related Exercises */}
      {relatedExercises.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-foreground">Related Exercises</h2>
          <div className="space-y-2">
            {relatedExercises.map((related) => (
              <ExerciseCard key={related.id} exercise={related} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MetaCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-1.5 flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold text-foreground capitalize">{value}</p>
    </div>
  );
}

function ParamChip({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
      <span className="text-lg font-extrabold text-foreground">{value}</span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
