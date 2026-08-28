"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Check, Clock, Copy, Dumbbell, GripVertical, Info, Play, Plus, Save, Trash2, Wind, X, Zap } from "lucide-react";
import { useExerciseLibrary } from "@/hooks/use-exercises";
import { ExerciseCard } from "@/components/ui/exercise-card";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/page-header";
import { deleteCustomWorkout, saveCustomWorkout } from "@/app/actions/custom-workout";
import type { ExerciseWithRelations } from "@/lib/types/database";
import type { CustomWorkout } from "@/services/workout/custom";

type BuilderExercise = {
  exerciseId: string;
  name: string;
  mode: string;
  sets: number;
  reps: number | null;
  durationSeconds: number | null;
  restSeconds: number;
  animationUrl: string | null;
};

function ExerciseDetailsDialog({ exercise, open, onClose }: { exercise: ExerciseWithRelations; open: boolean; onClose: () => void }) {
  const focusAreas = exercise.exercise_focus_areas
    ?.map((relation) => relation.focus_areas?.name)
    .filter((name): name is string => Boolean(name)) ?? [];
  const instructions = exercise.instructions ?? [];
  const formTips = exercise.form_tips?.length
    ? exercise.form_tips
    : ["Keep your back neutral and move with control.", "Avoid moving too quickly or using momentum."];
  const safetyNotes = exercise.safety_notes ?? [];
  const breathingTips = instructions.filter((step) => /breathe|breath|exhale|inhale/i.test(step));

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogPopup className="max-h-[92vh] w-full max-w-2xl overflow-y-auto p-0">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-5 py-4 backdrop-blur sm:px-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">Exercise details</p>
          <DialogClose onClick={onClose} aria-label="Close exercise details"><X className="size-5" aria-hidden /></DialogClose>
        </div>
        <div className="p-5 sm:p-7">
          <div className="grid gap-5 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-start">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary">
              {exercise.animation_url ? <img src={exercise.animation_url} alt={`${exercise.name} demonstration`} className="size-full object-cover" /> : <div className="grid size-full place-items-center"><Dumbbell className="size-16 text-muted-foreground" aria-hidden /></div>}
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight text-foreground">{exercise.name}</DialogTitle>
              {exercise.description && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{exercise.description}</p>}
              <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold tabular-nums">
                {exercise.exercise_mode === "duration" ? <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5"><Clock className="size-4" aria-hidden />{exercise.duration_seconds ?? 30}s</span> : exercise.default_reps && <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5"><Dumbbell className="size-4" aria-hidden />{exercise.default_sets ?? 3} x {exercise.default_reps}</span>}
                {exercise.difficulty && <span className="rounded-full bg-secondary px-3 py-1.5 capitalize">{exercise.difficulty}</span>}
              </div>
              {focusAreas.length > 0 && <div className="mt-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Focus areas</p><div className="mt-2 flex flex-wrap gap-2">{focusAreas.map((area) => <span key={area} className="rounded-full border border-energy/30 bg-energy/10 px-3 py-1 text-sm font-semibold text-foreground">{area}</span>)}</div></div>}
            </div>
          </div>
          {instructions.length > 0 && <DetailList title="Instructions" icon={<Info className="size-4" aria-hidden />} items={instructions} numbered />}
          <DetailList title="Common mistakes to avoid" icon={<Check className="size-4" aria-hidden />} items={formTips} />
          <DetailList title="Breathing tips" icon={<Wind className="size-4" aria-hidden />} items={breathingTips.length > 0 ? breathingTips : ["Breathe steadily throughout the movement; never hold your breath."]} />
          {safetyNotes.length > 0 && <DetailList title="Safety notes" icon={<Info className="size-4" aria-hidden />} items={safetyNotes} />}
        </div>
      </DialogPopup>
    </Dialog>
  );
}

function DetailList({ title, icon, items, numbered = false }: { title: string; icon: React.ReactNode; items: string[]; numbered?: boolean }) {
  return <section className="mt-7"><h3 className="flex items-center gap-2 text-base font-extrabold text-foreground">{icon}{title}</h3><ol className="mt-3 space-y-2.5">{items.map((item, index) => <li key={`${title}-${index}`} className="flex gap-3 text-sm leading-relaxed text-muted-foreground"><span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-black ${numbered ? "bg-primary/10 text-primary" : "bg-secondary text-foreground"}`}>{numbered ? index + 1 : "•"}</span><span>{item}</span></li>)}</ol></section>;
}

function fromWorkout(workout: CustomWorkout): BuilderExercise[] {
  return [...workout.workout_exercises].sort((a, b) => a.exercise_order - b.exercise_order).map((item) => ({
    exerciseId: item.exercise_id,
    name: item.exercises?.name ?? "Exercise",
    mode: item.exercises?.exercise_mode ?? "reps",
    sets: item.sets,
    reps: item.reps,
    durationSeconds: item.duration_seconds,
    restSeconds: item.rest_seconds,
    animationUrl: item.exercises?.animation_url ?? null,
  }));
}

export function CustomWorkoutsClient({ initialWorkouts }: { initialWorkouts: CustomWorkout[] }) {
  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [name, setName] = useState("My Custom Workout");
  const [description, setDescription] = useState("");
  const [builderExercises, setBuilderExercises] = useState<BuilderExercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithRelations | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const builderRef = useRef<HTMLElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useExerciseLibrary({ search: search || undefined, sort: "name" });
  const library = useMemo(() => data?.pages.flatMap((page) => page.exercises) ?? [], [data]);
  const estimatedMinutes = Math.max(1, Math.round(builderExercises.reduce((total, exercise) => total + (exercise.durationSeconds ?? 60) * exercise.sets + exercise.restSeconds * Math.max(0, exercise.sets - 1), 0) / 60));

  function resetBuilder() {
    setSelectedId(undefined);
    setName("My Custom Workout");
    setDescription("");
    setBuilderExercises([]);
    setMessage("");
  }

  function startNewWorkout() {
    resetBuilder();
    requestAnimationFrame(() => {
      builderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      nameInputRef.current?.focus();
    });
  }

  function editWorkout(workout: CustomWorkout, duplicate = false) {
    setSelectedId(duplicate ? undefined : workout.id);
    setName(duplicate ? `${workout.name} copy` : workout.name);
    setDescription(workout.description ?? "");
    setBuilderExercises(fromWorkout(workout));
    setMessage("");
  }

  function addExercise(exercise: ExerciseWithRelations) {
    if (builderExercises.some((item) => item.exerciseId === exercise.id)) return;
    setBuilderExercises((current) => [...current, {
      exerciseId: exercise.id,
      name: exercise.name,
      mode: exercise.exercise_mode,
      sets: exercise.default_sets ?? 3,
      reps: exercise.exercise_mode === "duration" ? null : (exercise.default_reps ?? 10),
      durationSeconds: exercise.exercise_mode === "duration" ? (exercise.duration_seconds ?? 30) : null,
      restSeconds: exercise.default_rest_seconds ?? 30,
      animationUrl: exercise.animation_url,
    }]);
  }

  function updateExercise(index: number, field: "sets" | "reps" | "durationSeconds" | "restSeconds", value: string) {
    const numeric = Math.max(0, Number(value) || 0);
    setBuilderExercises((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: numeric } : item));
  }

  function moveExercise(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= builderExercises.length) return;
    setBuilderExercises((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    setMessage("");
    const result = await saveCustomWorkout({
      id: selectedId,
      name,
      description: description || null,
      exercises: builderExercises.map(({ exerciseId, sets, reps, durationSeconds, restSeconds }) => ({ exerciseId, sets, reps, durationSeconds, restSeconds })),
    });
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage("Workout saved");
    window.location.reload();
  }

  async function removeWorkout(workoutId: string) {
    if (!window.confirm("Delete this custom workout?")) return;
    const result = await deleteCustomWorkout(workoutId);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setWorkouts((current) => current.filter((workout) => workout.id !== workoutId));
    if (selectedId === workoutId) resetBuilder();
  }

  return (
    <div className="font-[family-name:var(--font-geist-sans)]">
      <PageHeader title="Custom Workouts" subtitle="Build sessions from the exercise library and make them yours." className="mb-8" />
      <div className="space-y-6">
      <aside className="overflow-hidden rounded-3xl border border-orange-100 bg-[#fffaf5] text-foreground shadow-xl shadow-orange-950/5">
        <div className="flex flex-col gap-4 border-b border-orange-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-orange-500 text-white"><Dumbbell className="size-4" /></span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Your vault</p>
              <h2 className="mt-1 text-lg font-extrabold">Saved workouts <span className="ml-1 text-sm font-semibold text-muted-foreground">{workouts.length}</span></h2>
            </div>
          </div>
          <Button onClick={startNewWorkout} className="w-full bg-orange-500 text-white shadow-lg shadow-orange-950/30 hover:bg-orange-400 sm:w-auto"><Plus className="size-4" />Create workout</Button>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-7">
          {workouts.map((workout) => (
            <div key={workout.id} className={`group flex min-w-0 items-center gap-3 rounded-2xl border p-3 transition-colors ${selectedId === workout.id ? "border-orange-300 bg-orange-100/70" : "border-orange-100 bg-white hover:border-orange-200 hover:bg-orange-50/60"}`}>
              <button type="button" onClick={() => editWorkout(workout)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-bold text-foreground">{workout.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{workout.workout_exercises.length} exercises · {workout.estimated_calories} kcal</p>
              </button>
              <button type="button" onClick={() => editWorkout(workout, true)} aria-label={`Duplicate ${workout.name}`} className="rounded-lg p-2 text-muted-foreground hover:bg-orange-100 hover:text-foreground"><Copy className="size-4" /></button>
              <button type="button" onClick={() => removeWorkout(workout.id)} aria-label={`Delete ${workout.name}`} className="rounded-lg p-2 text-muted-foreground hover:bg-red-100 hover:text-red-600"><Trash2 className="size-4" /></button>
            </div>
          ))}
          {workouts.length === 0 && <p className="w-full rounded-2xl border border-dashed border-orange-200 p-5 text-center text-sm text-muted-foreground">No custom workouts yet. Create your first session above.</p>}
        </div>
      </aside>

        <main ref={builderRef} className="titan-card min-w-0 scroll-mt-6 overflow-hidden">
          <div className="bg-linear-to-br from-orange-500/12 via-transparent to-amber-400/8 px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-orange-600 dark:text-orange-400">Workout blueprint</p>
              <input ref={nameInputRef} value={name} onChange={(event) => setName(event.target.value)} placeholder="Workout name" aria-label="Workout name" className="w-full bg-transparent text-3xl font-black tracking-tight text-foreground outline-none placeholder:text-muted-foreground/60" />
              <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add a short description" aria-label="Workout description" className="mt-2 w-full bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/60" />
            </div>
            <Button onClick={save} disabled={!name.trim() || builderExercises.length === 0} className="bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-400"><Save className="size-4" />Save</Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-foreground px-3 py-1.5 text-background">{builderExercises.length} exercises</span>
            <span className="rounded-full bg-background/70 px-3 py-1.5 text-muted-foreground">{estimatedMinutes} min estimated</span>
            <span className="rounded-full bg-background/70 px-3 py-1.5 text-muted-foreground">{builderExercises.reduce((total, exercise) => total + exercise.sets, 0)} total sets</span>
          </div>
          </div>
          {message && <p className="mt-3 text-sm font-semibold text-energy" role="status">{message}</p>}
          <div className="space-y-2 p-5 sm:p-7">
            {builderExercises.length === 0 && <div className="rounded-xl border border-dashed border-border p-10 text-center"><Dumbbell className="mx-auto size-8 text-muted-foreground/50" /><p className="mt-3 text-sm font-bold text-foreground">Your workout is empty</p><p className="mt-1 text-xs text-muted-foreground">Add exercises from the library.</p></div>}
            {builderExercises.map((exercise, index) => (
              <div key={exercise.exerciseId} className="rounded-xl border border-border bg-secondary/40 p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <GripVertical className="size-4 shrink-0 text-muted-foreground/60" aria-hidden />
                  {exercise.animationUrl ? <img src={exercise.animationUrl} alt="" className="size-12 rounded-lg object-cover" /> : <span className="grid size-12 place-items-center rounded-lg bg-muted text-sm font-black text-muted-foreground">{exercise.name.charAt(0)}</span>}
                  <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{exercise.name}</p>
                  <button type="button" onClick={() => moveExercise(index, -1)} aria-label={`Move ${exercise.name} up`} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><ArrowUp className="size-4" /></button>
                  <button type="button" onClick={() => moveExercise(index, 1)} aria-label={`Move ${exercise.name} down`} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><ArrowDown className="size-4" /></button>
                  <button type="button" onClick={() => setBuilderExercises((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${exercise.name}`} className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"><X className="size-4" /></button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 pl-7 sm:grid-cols-4">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sets<input type="number" min="1" max="20" value={exercise.sets} onChange={(event) => updateExercise(index, "sets", event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-bold text-foreground" /></label>
                  {exercise.mode === "duration" ? <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Seconds<input type="number" min="1" value={exercise.durationSeconds ?? 30} onChange={(event) => updateExercise(index, "durationSeconds", event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-bold text-foreground" /></label> : <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reps<input type="number" min="1" value={exercise.reps ?? 10} onChange={(event) => updateExercise(index, "reps", event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-bold text-foreground" /></label>}
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rest sec<input type="number" min="0" value={exercise.restSeconds} onChange={(event) => updateExercise(index, "restSeconds", event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-bold text-foreground" /></label>
                </div>
              </div>
            ))}
          </div>
          {selectedId && <Link href={`/workout?workoutId=${selectedId}&source=custom`} className="mx-5 mb-5 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-bold text-background shadow-lg sm:mx-7 sm:mb-7"><Play className="size-4" />Start custom workout</Link>}
        </main>

        <aside className="titan-card min-w-0 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-energy/10 text-energy"><Zap className="size-4" fill="currentColor" aria-hidden /></span>
            <div><h2 className="text-sm font-extrabold text-foreground">Exercise library</h2><p className="mt-0.5 text-xs text-muted-foreground">Add your next movement</p></div>
          </div>
          <SearchBar value={search} onChange={setSearch} placeholder="Find an exercise..." />
          <div className="space-y-2">
            {library.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} onExerciseClick={() => setSelectedExercise(exercise)}><Button variant="outline" size="icon" onClick={() => addExercise(exercise)} aria-label={`Add ${exercise.name}`}><Plus className="size-4" /></Button></ExerciseCard>)}
          </div>
          {hasNextPage && <Button variant="outline" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage} className="mt-4 w-full">{isFetchingNextPage ? "Loading exercises..." : "Load more exercises"}</Button>}
        </aside>
      </div>
      {selectedExercise && <ExerciseDetailsDialog exercise={selectedExercise} open={Boolean(selectedExercise)} onClose={() => setSelectedExercise(null)} />}
    </div>
  );
}
