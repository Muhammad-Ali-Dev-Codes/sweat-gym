"use client";

import { createClient } from "@/lib/supabase/client";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Activity,
  CalendarDays,
  Check,
  Download,
  Dumbbell,
  Flame,
  Gauge,
  LogOut,
  Monitor,
  Moon,
  Pencil,
  Ruler,
  Sparkles,
  Sun,
  Target,
  Timer,
  TrendingDown,
} from "lucide-react";
import type { Profile, FitnessProfile } from "@/lib/types/database";
import { computeStreaks } from "@/lib/dates";
import { calculateBMI } from "@/lib/calories";
import { PageHeader } from "@/components/layout/page-header";
import { usePwaInstall } from "@/lib/hooks/use-pwa-install";
import DeleteAccountButton from "./delete-account-button";
import { cn } from "@/lib/utils";

type ThemeChoice = "light" | "dark" | "system";

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  const dark =
    choice === "dark" ||
    (choice === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

const THEME_OPTIONS = [
  {
    value: "light" as const,
    label: "Light",
    icon: Sun,
    swatch: "bg-gradient-to-br from-white to-zinc-200 border-border",
  },
  {
    value: "dark" as const,
    label: "Dark",
    icon: Moon,
    swatch: "bg-gradient-to-br from-zinc-800 to-zinc-950 border-zinc-700",
  },
  {
    value: "system" as const,
    label: "System",
    icon: Monitor,
    swatch: "bg-[linear-gradient(135deg,#fafafa_49.5%,#18181b_50.5%)] border-border",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
};

const lift = { whileHover: { y: -4 }, transition: { type: "spring" as const, stiffness: 300, damping: 22 } };

function getInitials(name: string | undefined | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatMemberSince(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fitnessProfile, setFitnessProfile] = useState<FitnessProfile | null>(null);
  const [email, setEmail] = useState("");
  const [currentWeightKg, setCurrentWeightKg] = useState<number | null>(null);
  const [startWeightKg, setStartWeightKg] = useState<number | null>(null);
  // Editable body metrics (age / height / current weight).
  const [ageInput, setAgeInput] = useState("");
  const [heightInput, setHeightInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [training, setTraining] = useState({ sessions: 0, minutes: 0 });
  const [completionDates, setCompletionDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeChoice>("system");
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const { isInstallable, promptInstall } = usePwaInstall();

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile() {
      const user = await getAuthUser(supabase);
      if (!user) {
        router.push("/login");
        return;
      }

      const [{ data: prof }, { data: fp }, { data: latestWeight }, { data: firstWeight }, { data: sessions }] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", user.id).single(),
          supabase.from("fitness_profiles").select("*").eq("user_id", user.id).single(),
          supabase
            .from("weight_entries")
            .select("weight_kg")
            .eq("user_id", user.id)
            .order("recorded_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("weight_entries")
            .select("weight_kg")
            .eq("user_id", user.id)
            .order("recorded_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("workout_sessions")
            .select("duration_seconds, completed_at")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .order("completed_at", { ascending: false })
            .limit(180),
        ]);

      const rows = (sessions ?? []) as { duration_seconds: number | null; completed_at: string | null }[];
      setTraining({
        sessions: rows.length,
        minutes: Math.round(rows.reduce((sum, r) => sum + (r.duration_seconds ?? 0), 0) / 60),
      });
      setCompletionDates(rows.map((r) => r.completed_at).filter((d): d is string => Boolean(d)));

      setProfile(prof as Profile | null);
      setFitnessProfile(fp as FitnessProfile | null);
      setEmail(user.email ?? "");
      const latestKg = latestWeight?.weight_kg != null ? Number(latestWeight.weight_kg) : null;
      setCurrentWeightKg(latestKg);
      setStartWeightKg(firstWeight?.weight_kg ?? null);
      // Seed the editable metrics from what was loaded.
      setAgeInput(prof?.age != null ? String(prof.age) : "");
      setHeightInput(
        fp?.height_cm != null ? String(Number(fp.height_cm)) : ""
      );
      setWeightInput(latestKg != null ? String(latestKg) : "");
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  const resolveTheme = useCallback((choice: ThemeChoice): "light" | "dark" => {
    if (choice === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return choice;
  }, []);

  const syncThemeCookie = useCallback(
    (choice: ThemeChoice) => {
      document.cookie = `titan-theme=${resolveTheme(choice)}; path=/; max-age=31536000; SameSite=Lax`;
    },
    [resolveTheme]
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      const stored = localStorage.getItem("titan-theme") as ThemeChoice | null;
      if (stored) {
        setTheme(stored);
        // Sync the resolved theme into the cookie so the server renders
        // the correct class on the next load (no flash, no inline script).
        syncThemeCookie(stored);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [syncThemeCookie]);

  function changeTheme(next: ThemeChoice) {
    setTheme(next);
    localStorage.setItem("titan-theme", next);
    applyTheme(next);
    syncThemeCookie(next);
  }

  const handleSave = async () => {
    const supabase = createClient();
    const user = await getAuthUser(supabase);
    if (!user) return;

    setSaving(true);
    setSaved(false);
    setSaveError(null);

    // ---- Validate body metrics -----------------------------------------
    const age = Number.parseInt(ageInput, 10);
    if (!Number.isFinite(age) || age < 10 || age > 120) {
      setSaving(false);
      setSaveError("Age must be between 10 and 120.");
      return;
    }
    const heightCm = Number.parseFloat(heightInput);
    if (!Number.isFinite(heightCm) || heightCm < 100 || heightCm > 250) {
      setSaving(false);
      setSaveError("Height must be between 100 and 250 cm.");
      return;
    }
    const weightKg = Math.round(Number.parseFloat(weightInput) * 10) / 10;
    if (!Number.isFinite(weightKg) || weightKg < 30 || weightKg > 300) {
      setSaving(false);
      setSaveError("Weight must be between 30 and 300 kg.");
      return;
    }

    // ---- Persist: profile, height, and (if changed) a new weigh-in ------
    // Weight history is append-only: changing weight adds an entry, it
    // never rewrites the past.
    const updates: { full_name?: string; age?: number } = {};
    if ((profile?.full_name ?? "").trim()) updates.full_name = profile!.full_name;
    if (age !== profile?.age) updates.age = age;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);
      if (error) {
        setSaving(false);
        setSaveError("Could not save your changes. Please try again.");
        return;
      }
    }

    const currentHeight = fitnessProfile?.height_cm != null ? Number(fitnessProfile.height_cm) : null;
    if (fitnessProfile && heightCm !== currentHeight) {
      const { error } = await supabase
        .from("fitness_profiles")
        .update({ height_cm: heightCm })
        .eq("user_id", user.id);
      if (error) {
        setSaving(false);
        setSaveError("Could not update your height. Please try again.");
        return;
      }
      setFitnessProfile({ ...fitnessProfile, height_cm: heightCm });
    }

    if (currentWeightKg == null || weightKg !== currentWeightKg) {
      const { error } = await supabase.from("weight_entries").insert({
        user_id: user.id,
        weight_kg: weightKg,
        recorded_at: new Date().toISOString(),
      });
      if (error) {
        setSaving(false);
        setSaveError("Could not log your new weight. Please try again.");
        return;
      }
      setCurrentWeightKg(weightKg);
    }

    if (updates.age !== undefined && profile) {
      setProfile({ ...profile, age });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSignOut = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const streak = computeStreaks(
    completionDates,
    profile?.timezone || "UTC"
  ).current;

  let bmi: string | null = null;
  if (fitnessProfile?.height_cm && currentWeightKg) {
    bmi = (currentWeightKg / Math.pow(fitnessProfile.height_cm / 100, 2)).toFixed(1);
  }

  let goalProgress: { pct: number; remaining: string; reached: boolean } | null = null;
  if (
    startWeightKg != null &&
    currentWeightKg != null &&
    fitnessProfile?.target_weight_kg != null &&
    startWeightKg !== fitnessProfile.target_weight_kg
  ) {
    const total = Math.abs(startWeightKg - fitnessProfile.target_weight_kg);
    const done = Math.abs(startWeightKg - currentWeightKg);
    const pct = Math.min(100, Math.max(0, Math.round((done / total) * 100)));
    const remaining = Math.abs(currentWeightKg - fitnessProfile.target_weight_kg);
    goalProgress = {
      pct,
      remaining: remaining.toFixed(1),
      reached: remaining < 0.15,
    };
  }

  if (loading) {
    return (
      <div className="font-[family-name:var(--font-geist-sans)]">
        <div className="titan-hero h-44 animate-pulse rounded-3xl" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="mt-4 h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  const displayName = profile?.full_name?.trim() || "Athlete";
  const memberSince = formatMemberSince(profile?.created_at);

  const snapshotTiles = [
    {
      icon: Flame,
      tint: "bg-orange-500/12 text-orange-500",
      label: "Current streak",
      value: `${streak} ${streak === 1 ? "day" : "days"}`,
    },
    {
      icon: Dumbbell,
      tint: "bg-emerald-500/12 text-emerald-500",
      label: "Workouts done",
      value: String(training.sessions),
    },
    {
      icon: Timer,
      tint: "bg-sky-500/12 text-sky-500",
      label: "Time trained",
      value: `${training.minutes.toLocaleString()} min`,
    },
    {
      icon: TrendingDown,
      tint: "bg-violet-500/12 text-violet-500",
      label: "Weight to go",
      value: goalProgress ? (goalProgress.reached ? "Reached!" : `${goalProgress.remaining} kg`) : "—",
    },
  ];

  const bodyStats = [
    { icon: Ruler, label: "Height", value: fitnessProfile ? `${fitnessProfile.height_cm} cm` : "—" },
    { icon: Gauge, label: "Current weight", value: currentWeightKg !== null ? `${currentWeightKg} kg` : "—" },
    { icon: Target, label: "Target weight", value: fitnessProfile ? `${fitnessProfile.target_weight_kg} kg` : "—" },
    { icon: Activity, label: "BMI", value: bmi ?? "—" },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="font-[family-name:var(--font-geist-sans)]"
    >
      <motion.div variants={item}>
        <PageHeader
          title="Profile"
          subtitle="Your identity, your numbers, your controls."
        />
      </motion.div>

      {/* Identity hero */}
      <motion.section
        variants={item}
        aria-label="Identity"
        className="relative mb-4 overflow-hidden rounded-3xl p-[1.5px] shadow-xl shadow-orange-950/10"
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-[conic-gradient(from_140deg,#f97316,#f59e0b,#ea580c,#fb923c,#f97316)] opacity-90"
        />
        <div className="relative overflow-hidden rounded-[calc(1.5rem-1.5px)] bg-gradient-to-br from-zinc-950 via-zinc-900 to-stone-950 px-6 py-7 sm:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 right-10 size-56 rounded-full bg-orange-500/25 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-10 size-64 rounded-full bg-amber-400/15 blur-3xl"
          />

          <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <span className="relative shrink-0">
              <span
                aria-hidden
                className="absolute -inset-1 animate-pulse rounded-3xl bg-orange-500/30 blur-md"
              />
              <span className="relative grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 text-2xl font-black tracking-tight text-white shadow-lg shadow-orange-600/40">
                {getInitials(displayName)}
              </span>
              <span
                aria-hidden
                className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-white text-[10px] font-black text-orange-600 shadow-md"
              >
                <Sparkles className="size-3.5" />
              </span>
            </span>

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {displayName}
              </h2>
              <p className="mt-0.5 truncate text-sm text-zinc-400">{email}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {fitnessProfile && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-300 ring-1 ring-inset ring-orange-500/30">
                    <Dumbbell className="size-3.5" aria-hidden />
                    {fitnessProfile.fitness_level}
                  </span>
                )}
                {profile?.age != null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1 text-xs font-bold uppercase tracking-wider text-zinc-300 ring-1 ring-inset ring-white/15">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {profile.age} yrs
                  </span>
                )}
                {memberSince && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1 text-xs font-bold uppercase tracking-wider text-zinc-300 ring-1 ring-inset ring-white/15">
                    <CalendarDays className="size-3.5" aria-hidden />
                    Since {memberSince}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Training snapshot */}
      <motion.section variants={item} aria-label="Training snapshot" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {snapshotTiles.map(({ icon: Icon, tint, label, value }) => (
          <motion.div key={label} {...lift} className="titan-card group relative overflow-hidden p-4">
            <span
              aria-hidden
              className={cn(
                "absolute -right-4 -top-4 size-16 rounded-full opacity-60 blur-xl transition-opacity group-hover:opacity-90",
                tint
              )}
            />
            <span className={cn("relative grid size-9 place-items-center rounded-xl", tint)}>
              <Icon className="size-4.5" aria-hidden />
            </span>
            <p className="relative mt-2.5 truncate text-lg font-black tabular-nums leading-tight text-foreground">
              {value}
            </p>
            <p className="relative text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
          </motion.div>
        ))}
      </motion.section>

      {/* Goal progress */}
      {goalProgress && fitnessProfile && (
        <motion.section variants={item} aria-label="Weight goal progress" className="titan-card mb-4 p-5 sm:p-6" {...lift}>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-violet-500/12 text-violet-500">
                <Target className="size-4.5" aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-bold text-foreground">Weight Goal Journey</h3>
                <p className="text-xs text-muted-foreground">
                  {startWeightKg} kg → <span className="font-semibold text-foreground">{currentWeightKg} kg</span> now · target {fitnessProfile.target_weight_kg} kg
                </p>
              </div>
            </div>
            <span className="text-2xl font-black tabular-nums text-foreground">{goalProgress.pct}%</span>
          </div>

          <div
            role="progressbar"
            aria-valuenow={goalProgress.pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progress toward target weight"
            className="mt-4 h-3 overflow-hidden rounded-full bg-secondary"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${goalProgress.pct}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
              className="h-full rounded-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400 shadow-inner shadow-orange-900/20"
            />
          </div>

          <p className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            {goalProgress.reached ? (
              <>
                <Check className="size-3.5 text-emerald-500" aria-hidden />
                Target reached — time to set a new one!
              </>
            ) : (
              <>
                <TrendingDown className="size-3.5 text-violet-500" aria-hidden />
                Only {goalProgress.remaining} kg between you and your target.
              </>
            )}
          </p>
        </motion.section>
      )}

      {/* Body stats */}
      {fitnessProfile && (
        <motion.section variants={item} aria-label="Body stats" className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {bodyStats.map(({ icon: Icon, label, value }) => (
            <motion.div key={label} {...lift} className="titan-card p-4">
              <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Icon className="size-3.5 text-energy" aria-hidden />
                {label}
              </dt>
              <dd className="mt-1 truncate text-base font-extrabold tabular-nums text-foreground">
                {value}
              </dd>
            </motion.div>
          ))}
        </motion.section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Personal information */}
        <motion.section variants={item} aria-label="Personal information" className="titan-card p-5 sm:p-6" {...lift}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 text-energy">
              <Pencil className="size-4.5" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">Personal Information</h3>
              <p className="text-xs text-muted-foreground">How you appear across the app.</p>
            </div>
          </div>

          <label
            htmlFor="full-name"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            Full name
          </label>
          <input
            id="full-name"
            type="text"
            value={profile?.full_name || ""}
            onChange={(e) =>
              setProfile(profile ? { ...profile, full_name: e.target.value } : null)
            }
            className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-orange-500/60 focus:ring-4 focus:ring-orange-500/10"
            placeholder="Your name"
          />

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <div>
              <label
                htmlFor="age-input"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Age
              </label>
              <input
                id="age-input"
                type="number"
                inputMode="numeric"
                min={10}
                max={120}
                value={ageInput}
                onChange={(e) => setAgeInput(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm tabular-nums text-foreground outline-none transition-all focus:border-orange-500/60 focus:ring-4 focus:ring-orange-500/10"
              />
            </div>
            <div>
              <label
                htmlFor="height-input"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Height (cm)
              </label>
              <input
                id="height-input"
                type="number"
                inputMode="decimal"
                min={100}
                max={250}
                step="0.5"
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm tabular-nums text-foreground outline-none transition-all focus:border-orange-500/60 focus:ring-4 focus:ring-orange-500/10"
              />
            </div>
            <div>
              <label
                htmlFor="weight-input"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Weight (kg)
              </label>
              <input
                id="weight-input"
                type="number"
                inputMode="decimal"
                min={30}
                max={300}
                step="0.1"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm tabular-nums text-foreground outline-none transition-all focus:border-orange-500/60 focus:ring-4 focus:ring-orange-500/10"
              />
            </div>
          </div>

          {/* Live BMI preview from the edited values */}
          {(() => {
            const h = Number.parseFloat(heightInput);
            const w = Number.parseFloat(weightInput);
            const previewBmi =
              Number.isFinite(h) && Number.isFinite(w) && h >= 100 && w > 0
                ? calculateBMI(w, h).toFixed(1)
                : null;
            return previewBmi ? (
              <p className="mt-2.5 text-[11px] font-semibold text-muted-foreground">
                BMI at these numbers:{" "}
                <span className="font-black tabular-nums text-foreground">{previewBmi}</span>
              </p>
            ) : null;
          })()}

          <button
            onClick={handleSave}
            disabled={
              saving ||
              !profile?.full_name?.trim() ||
              !ageInput.trim() ||
              !heightInput.trim() ||
              !weightInput.trim()
            }
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-6 text-sm font-bold text-white shadow-md shadow-orange-600/25 transition-transform hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
          >
            {saved ? (
              <>
                <Check className="size-4" aria-hidden />
                Saved!
              </>
            ) : saving ? (
              "Saving…"
            ) : (
              "Save Changes"
            )}
          </button>

          {saveError ? (
            <p role="alert" className="mt-3 text-sm font-medium text-red-500">
              {saveError}
            </p>
          ) : null}
        </motion.section>

        {/* Appearance */}
        <motion.section variants={item} aria-label="Appearance" className="titan-card p-5 sm:p-6" {...lift}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <Sun className="size-4.5" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">Appearance</h3>
              <p className="text-xs text-muted-foreground">Choose how SWEAT looks on this device.</p>
            </div>
          </div>

          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2.5">
            {THEME_OPTIONS.map(({ value, label, icon: Icon, swatch }) => {
              const selected = theme === value;
              return (
                <button
                  key={value}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => changeTheme(value)}
                  className={cn(
                    "group relative flex flex-col items-center gap-2.5 rounded-2xl border px-3 py-4 text-xs font-bold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-orange-500/70 bg-orange-500/8 text-foreground shadow-md shadow-orange-600/10"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  )}
                >
                  <span aria-hidden className={cn("h-9 w-full rounded-lg border shadow-sm transition-transform group-hover:scale-105", swatch)} />
                  <span className="inline-flex items-center gap-1.5">
                    <Icon className="size-3.5" aria-hidden />
                    {label}
                  </span>
                  {selected && (
                    <motion.span
                      layoutId="theme-check"
                      aria-hidden
                      className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-orange-500 text-white"
                    >
                      <Check className="size-2.5" />
                    </motion.span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* App install */}
        <motion.section variants={item} aria-label="App install" className="titan-card p-5 sm:p-6" {...lift}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <Download className="size-4.5" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">App</h3>
              <p className="text-xs text-muted-foreground">Full-screen, offline-capable training.</p>
            </div>
          </div>

          <button
            onClick={promptInstall}
            disabled={!isInstallable}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border px-6 text-sm font-bold text-foreground transition-colors hover:bg-secondary active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 sm:w-auto"
          >
            <Download className="size-4" aria-hidden />
            {isInstallable ? "Install App" : "Already Installed"}
          </button>
        </motion.section>

        {/* Account / danger zone */}
        <motion.section variants={item} aria-label="Account" className="titan-card border-destructive/25 p-5 sm:p-6" {...lift}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-destructive/10 text-destructive">
              <LogOut className="size-4.5" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">Account</h3>
              <p className="text-xs text-muted-foreground">Manage your sign-in and personal data.</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={handleSignOut}
              disabled={loggingOut}
              className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
            >
              <LogOut className="size-4.5 text-muted-foreground" aria-hidden />
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>

            <DeleteAccountButton />
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
