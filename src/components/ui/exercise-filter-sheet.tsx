"use client";

import { useState } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import type { ExerciseFilters, ExerciseDifficulty } from "@/lib/types/database";

const CATEGORIES = [
  { label: "All", value: "" },
  { label: "Chest", value: "chest" },
  { label: "Arm", value: "arm" },
  { label: "Abs", value: "abs" },
  { label: "Butt & Legs", value: "butt_legs" },
  { label: "Full Body", value: "full_body" },
] as const;

const DIFFICULTIES = [
  { label: "All", value: "" },
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
] as const;

const EQUIPMENT = [
  { label: "All", value: "" },
  { label: "No Equipment", value: "none" },
  { label: "Dumbbells", value: "dumbbells" },
  { label: "Barbell", value: "barbell" },
  { label: "Bench", value: "bench" },
  { label: "Resistance Band", value: "resistance_band" },
  { label: "Kettlebell", value: "kettlebell" },
  { label: "Mat", value: "mat" },
  { label: "Pull-up Bar", value: "pull_up_bar" },
] as const;

const MUSCLES = [
  { label: "All", value: "" },
  { label: "Chest", value: "chest" },
  { label: "Back", value: "latissimus_dorsi" },
  { label: "Shoulders", value: "deltoids" },
  { label: "Biceps", value: "biceps" },
  { label: "Triceps", value: "triceps" },
  { label: "Abs", value: "abdominals" },
  { label: "Glutes", value: "glutes" },
  { label: "Quads", value: "quadriceps" },
  { label: "Hamstrings", value: "hamstrings" },
  { label: "Calves", value: "calves" },
] as const;

const EXERCISE_TYPES = [
  { label: "All", value: "" },
  { label: "Strength", value: "strength" },
  { label: "Cardio", value: "cardio" },
  { label: "Core", value: "core" },
  { label: "Stretching", value: "stretching" },
  { label: "Mobility", value: "mobility" },
  { label: "Warm Up", value: "warm_up" },
] as const;

type FilterSectionProps = {
  label: string;
  options: ReadonlyArray<{ label: string; value: string }>;
  selected: string;
  onSelect: (value: string) => void;
};

function FilterSection({ label, options, selected, onSelect }: FilterSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected === opt.value
                ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type ExerciseFilterSheetProps = {
  filters: ExerciseFilters;
  onApply: (filters: ExerciseFilters) => void;
  onClose: () => void;
  className?: string;
};

function ExerciseFilterSheet({
  filters,
  onApply,
  onClose,
  className,
}: ExerciseFilterSheetProps) {
  const [local, setLocal] = useState<ExerciseFilters>({ ...filters });

  function update(key: keyof ExerciseFilters, value: string) {
    setLocal((prev) => ({ ...prev, [key]: value || undefined }));
  }

  const activeCount = [
    local.category,
    local.difficulty,
    local.muscle,
    local.equipment,
    local.exerciseType,
  ].filter(Boolean).length;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label="Filter exercises"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-border bg-background p-6 shadow-2xl",
          "font-[family-name:var(--font-geist-sans)]",
          className
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden />
            <h2 className="text-lg font-extrabold text-foreground">Filters</h2>
            {activeCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close filters"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-6">
          <FilterSection
            label="Category"
            options={CATEGORIES}
            selected={local.category ?? ""}
            onSelect={(v) => update("category", v)}
          />
          <FilterSection
            label="Difficulty"
            options={DIFFICULTIES}
            selected={local.difficulty ?? ""}
            onSelect={(v) => update("difficulty", v as ExerciseDifficulty)}
          />
          <FilterSection
            label="Equipment"
            options={EQUIPMENT}
            selected={local.equipment ?? ""}
            onSelect={(v) => update("equipment", v)}
          />
          <FilterSection
            label="Muscle"
            options={MUSCLES}
            selected={local.muscle ?? ""}
            onSelect={(v) => update("muscle", v)}
          />
          <FilterSection
            label="Type"
            options={EXERCISE_TYPES}
            selected={local.exerciseType ?? ""}
            onSelect={(v) => update("exerciseType", v)}
          />
        </div>

        <div className="sticky bottom-0 mt-8 flex gap-3">
          {activeCount > 0 && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() =>
                setLocal((prev) => ({
                  ...prev,
                  category: undefined,
                  difficulty: undefined,
                  muscle: undefined,
                  equipment: undefined,
                  exerciseType: undefined,
                }))
              }
            >
              Clear all
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={() => {
              onApply(local);
              onClose();
            }}
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </>
  );
}

export { ExerciseFilterSheet };
export type { ExerciseFilterSheetProps };
