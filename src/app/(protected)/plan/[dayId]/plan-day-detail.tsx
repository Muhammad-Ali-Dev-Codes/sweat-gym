"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Info,
  Play,
  Wind,
  X,
} from "lucide-react";
import type { PlanDayWithWorkout } from "@/lib/types/database";
import { formatClock } from "@/lib/duration";
import { getPlanDayThumbnail, getWorkoutTypeLabel } from "@/lib/plan-thumbnails";
import { cn } from "@/lib/utils";

type ExerciseEntry = NonNullable<PlanDayWithWorkout["workouts"]>["workout_exercises"][number];
type ExerciseDetail = NonNullable<ExerciseEntry["exercises"]> & {
  duration_seconds?: number | null;
  form_tips?: string[] | null;
  exercise_focus_areas?: { focus_areas: { name: string; slug: string } | null }[];
};

function focusAreas(exercise: ExerciseDetail): string[] {
  return exercise.exercise_focus_areas
    ?.map((relation) => relation.focus_areas?.name)
    .filter((name): name is string => Boolean(name)) ?? [];
}

function breathingTips(exercise: ExerciseDetail): string[] {
  const tips = exercise.instructions?.filter((step) => /breathe|breath|exhale|inhale/i.test(step)) ?? [];
  return tips.length > 0 ? tips : ["Breathe steadily throughout the movement; never hold your breath."];
}

function durationLabel(entry: ExerciseEntry): string {
  const exercise = entry.exercises as ExerciseDetail | null;
  return formatClock(entry.duration_seconds ?? exercise?.duration_seconds ?? 30);
}

function ExerciseDialog({
  entry,
  onClose,
}: {
  entry: ExerciseEntry;
  onClose: () => void;
}) {
  const exercise = entry.exercises as ExerciseDetail | null;
  if (!exercise) return null;

  const areas = focusAreas(exercise);
  const mistakes = exercise.form_tips?.length
    ? exercise.form_tips
    : ["Keep your back neutral and move with control.", "Avoid moving too quickly or using momentum."];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-dialog-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-5 py-4 backdrop-blur sm:px-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">Exercise details</p>
          <button type="button" onClick={onClose} aria-label="Close exercise details" className="grid size-9 place-items-center rounded-full bg-secondary text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="p-5 sm:p-7">
          <div className="grid gap-5 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-start">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary">
              {exercise.animation_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={exercise.animation_url} alt={`${exercise.name} demonstration`} className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center"><Dumbbell className="size-16 text-muted-foreground" aria-hidden /></div>
              )}
            </div>
            <div>
              <h2 id="exercise-dialog-title" className="text-2xl font-black tracking-tight text-foreground">{exercise.name}</h2>
              <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold tabular-nums">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5"><Clock className="size-4" aria-hidden />{durationLabel(entry)}+</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5"><Dumbbell className="size-4" aria-hidden />{entry.sets} set{entry.sets === 1 ? "" : "s"}</span>
                {entry.reps !== null && <span className="rounded-full bg-secondary px-3 py-1.5">{entry.reps} reps</span>}
              </div>
              {areas.length > 0 && <div className="mt-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Focus areas</p><div className="mt-2 flex flex-wrap gap-2">{areas.map((area) => <span key={area} className="rounded-full border border-energy/30 bg-energy/10 px-3 py-1 text-sm font-semibold text-foreground">{area}</span>)}</div></div>}
            </div>
          </div>

          {exercise.instructions && exercise.instructions.length > 0 && <DetailList title="Instructions" icon={<Info className="size-4" aria-hidden />} items={exercise.instructions} numbered />}
          <DetailList title="Common mistakes to avoid" icon={<Check className="size-4" aria-hidden />} items={mistakes} />
          <DetailList title="Breathing tips" icon={<Wind className="size-4" aria-hidden />} items={breathingTips(exercise)} />
        </div>
      </section>
    </div>
  );
}

function DetailList({ title, icon, items, numbered = false }: { title: string; icon: React.ReactNode; items: string[]; numbered?: boolean }) {
  return <section className="mt-7"><h3 className="flex items-center gap-2 text-base font-extrabold text-foreground">{icon}{title}</h3><ol className="mt-3 space-y-2.5">{items.map((item, index) => <li key={`${title}-${index}`} className="flex gap-3 text-sm leading-relaxed text-muted-foreground"><span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-black", numbered ? "bg-primary/10 text-primary" : "bg-secondary text-foreground")}>{numbered ? index + 1 : "•"}</span><span>{item}</span></li>)}</ol></section>;
}

export function PlanDayDetail({ day }: { day: PlanDayWithWorkout }) {
  const [selectedExercise, setSelectedExercise] = useState<ExerciseEntry | null>(null);
  const workout = day.workouts;
  const exercises = [...(workout?.workout_exercises ?? [])].sort((a, b) => a.exercise_order - b.exercise_order);
  const plan = (day as PlanDayWithWorkout & { user_plans?: { plan_duration_days: number; plan_templates?: { name: string } | null } }).user_plans;
  const planDuration = (plan?.plan_duration_days ?? 30) as 30 | 60 | 90;
  const planName = plan?.plan_templates?.name ?? "Your transformation plan";

  return <div className="mx-auto max-w-4xl pb-10 font-(family-name:--font-geist-sans)">
    <Link href="/plan" className="mb-5 inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="size-4" aria-hidden />Back to plan</Link>

    <section className="relative overflow-hidden rounded-3xl bg-zinc-950 text-white shadow-xl shadow-black/15">
      <div className="relative aspect-16/8 min-h-56"><Image src={getPlanDayThumbnail(day.day_number, planDuration)} alt={`${planName}, day ${day.day_number}`} fill priority className="object-cover opacity-70" sizes="(max-width: 768px) 100vw, 896px" /><div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/35 to-transparent" /><div className="absolute inset-x-5 bottom-5 sm:inset-x-8 sm:bottom-7"><p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">{planName} · Day {day.day_number}</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{workout?.name ?? getWorkoutTypeLabel(day.day_number)}</h1></div></div>
      <div className="grid grid-cols-2 gap-px border-t border-white/10 bg-white/10 sm:grid-cols-3"><Metric icon={<Clock className="size-4" />} label="Duration" value={formatClock(day.target_duration_seconds)} /><Metric icon={<Flame className="size-4 text-amber-400" />} label="Calories" value={`${day.target_calories.toLocaleString()} kcal`} /><Metric icon={<Dumbbell className="size-4" />} label="Exercises" value={`${exercises.length}`} /></div>
    </section>

    {workout?.description && <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">{workout.description}</p>}
    <section className="mt-8"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">Today&apos;s session</p><h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">Move through the exercises</h2></div><Link href={`/workout?planDayId=${day.id}&autoStart=1`} className="hidden items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-bold text-background transition-transform hover:scale-[1.02] sm:inline-flex"><Play className="size-4 fill-background" aria-hidden />Start</Link></div>
      <ol className="mt-4 space-y-3">{exercises.map((entry, index) => <li key={entry.id}><button type="button" onClick={() => setSelectedExercise(entry)} className="titan-card group flex w-full items-center gap-4 p-4 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-secondary sm:size-20">{entry.exercises?.animation_url ? <img src={entry.exercises.animation_url} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-lg font-black text-muted-foreground">{index + 1}</span>}<span className="absolute left-1 top-1 grid size-5 place-items-center rounded-md bg-black/65 text-[10px] font-black text-white">{index + 1}</span></span><span className="min-w-0 flex-1"><span className="block truncate text-base font-extrabold text-foreground">{entry.exercises?.name ?? "Exercise"}</span><span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground tabular-nums"><span>{durationLabel(entry)}+</span><span>{entry.sets} set{entry.sets === 1 ? "" : "s"}</span>{entry.reps !== null && <span>{entry.reps} reps</span>}</span></span><ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden /></button></li>)}</ol>
    </section>
    <Link href={`/workout?planDayId=${day.id}&autoStart=1`} className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-base font-bold text-background shadow-lg sm:hidden"><Play className="size-5 fill-background" aria-hidden />Start workout</Link>
    {selectedExercise && <ExerciseDialog entry={selectedExercise} onClose={() => setSelectedExercise(null)} />}
  </div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="bg-zinc-950/80 p-4 sm:p-5"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">{icon}{label}</div><p className="mt-1 text-lg font-black tabular-nums text-white sm:text-xl">{value}</p></div>;
}