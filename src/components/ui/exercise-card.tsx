"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExerciseWithRelations } from "@/lib/types/database";

type ExerciseCardProps = {
  exercise: ExerciseWithRelations;
  isFavorited?: boolean;
  onFavoriteToggle?: () => void;
  onExerciseClick?: () => void;
  children?: React.ReactNode;
  className?: string;
};

function getMuscleName(exercise: ExerciseWithRelations): string {
  const primary = exercise.exercise_muscles?.find((m) => m.is_primary);
  return primary?.muscles?.name ?? "";
}

function getEquipmentName(exercise: ExerciseWithRelations): string {
  const equip = exercise.exercise_equipment?.[0]?.equipment;
  if (!equip) return "";
  return equip.slug === "none" ? "" : equip.name;
}

function ExerciseCard({
  exercise,
  onExerciseClick,
  children,
  className,
}: ExerciseCardProps) {
  const primaryMuscle = getMuscleName(exercise);
  const equipment = getEquipmentName(exercise);

  const repLabel =
    exercise.exercise_mode === "duration"
      ? `${exercise.duration_seconds ?? 30}s`
      : exercise.default_reps
        ? `${exercise.default_sets ?? 3}×${exercise.default_reps}`
        : null;

  return (
    <div
      data-slot="exercise-card"
      className={cn(
        "titan-card group flex items-center gap-3.5 p-3.5 transition-all duration-200",
        "hover:border-muted-foreground/30",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
        className
      )}
    >
      {onExerciseClick ? (
        <button
          type="button"
          onClick={onExerciseClick}
          aria-label={`View ${exercise.name} exercise details`}
          className="flex min-w-0 flex-1 items-center gap-3.5 text-left outline-none"
        >
          <ExerciseCardContent exercise={exercise} primaryMuscle={primaryMuscle} equipment={equipment} repLabel={repLabel} />
        </button>
      ) : (
        <Link
          href={`/exercises/${exercise.slug}`}
          aria-label={`View ${exercise.name} exercise details`}
          className="flex min-w-0 flex-1 items-center gap-3.5 outline-none"
        >
          <ExerciseCardContent exercise={exercise} primaryMuscle={primaryMuscle} equipment={equipment} repLabel={repLabel} />
        </Link>
      )}
    
      {children && (
        <div className="shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}

function ExerciseCardContent({
  exercise,
  primaryMuscle,
  equipment,
  repLabel,
}: {
  exercise: ExerciseWithRelations;
  primaryMuscle: string;
  equipment: string;
  repLabel: string | null;
}) {
  return <>
        {exercise.animation_url ? (
          <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
            <img
              src={exercise.animation_url}
              alt=""
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
              onError={(e) => {
                e.currentTarget.style.visibility = "hidden";
              }}
            />
          </span>
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-secondary text-lg font-extrabold text-secondary-foreground">
            {exercise.name.charAt(0)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">
            {exercise.name}
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            {repLabel && (
              <span className="tabular-nums">{repLabel}</span>
            )}
            {primaryMuscle && (
              <span className="truncate">{primaryMuscle}</span>
            )}
            {equipment && (
              <span className="truncate">· {equipment}</span>
            )}
          </div>
        </div>

        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
  </>;
}

export { ExerciseCard };
export type { ExerciseCardProps };
