"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  GripVertical,
  Info,
  Minus,
  Plus,
  RefreshCw,
  Play,
  Wind,
  X,
} from "lucide-react";
import type { PlanDayWithWorkout } from "@/lib/types/database";
import { formatClock } from "@/lib/duration";
import { getPlanDayThumbnail, getWorkoutTypeLabel } from "@/lib/plan-thumbnails";
import { cn } from "@/lib/utils";
import { getPlanExerciseRecommendations, savePlanDayEdits, type PlanDayExerciseEdit } from "@/app/actions/plan-day-edit";

type ExerciseEntry = NonNullable<PlanDayWithWorkout["workouts"]>["workout_exercises"][number];
type ExerciseDetail = NonNullable<ExerciseEntry["exercises"]> & {
  duration_seconds?: number | null;
  form_tips?: string[] | null;
  exercise_focus_areas?: { focus_areas: { name: string; slug: string } | null }[];
};
type ExerciseRecommendation = { id: string; name: string; animation_url: string | null; exercise_mode: string; default_reps: number | null; duration_seconds: number | null };

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

function PlanEditorDialog({ entries, planDayId, onClose }: { entries: ExerciseEntry[]; planDayId: string; onClose: () => void }) {
  const [drafts, setDrafts] = useState<PlanDayExerciseEdit[]>(() => entries.map((entry) => ({
    exerciseId: entry.exercises?.id ?? "",
    sets: entry.sets,
    reps: entry.reps,
    durationSeconds: entry.duration_seconds,
    restSeconds: entry.rest_seconds,
  })));
  const [recommendationIndex, setRecommendationIndex] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<ExerciseRecommendation[]>([]);
  const [replacementExercises, setReplacementExercises] = useState<Record<number, ExerciseRecommendation>>({});
  const [recommendationMessage, setRecommendationMessage] = useState("");
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function updateDraft(index: number, field: "reps" | "durationSeconds", amount: number) {
    setDrafts((current) => current.map((draft, draftIndex) => draftIndex === index ? { ...draft, [field]: Math.max(1, (draft[field] ?? 0) + amount) } : draft));
  }

  async function loadRecommendations(index: number) {
    setRecommendationIndex(index);
    setRecommendations([]);
    setRecommendationMessage("");
    setRecommendationsLoading(true);
    try {
      const timeout = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("Recommendation request timed out")), 8_000);
      });
      const result = await Promise.race([
        getPlanExerciseRecommendations(planDayId, drafts[index].exerciseId),
        timeout,
      ]);
      setRecommendations(result.exercises);
      if (result.error) setRecommendationMessage(result.error);
      else if (result.exercises.length === 0) setRecommendationMessage("No compatible replacement exercises were found.");
    } catch {
      setRecommendationMessage("Unable to load replacement exercises. Please try again.");
    } finally {
      setRecommendationsLoading(false);
    }
  }

  function chooseRecommendation(index: number, exercise: ExerciseRecommendation) {
    setReplacementExercises((current) => ({ ...current, [index]: exercise }));
    setDrafts((current) => current.map((draft, draftIndex) => draftIndex === index ? {
      ...draft,
      exerciseId: exercise.id,
      reps: exercise.exercise_mode === "duration" ? null : (draft.reps ?? exercise.default_reps ?? 10),
      durationSeconds: exercise.exercise_mode === "duration" ? (draft.durationSeconds ?? exercise.duration_seconds ?? 30) : null,
    } : draft));
    setRecommendationIndex(null);
  }

  async function save() {
    setSaving(true);
    setMessage("");
    const result = await savePlanDayEdits(planDayId, drafts);
    if (result.error) {
      setMessage(result.error);
      setSaving(false);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="edit-plan-title" className="min-h-screen w-full bg-background">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:px-6">
          <button type="button" onClick={onClose} aria-label="Close edit plan" className="grid size-9 shrink-0 place-items-center rounded-full text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="size-5" aria-hidden /></button>
          <h2 id="edit-plan-title" className="text-xl font-black tracking-tight text-foreground">Edit plan</h2>
        </header>
        <div className="mx-auto max-w-xl px-3 pb-6 sm:px-5">
          {entries.map((entry, index) => {
            const draft = drafts[index];
            const isDuration = draft.reps === null;
            return (
              <div key={entry.id} className="border-b border-border py-3">
                <div className="flex min-h-28 items-center gap-1.5 sm:gap-2.5">
                <button type="button" aria-label={`Reorder ${entry.exercises?.name ?? "exercise"}`} className="shrink-0 text-muted-foreground/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><GripVertical className="size-7" aria-hidden /></button>
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-secondary sm:size-20">
                  {replacementExercises[index]?.animation_url || entry.exercises?.animation_url ? <img src={replacementExercises[index]?.animation_url ?? entry.exercises?.animation_url ?? ""} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-2xl font-black text-muted-foreground">{entry.exercises?.name?.charAt(0) ?? "E"}</span>}
                </div>
                <div className="min-w-0 flex-1 self-stretch py-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-[13px] font-black uppercase leading-tight tracking-tight text-foreground sm:text-base">{replacementExercises[index]?.name ?? entry.exercises?.name ?? "Exercise"}</h3>
                    <button type="button" onClick={() => void loadRecommendations(index)} aria-label={`Replace ${entry.exercises?.name ?? "exercise"}`} className="shrink-0 rounded-full p-1.5 text-teal-600 transition-colors hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-teal-400 dark:hover:bg-teal-950"><RefreshCw className="size-4" aria-hidden /></button>
                  </div>
                  <div className="mt-auto flex items-center gap-1.5 pt-3">
                    <button type="button" onClick={() => updateDraft(index, isDuration ? "durationSeconds" : "reps", -1)} aria-label={`Decrease ${isDuration ? "duration" : "reps"}`} className="grid size-8 place-items-center rounded-lg bg-secondary text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Minus className="size-4" aria-hidden /></button>
                    <span className="min-w-16 text-center text-base font-medium tabular-nums text-foreground">{isDuration ? formatClock(draft.durationSeconds ?? 30) : `x${draft.reps}`}</span>
                    <button type="button" onClick={() => updateDraft(index, isDuration ? "durationSeconds" : "reps", 1)} aria-label={`Increase ${isDuration ? "duration" : "reps"}`} className="grid size-8 place-items-center rounded-lg bg-secondary text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Plus className="size-4" aria-hidden /></button>
                  </div>
                </div>
                </div>
              </div>
            );
          })}
          {message && <p className="mt-4 text-sm font-semibold text-destructive" role="alert">{message}</p>}
          <button type="button" onClick={() => void save()} disabled={saving} className="mt-6 w-full rounded-full bg-energy px-5 py-3 text-sm font-black text-white shadow-lg shadow-energy/20 transition-transform hover:scale-[1.01] disabled:opacity-60">{saving ? "Saving..." : "Save changes"}</button>
        </div>
      </section>
      {recommendationIndex !== null && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={() => setRecommendationIndex(null)}><section role="dialog" aria-modal="true" aria-labelledby="replace-exercise-title" className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-background p-5 shadow-2xl sm:rounded-3xl sm:p-7" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Current: {replacementExercises[recommendationIndex]?.name ?? entries[recommendationIndex].exercises?.name ?? "Exercise"}</p><h3 id="replace-exercise-title" className="mt-2 text-2xl font-black tracking-tight text-foreground">Replace it with...</h3></div><button type="button" onClick={() => setRecommendationIndex(null)} aria-label="Close replacement dialog" className="grid size-9 place-items-center rounded-full bg-secondary text-foreground"><X className="size-5" aria-hidden /></button></div><div className="mt-6 flex items-center gap-2 text-sm font-bold text-energy"><span className="size-2 rounded-full bg-energy" aria-hidden />Recommended</div><div className="mt-3 space-y-2">{recommendations.length > 0 ? recommendations.map((recommendation) => <button key={recommendation.id} type="button" onClick={() => chooseRecommendation(recommendationIndex, recommendation)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-secondary"><span className="size-16 shrink-0 overflow-hidden rounded-lg bg-secondary">{recommendation.animation_url && <img src={recommendation.animation_url} alt="" className="size-full object-cover" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-base font-black uppercase text-foreground">{recommendation.name}</span><span className="mt-1 inline-flex rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">Similar</span></span><span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-muted-foreground/25" aria-hidden /></button>) : <p className="py-8 text-center text-sm text-muted-foreground">{recommendationsLoading ? "Finding compatible exercises..." : recommendationMessage}</p>}</div></section></div>}
    </div>
  );
}

function FocusAreaSkeleton({ areas }: { areas: string[] }) {
  const areaText = areas.length > 0 ? areas.join(", ") : "Full body";
  const matches = (term: string) => areaText.toLowerCase().includes(term);
  const active = (term: string) => matches("full") || matches(term);

  return (
    <section aria-label="Focus areas" className="titan-card mt-8 overflow-hidden p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">Training map</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-foreground">Today&apos;s focus areas</h2>
        </div>
        <div className="flex max-w-sm flex-wrap justify-end gap-2" aria-label={`Focus areas: ${areaText}`}>
          {(areas.length > 0 ? areas : ["Full body"]).map((area) => <span key={area} className="rounded-full bg-energy/10 px-3 py-1 text-xs font-bold text-energy">{area}</span>)}
        </div>
      </div>
      <div className="mt-5 flex flex-col items-center gap-5">
        <div className="mx-auto w-36 rounded-2xl bg-secondary/70 p-3 sm:w-44">
          <svg viewBox="0 0 160 260" role="img" aria-label={`Body focus skeleton showing ${areaText}`} className="h-auto w-full">
            <circle cx="80" cy="22" r="15" fill={active("head") ? "var(--energy)" : "var(--muted-foreground)"} opacity={active("head") ? 1 : 0.35} />
            <path d="M59 42 Q80 35 101 42 L96 105 Q80 111 64 105Z" fill={active("chest") || active("abs") ? "var(--energy)" : "var(--muted-foreground)"} opacity={active("chest") || active("abs") ? 1 : 0.3} />
            <path d="M59 47 L39 54 L27 103 L39 107 L61 75" fill={active("arm") ? "var(--energy)" : "var(--muted-foreground)"} opacity={active("arm") ? 1 : 0.3} />
            <path d="M101 47 L121 54 L133 103 L121 107 L99 75" fill={active("arm") ? "var(--energy)" : "var(--muted-foreground)"} opacity={active("arm") ? 1 : 0.3} />
            <path d="M64 102 L96 102 L100 130 L60 130Z" fill={active("abs") || active("legs") || active("glute") ? "var(--energy)" : "var(--muted-foreground)"} opacity={active("abs") || active("legs") || active("glute") ? 1 : 0.3} />
            <path d="M60 127 L78 130 L74 211 L56 211Z" fill={active("leg") || active("butt") ? "var(--energy)" : "var(--muted-foreground)"} opacity={active("leg") || active("butt") ? 1 : 0.3} />
            <path d="M82 130 L100 127 L104 211 L86 211Z" fill={active("leg") || active("butt") ? "var(--energy)" : "var(--muted-foreground)"} opacity={active("leg") || active("butt") ? 1 : 0.3} />
            <path d="M56 209 L74 209 L77 228 L52 228Z M86 209 L104 209 L108 228 L83 228Z" fill={active("leg") ? "var(--energy)" : "var(--muted-foreground)"} opacity={active("leg") ? 1 : 0.3} />
            <path d="M80 39 V132 M54 57 L80 68 L106 57 M58 78 L80 88 L102 78 M62 101 L80 111 L98 101 M60 127 L80 137 L100 127" fill="none" stroke="var(--background)" strokeWidth="2" opacity="0.7" />
          </svg>
        </div>
        <div className="w-full max-w-md space-y-3 text-center">
          <p className="text-sm leading-relaxed text-muted-foreground">This session emphasizes the highlighted regions. Move with control and stop if you feel sharp or unusual pain.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-bold text-muted-foreground"><span className="inline-flex items-center gap-2"><span className="size-3 rounded-full bg-energy" aria-hidden />Primary focus</span><span className="inline-flex items-center gap-2"><span className="size-3 rounded-full bg-muted-foreground/30" aria-hidden />Supporting areas</span></div>
        </div>
      </div>
    </section>
  );
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
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const workout = day.workouts;
  const exercises = [...(workout?.workout_exercises ?? [])].sort((a, b) => a.exercise_order - b.exercise_order);
  const plan = (day as PlanDayWithWorkout & { user_plans?: { plan_duration_days: number; plan_templates?: { name: string } | null } }).user_plans;
  const planDuration = (plan?.plan_duration_days ?? 30) as 30 | 60 | 90;
  const planName = plan?.plan_templates?.name ?? "Your transformation plan";
  const focusAreas = [...new Set(exercises.flatMap((entry) => entry.exercises?.exercise_focus_areas?.map((relation) => relation.focus_areas?.name).filter((name): name is string => Boolean(name)) ?? []))];

  return <div className="mx-auto max-w-4xl pb-10 font-(family-name:--font-geist-sans)">
    <Link href="/plan" className="mb-5 inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="size-4" aria-hidden />Back to plan</Link>

    <section className="relative overflow-hidden rounded-3xl bg-zinc-950 text-white shadow-xl shadow-black/15">
      <div className="relative aspect-16/8 min-h-56"><Image src={getPlanDayThumbnail(day.day_number, planDuration)} alt={`${planName}, ${getWorkoutTypeLabel(day.day_number)}`} fill priority className="object-cover" sizes="(max-width: 768px) 100vw, 896px" /><div className="absolute inset-0 bg-linear-to-t from-zinc-950/85 via-zinc-950/15 to-transparent" /><div className="absolute inset-x-5 bottom-5 sm:inset-x-8 sm:bottom-7"><p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">{planName} · Day {day.day_number}</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{workout?.name ?? getWorkoutTypeLabel(day.day_number)}</h1></div></div>
      <div className="grid grid-cols-2 gap-px border-t border-white/10 bg-white/10 sm:grid-cols-3"><Metric icon={<Clock className="size-4" />} label="Duration" value={formatClock(day.target_duration_seconds)} /><Metric icon={<Flame className="size-4 text-amber-400" />} label="Calories" value={`${day.target_calories.toLocaleString()} kcal`} /><Metric icon={<Dumbbell className="size-4" />} label="Exercises" value={`${exercises.length}`} /></div>
    </section>

    {workout?.description && <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">{workout.description}</p>}
    <FocusAreaSkeleton areas={focusAreas} />
    <section className="mt-8"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">Today&apos;s session</p><h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">Move through the exercises</h2></div><Link href={`/workout?planDayId=${day.id}&autoStart=1`} className="hidden items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-bold text-background transition-transform hover:scale-[1.02] sm:inline-flex"><Play className="size-4 fill-background" aria-hidden />Start</Link></div>
      <div className="mt-8 flex items-center justify-between border-b border-border pb-4"><h3 className="text-2xl font-black tracking-tight text-foreground">Exercises <span className="font-semibold text-muted-foreground">({exercises.length})</span></h3><button type="button" onClick={() => setIsEditingPlan(true)} className="inline-flex items-center gap-1 text-base font-semibold text-teal-600 transition-colors hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-teal-400 dark:hover:text-teal-300"><span>Edit</span><ChevronRight className="size-4" aria-hidden /></button></div>
      <ol className="mt-4 space-y-3">{exercises.map((entry, index) => <li key={entry.id}><button type="button" onClick={() => setSelectedExercise(entry)} className="titan-card group flex w-full items-center gap-4 p-4 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-secondary sm:size-20">{entry.exercises?.animation_url ? <img src={entry.exercises.animation_url} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-lg font-black text-muted-foreground">{index + 1}</span>}<span className="absolute left-1 top-1 grid size-5 place-items-center rounded-md bg-black/65 text-[10px] font-black text-white">{index + 1}</span></span><span className="min-w-0 flex-1"><span className="block truncate text-base font-extrabold text-foreground">{entry.exercises?.name ?? "Exercise"}</span><span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground tabular-nums"><span>{durationLabel(entry)}+</span><span>{entry.sets} set{entry.sets === 1 ? "" : "s"}</span>{entry.reps !== null && <span>{entry.reps} reps</span>}</span></span><ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden /></button></li>)}</ol>
    </section>
    <Link href={`/workout?planDayId=${day.id}&autoStart=1`} className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-base font-bold text-background shadow-lg sm:hidden"><Play className="size-5 fill-background" aria-hidden />Start workout</Link>
    {selectedExercise && <ExerciseDialog entry={selectedExercise} onClose={() => setSelectedExercise(null)} />}
    {isEditingPlan && <PlanEditorDialog entries={exercises} planDayId={day.id} onClose={() => setIsEditingPlan(false)} />}
  </div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="bg-zinc-950/80 p-4 sm:p-5"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">{icon}{label}</div><p className="mt-1 text-lg font-black tabular-nums text-white sm:text-xl">{value}</p></div>;
}