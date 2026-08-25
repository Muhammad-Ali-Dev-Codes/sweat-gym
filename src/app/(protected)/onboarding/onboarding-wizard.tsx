"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Dumbbell,
  Flame,
  Gauge,
  Loader2,
  Ruler,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { submitOnboarding } from "@/app/actions/onboarding";
import { ProgressRing } from "@/components/ui/progress-ring";
import { buildPlanOptions } from "@/lib/weight-loss";
import { cn } from "@/lib/utils";

type FitnessLevel = "beginner" | "intermediate" | "advanced";

type PushUpAbility = "unable" | "0_5" | "5_10" | "10_20" | "20_plus";
type PlankAbility = "unable" | "0_30" | "30_60" | "60_120" | "120_plus";

const STEPS = [
  { title: "Fitness level", icon: Gauge },
  { title: "Push-ups", icon: Dumbbell },
  { title: "Plank", icon: Timer },
  { title: "Body metrics", icon: Ruler },
  { title: "Your plan", icon: Target },
  { title: "Restrictions", icon: ShieldCheck },
] as const;

const PLAN_STEP = 4;

const LEVEL_OPTIONS: {
  value: FitnessLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "beginner",
    label: "Beginner",
    description: "New to training or getting back into it",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Comfortable with regular workouts",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Training consistently for over a year",
  },
];

const PUSH_UP_OPTIONS: {
  value: PushUpAbility;
  label: string;
  description: string;
}[] = [
  { value: "unable", label: "Can't yet", description: "Not able to do one full push-up" },
  { value: "0_5", label: "1–5", description: "A few solid reps" },
  { value: "5_10", label: "5–10", description: "Getting comfortable" },
  { value: "10_20", label: "10–20", description: "Strong and steady" },
  { value: "20_plus", label: "20+", description: "Push-up machine" },
];

const PLANK_OPTIONS: {
  value: PlankAbility;
  label: string;
  description: string;
}[] = [
  { value: "unable", label: "Can't yet", description: "Haven't tried or can't hold" },
  { value: "0_30", label: "Under 30s", description: "Short holds" },
  { value: "30_60", label: "30–60s", description: "Solid core control" },
  { value: "60_120", label: "1–2 min", description: "Strong plank" },
  { value: "120_plus", label: "2+ min", description: "Core of steel" },
];

const RESTRICTION_OPTIONS = [
  {
    slug: "low_impact",
    label: "Low impact only",
    description: "Avoid high-impact jumping movements",
  },
  {
    slug: "no_jumping",
    label: "No jumping",
    description: "Keep both feet on the ground",
  },
];

const PLAN_TIER_META = [
  {
    title: "4 KG PLAN",
    daysLabel: "30 Days",
    blurb: "A shorter structured fitness journey.",
  },
  {
    title: "8 KG PLAN",
    daysLabel: "60 Days",
    blurb: "A longer structured progression.",
  },
  {
    title: "12 KG PLAN",
    daysLabel: "90 Days",
    blurb: "An extended structured progression.",
  },
] as const;

// Draft persistence: a refresh mid-onboarding restores the answers instead
// of restarting from step 1. Cleared once onboarding completes.
const DRAFT_STORAGE_KEY = "titan-onboarding-draft-v1";

interface WizardDraft {
  step: number;
  age: string;
  fitnessLevel: FitnessLevel | null;
  pushUpAbility: PushUpAbility | null;
  plankAbility: PlankAbility | null;
  heightCm: number;
  currentWeightKg: number;
  planChoiceIndex: number | null;
  restrictions: string[];
}

function loadWizardDraft(): Partial<WizardDraft> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WizardDraft>;

    // Defensive re-validation — a corrupted or hand-edited draft must never
    // wedge the wizard into an invalid state.
    const draft: Partial<WizardDraft> = {};
    if (typeof parsed.step === "number" && parsed.step >= 0 && parsed.step <= 5) {
      draft.step = Math.floor(parsed.step);
    }
    if (typeof parsed.age === "string") {
      const n = Number(parsed.age);
      if (parsed.age === "" || (Number.isInteger(n) && n >= 10 && n <= 120)) {
        draft.age = parsed.age;
      }
    }
    if (
      parsed.fitnessLevel === null ||
      (typeof parsed.fitnessLevel === "string" &&
        ["beginner", "intermediate", "advanced"].includes(parsed.fitnessLevel))
    ) {
      draft.fitnessLevel = parsed.fitnessLevel as FitnessLevel | null;
    }
    const abilityOk = (v: unknown, allowed: string[]) =>
      v === null ||
      (typeof v === "string" && allowed.includes(v));
    if (abilityOk(parsed.pushUpAbility, ["unable", "0_5", "5_10", "10_20", "20_plus"])) {
      draft.pushUpAbility = parsed.pushUpAbility as PushUpAbility | null;
    }
    if (abilityOk(parsed.plankAbility, ["unable", "0_30", "30_60", "60_120", "120_plus"])) {
      draft.plankAbility = parsed.plankAbility as PlankAbility | null;
    }
    if (
      typeof parsed.heightCm === "number" &&
      parsed.heightCm >= 100 &&
      parsed.heightCm <= 250
    ) {
      draft.heightCm = parsed.heightCm;
    }
    if (
      typeof parsed.currentWeightKg === "number" &&
      parsed.currentWeightKg >= 30 &&
      parsed.currentWeightKg <= 300
    ) {
      draft.currentWeightKg = parsed.currentWeightKg;
    }
    if (
      parsed.planChoiceIndex === null ||
      (typeof parsed.planChoiceIndex === "number" &&
        parsed.planChoiceIndex >= 0 &&
        parsed.planChoiceIndex <= 2)
    ) {
      draft.planChoiceIndex = parsed.planChoiceIndex;
    }
    if (Array.isArray(parsed.restrictions)) {
      draft.restrictions = parsed.restrictions.filter(
        (r): r is string =>
          typeof r === "string" && ["low_impact", "no_jumping"].includes(r)
      );
    }
    return draft;
  } catch {
    return null;
  }
}

const slide = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

function formatAbilityLabel(value: string): string {
  return value.replace(/_/g, " ");
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState<string | null>(null);

  const [age, setAge] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel | null>(null);
  const [pushUpAbility, setPushUpAbility] = useState<PushUpAbility | null>(null);
  const [plankAbility, setPlankAbility] = useState<PlankAbility | null>(null);
  const [heightCm, setHeightCm] = useState(170);
  const [currentWeightKg, setCurrentWeightKg] = useState(75);
  // §13/§15 Plan-driven goal selection: the user picks one of EXACTLY three
  // tiers and the resulting target weight is computed from their current
  // weight. No free-form targets, no unsupported combinations.
  const [planChoiceIndex, setPlanChoiceIndex] = useState<number | null>(null);
  const [restrictions, setRestrictions] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Draft hydration: restore a refresh-interrupted session exactly once,
  // before the save effect is armed, so defaults never overwrite it.
  const hydratedRef = useRef(false);
  useEffect(() => {
    const draft = loadWizardDraft();
    if (draft) {
      /* eslint-disable react-hooks/set-state-in-effect -- one-time
         post-mount restoration of the persisted draft. Cannot run during
         render/lazy-init because SSR output must match first paint;
         restoring synchronously here avoids a visible default-state flash. */
      if (draft.step !== undefined) setStep(draft.step);
      if (draft.age !== undefined) setAge(draft.age);
      if (draft.fitnessLevel !== undefined) setFitnessLevel(draft.fitnessLevel);
      if (draft.pushUpAbility !== undefined) setPushUpAbility(draft.pushUpAbility);
      if (draft.plankAbility !== undefined) setPlankAbility(draft.plankAbility);
      if (draft.heightCm !== undefined) setHeightCm(draft.heightCm);
      if (draft.currentWeightKg !== undefined) setCurrentWeightKg(draft.currentWeightKg);
      if (draft.planChoiceIndex !== undefined) setPlanChoiceIndex(draft.planChoiceIndex);
      if (draft.restrictions !== undefined) setRestrictions(draft.restrictions);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    hydratedRef.current = true;
  }, []);

  // Persist the draft after every change (post-hydration only).
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      const draft: WizardDraft = {
        step,
        age,
        fitnessLevel,
        pushUpAbility,
        plankAbility,
        heightCm,
        currentWeightKg,
        planChoiceIndex,
        restrictions,
      };
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Storage full/unavailable — the wizard still works, just without resume.
    }
  }, [step, age, fitnessLevel, pushUpAbility, plankAbility, heightCm, currentWeightKg, planChoiceIndex, restrictions]);

  // Greeting uses the name captured at signup — onboarding never asks again.
  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("full_name, age")
        .maybeSingle();
      if (!cancelled && data) {
        const p = data as { full_name: string | null; age: number | null };
        const first = p.full_name?.trim().split(/\s+/)[0];
        if (first) setFirstName(first);
        if (p.age) setAge(String(p.age));
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  // §13 The only three plans that exist — resolved against the live metrics.
  const planOptions = useMemo(
    () => buildPlanOptions({ currentWeightKg, heightCm }),
    [currentWeightKg, heightCm]
  );

  // Derived, never stored-stale: if a weight/height change makes the selected
  // tier unavailable (BMI screen), the choice is simply invalid until the
  // user picks again — no effect needed.
  const chosenPlan =
    planChoiceIndex !== null && planOptions[planChoiceIndex]?.available
      ? planOptions[planChoiceIndex]
      : null;

  const stepValid = useMemo(() => {
    switch (step) {
      case 0:
        return fitnessLevel !== null;
      case 1:
        return pushUpAbility !== null;
      case 2:
        return plankAbility !== null;
      case 3:
        return (
          Number(age) >= 10 &&
          Number(age) <= 120 &&
          heightCm >= 100 &&
          heightCm <= 250 &&
          currentWeightKg >= 30 &&
          currentWeightKg <= 300
        );
      case PLAN_STEP:
        return chosenPlan !== null;
      default:
        return true;
    }
  }, [step, age, fitnessLevel, pushUpAbility, plankAbility, heightCm, currentWeightKg, chosenPlan]);

  const bmi = useMemo(
    () =>
      Math.round(
        (currentWeightKg / Math.pow(heightCm / 100, 2)) * 10
      ) / 10,
    [currentWeightKg, heightCm]
  );

  const progressPct = Math.round(((step + 1) / STEPS.length) * 100);

  function toggleRestriction(slug: string) {
    setRestrictions((prev) =>
      prev.includes(slug)
        ? prev.filter((r) => r !== slug)
        : [...prev, slug]
    );
  }

  function goNext() {
    setError(null);
    // Arriving at the plan step: preselect the first available tier so the
    // step never opens in an invalid state.
    if (step === PLAN_STEP - 1) {
      const firstAvailable = planOptions.findIndex((o) => o.available);
      setPlanChoiceIndex(firstAvailable >= 0 ? firstAvailable : null);
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    if (!chosenPlan) return;
    setLoading(true);
    setError(null);

    const result = await submitOnboarding({
      age: Number(age),
      fitnessLevel: fitnessLevel as FitnessLevel,
      pushUpAbility: pushUpAbility as PushUpAbility,
      plankAbility: plankAbility as PlankAbility,
      heightCm,
      currentWeightKg,
      targetWeightKg: chosenPlan.targetWeightKg,
      planDurationDays: chosenPlan.durationDays,
      restrictions,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    if (!result.success) {
      setError(result.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    // Onboarding is durably complete — the draft has served its purpose.
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Non-fatal.
    }

    router.push("/dashboard");
  }

  return (
    <div className="mx-auto max-w-xl font-[family-name:var(--font-geist-sans)]">
      {/* Hero */}
      <section className="titan-hero relative mb-6 overflow-hidden rounded-2xl p-6 shadow-xl shadow-black/15">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-12 size-44 rounded-full bg-white/8 blur-3xl"
        />
        <div className="relative flex items-center gap-4">
          <ProgressRing value={progressPct} size={64} strokeWidth={6} color="energy" showLabel={false} />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Step {step + 1} of {STEPS.length}
            </p>
            <h1 className="mt-0.5 truncate text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              {firstName ? `Let's go, ${firstName}` : "Build your baseline"}
            </h1>
            <p className="mt-0.5 text-sm text-zinc-400">{STEPS[step].title}</p>
          </div>
        </div>
      </section>

      {/* Step rail */}
      <div
        className="mb-6 flex items-center gap-1.5"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={step + 1}
      >
        {STEPS.map((s, i) => (
          <div key={s.title} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-500"
                initial={false}
                animate={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
            </div>
            <s.icon
              className={cn(
                "size-3.5 transition-colors duration-300",
                i <= step ? "text-energy" : "text-muted-foreground/40"
              )}
              aria-hidden
            />
          </div>
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          variants={slide}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="titan-card p-5 sm:p-7"
        >
          {step === 0 && (
            <OptionList
              intro={{ title: "How experienced are you?", subtitle: "This sets the intensity of your plan." }}
              options={LEVEL_OPTIONS}
              selected={fitnessLevel}
              onSelect={(v) => setFitnessLevel(v as FitnessLevel)}
            />
          )}

          {step === 1 && (
            <OptionList
              intro={{ title: "How many push-ups can you do in one go?", subtitle: "Be honest — it helps us calibrate your starting point." }}
              options={PUSH_UP_OPTIONS}
              selected={pushUpAbility}
              onSelect={(v) => setPushUpAbility(v as PushUpAbility)}
            />
          )}

          {step === 2 && (
            <OptionList
              intro={{ title: "How long can you hold a plank?", subtitle: "Core strength is a great benchmark for progress." }}
              options={PLANK_OPTIONS}
              selected={plankAbility}
              onSelect={(v) => setPlankAbility(v as PlankAbility)}
            />
          )}

          {step === 3 && (
            <div className="flex flex-col gap-6">
              <StepIntro
                title="Your body metrics"
                subtitle="Used for calorie estimates and progress tracking."
              />
              <NumberField
                label="Age"
                value={age}
                onChange={setAge}
                placeholder="e.g. 28"
                min={10}
                max={120}
                suffixLabel="years"
              />
              <SliderField
                label="Height"
                value={heightCm}
                display={`${heightCm} cm`}
                min={100}
                max={250}
                step={1}
                onChange={setHeightCm}
              />
              <SliderField
                label="Current weight"
                value={currentWeightKg}
                display={`${currentWeightKg} kg`}
                min={30}
                max={300}
                step={0.5}
                onChange={setCurrentWeightKg}
              />
              <p className="rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-muted-foreground tabular-nums">
                Your BMI:{" "}
                <span
                  className={cn(
                    "font-bold",
                    bmi >= 18.5 && bmi < 25 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                  )}
                >
                  {bmi}
                </span>
              </p>
            </div>
          )}

          {step === PLAN_STEP && (
            <div className="flex flex-col gap-6">
              <StepIntro
                title="Choose your challenge"
                subtitle={`Based on your ${currentWeightKg} kg start — SWEAT builds exactly these three journeys.`}
              />
              <div className="flex flex-col gap-3">
                {planOptions.map((option, i) => {
                  const meta = PLAN_TIER_META[i];
                  const active = planChoiceIndex === i;
                  return (
                    <motion.button
                      key={meta.title}
                      type="button"
                      disabled={!option.available}
                      onClick={() => setPlanChoiceIndex(i)}
                      whileTap={option.available ? { scale: 0.985 } : undefined}
                      aria-pressed={active}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "border-orange-500/70 bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-600/20"
                          : "border-border hover:border-orange-500/40 hover:bg-orange-500/[0.04]",
                        !option.available && "cursor-not-allowed opacity-50 hover:border-border hover:bg-transparent"
                      )}
                    >
                      <span>
                        <span className={cn("block text-base font-extrabold tracking-wide", active ? "text-white" : "text-foreground")}>
                          {meta.title}
                        </span>
                        <span className={cn("mt-0.5 block text-xs font-bold uppercase tracking-widest", active ? "text-white/80" : "text-energy")}>
                          {meta.daysLabel}
                        </span>
                        <span className={cn("mt-1 block text-xs", active ? "text-white/80" : "text-muted-foreground")}>
                          {option.available
                            ? `${meta.blurb} Target: ${option.targetWeightKg} kg`
                            : option.unavailableReason}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
                          active ? "border-white bg-white" : "border-muted-foreground/40"
                        )}
                      >
                        {active && <Check className="size-3 text-orange-600" strokeWidth={3.5} aria-hidden />}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              {chosenPlan && chosenPlan.available && (
                <p className="rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-muted-foreground tabular-nums">
                  You&apos;ll work toward{" "}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {chosenPlan.targetWeightKg} kg
                  </span>{" "}
                  over{" "}
                  <span className="font-bold text-foreground">
                    {chosenPlan.durationDays} days
                  </span>
                  .
                </p>
              )}
              <p className="rounded-xl bg-secondary px-4 py-3 text-xs font-medium text-muted-foreground">
                Planned loss is a safety-screened cap, not a guarantee — actual
                results vary.
              </p>
            </div>
          )}

          {step === STEPS.length - 1 && (
            <div className="flex flex-col gap-5">
              <StepIntro
                title="Any restrictions?"
                subtitle="Optional — we'll adapt exercises to keep every session safe."
              />
              <div className="flex flex-col gap-3">
                {RESTRICTION_OPTIONS.map((r) => {
                  const active = restrictions.includes(r.slug);
                  return (
                    <motion.button
                      key={r.slug}
                      type="button"
                      onClick={() => toggleRestriction(r.slug)}
                      whileTap={{ scale: 0.98 }}
                      aria-pressed={active}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "border-orange-500/60 bg-orange-500/[0.06]"
                          : "border-border hover:border-muted-foreground/40"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors",
                          active ? "border-orange-500 bg-orange-500" : "border-muted-foreground/40"
                        )}
                      >
                        {active && <Check className="size-3.5 text-white" strokeWidth={3} aria-hidden />}
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-foreground">{r.label}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{r.description}</span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Review summary */}
              <div className="rounded-xl border border-dashed border-border p-4">
                <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <Sparkles className="size-3.5 text-energy" aria-hidden />
                  Ready to begin
                </p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm tabular-nums">
                  <dt className="text-muted-foreground">Level</dt>
                  <dd className="text-right font-semibold capitalize text-foreground">{fitnessLevel ?? "—"}</dd>
                  <dt className="text-muted-foreground">Push-ups</dt>
                  <dd className="text-right font-semibold text-foreground">{pushUpAbility ? formatAbilityLabel(pushUpAbility) : "—"}</dd>
                  <dt className="text-muted-foreground">Plank</dt>
                  <dd className="text-right font-semibold text-foreground">{plankAbility ? formatAbilityLabel(plankAbility) : "—"}</dd>
                  <dt className="text-muted-foreground">Body</dt>
                  <dd className="text-right font-semibold text-foreground">{age || "—"} yrs · {heightCm} cm · {currentWeightKg} kg</dd>
                  <dt className="text-muted-foreground">Goal</dt>
                  <dd className="text-right font-semibold text-foreground">{chosenPlan ? `${chosenPlan.targetWeightKg} kg` : "—"}</dd>
                  <dt className="text-muted-foreground">Plan</dt>
                  <dd className="text-right font-semibold text-foreground">
                    {chosenPlan ? `${chosenPlan.lossKg} kg · ${chosenPlan.durationDays} days` : "—"}
                  </dd>
                </dl>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          {/* Nav */}
          <div className="mt-7 flex gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={goBack}
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 text-sm font-bold text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
              >
                <ArrowLeft className="size-4" aria-hidden />
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!stepValid}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 px-6 text-sm font-bold text-white shadow-lg shadow-orange-600/25 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
              >
                Continue
                <ArrowRight className="size-4" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!stepValid || loading || !chosenPlan}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 px-6 text-sm font-bold text-white shadow-lg shadow-orange-600/25 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4.5 animate-spin" aria-hidden />
                    Building your plan…
                  </>
                ) : (
                  <>
                    <Flame className="size-4.5 fill-white" aria-hidden />
                    Finish &amp; Generate Plan
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StepIntro({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  min,
  max,
  suffixLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  suffixLabel?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
        {suffixLabel ? ` (${suffixLabel})` : ""}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-border bg-background px-4 text-[15px] font-medium tabular-nums text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-orange-500"
      />
    </label>
  );
}

function SliderField({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="rounded-lg bg-orange-500/10 px-2.5 py-1 text-base font-extrabold tabular-nums text-orange-600 dark:text-orange-400">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-orange-500"
        aria-label={`${label}: ${display}`}
      />
    </div>
  );
}

function OptionList<T extends string>({
  intro,
  options,
  selected,
  onSelect,
}: {
  intro: { title: string; subtitle: string };
  options: { value: T; label: string; description: string }[];
  selected: T | null;
  onSelect: (value: T) => void;
}) {
  return (
    <div>
      <StepIntro {...intro} />
      <div className="mt-5 flex flex-col gap-3">
        {options.map((opt, i) => {
          const active = selected === opt.value;
          return (
            <motion.button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              whileTap={{ scale: 0.985 }}
              aria-pressed={active}
              className={cn(
                "group flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-orange-500/70 bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-600/20"
                  : "border-border hover:border-orange-500/40 hover:bg-orange-500/[0.04]"
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg text-xs font-extrabold tabular-nums transition-colors",
                    active ? "bg-white/15 text-white" : "bg-secondary text-muted-foreground group-hover:text-energy"
                  )}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span>
                  <span className={cn("block text-sm font-bold", active ? "text-white" : "text-foreground")}>
                    {opt.label}
                  </span>
                  <span className={cn("mt-0.5 block text-xs", active ? "text-white/80" : "text-muted-foreground")}>
                    {opt.description}
                  </span>
                </span>
              </span>
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
                  active ? "border-white bg-white" : "border-muted-foreground/40"
                )}
              >
                {active && <Check className="size-3 text-orange-600" strokeWidth={3.5} aria-hidden />}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
