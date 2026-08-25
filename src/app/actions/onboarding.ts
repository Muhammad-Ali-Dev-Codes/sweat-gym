"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { saveOnboardingData, markOnboardingComplete } from "@/services/onboarding";
import { generateUserPlan } from "@/services/plan";
import { validatePlanSelection } from "@/lib/weight-loss";
import { getAuthUser } from "@/lib/supabase/auth-user";

const OnboardingSchema = z.object({
  // The name is captured at signup; onboarding never asks for it again.
  fullName: z.string().trim().max(80).optional(),
  age: z.number().int().min(10).max(120),
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced"]),
  pushUpAbility: z.string().min(1).max(20),
  plankAbility: z.string().min(1).max(20),
  heightCm: z.number().min(100).max(250),
  currentWeightKg: z.number().min(30).max(300),
  // SWEAT is weight-loss/fitness only: the target can never exceed the
  // current weight (§10 — rejected, never silently modified).
  targetWeightKg: z.number().min(30).max(400),
  planDurationDays: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  restrictions: z.array(z.string().max(40)).max(10),
  timezone: z.string().max(64).optional(),
});

export async function submitOnboarding(formData: {
  fullName?: string;
  age: number;
  fitnessLevel: "beginner" | "intermediate" | "advanced";
  pushUpAbility: string;
  plankAbility: string;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  planDurationDays: number;
  restrictions: string[];
  timezone?: string;
}): Promise<{ success: boolean; error?: string; redirect?: string }> {
  const parsed = OnboardingSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: "Please check your answers and try again." };
  }

  const data = parsed.data;

  const supabase = await createClient();
  // Use getAuthUser with a longer timeout (10s) instead of getVerifiedUser (3s).
  // Onboarding is a one-time setup: the user just authenticated, so the session
  // is fresh. The short getVerifiedUser timeout caused silent failures on
  // mobile/unstable connections, leaving users trapped in an onboarding loop
  // because markOnboardingComplete never ran.
  const user = await getAuthUser(supabase, 10_000);

  if (!user) return { success: false, error: "Not authenticated" };

  // §26 The backend independently computes the effective current weight from
  // the recorded weigh-ins when one exists — never trusting the browser.
  const { data: latestWeight } = await supabase
    .from("weight_entries")
    .select("weight_kg")
    .eq("user_id", user.id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const currentWeightKg =
    latestWeight?.weight_kg != null ? Number(latestWeight.weight_kg) : data.currentWeightKg;

  // §5/§6/§9/§12 Target safety before anything is written. Enforces:
  //   * no weight-gain targets,
  //   * BMI screening floor,
  //   * EXACT tier mapping (4 kg→30 d · 8 kg→60 d · 12 kg→90 d),
  //   * the hard 12 kg total limit.
  const selection = validatePlanSelection({
    currentWeightKg,
    targetWeightKg: data.targetWeightKg,
    heightCm: data.heightCm,
    planDurationDays: data.planDurationDays,
  });
  if (!selection.ok) {
    return { success: false, error: selection.message };
  }

  // Prefer the profile's stored name; fall back to signup metadata.
  let fullName = data.fullName?.trim() || "";
  if (!fullName) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();
    fullName =
      prof?.full_name?.trim() ||
      (user.user_metadata?.full_name as string | undefined)?.trim() ||
      "Athlete";
  }

  // Persist the caller's IANA timezone so streaks and daily plans follow the
  // user's local calendar rather than UTC.
  const timezone =
    data.timezone && isValidTimeZone(data.timezone)
      ? data.timezone
      : undefined;

  // ---- Ordered completion flow (best-effort atomicity; every step is
  // idempotent so a retry after any failure heals instead of duplicating).
  //
  //   1. persist profile + answers + starting weigh-in   (no completion flag)
  //   2. create / reconcile the active plan
  //   3. ONLY THEN mark onboarding_completed = true
  //
  // If step 2 fails, the flag stays false and the user can simply resubmit;
  // they are never stranded with onboarding "complete" but no plan, nor sent
  // through onboarding forever because the flag never landed.

  const saved = await saveOnboardingData({
    userId: user.id,
    fullName,
    age: data.age,
    fitnessLevel: data.fitnessLevel,
    pushUpAbility: data.pushUpAbility,
    plankAbility: data.plankAbility,
    heightCm: data.heightCm,
    currentWeightKg: data.currentWeightKg,
    targetWeightKg: data.targetWeightKg,
    planDurationDays: data.planDurationDays,
    restrictions: data.restrictions,
    timezone,
  });
  if (!saved.success) return { success: false, error: saved.error };

  const plan = await generateUserPlan(user.id, {
    durationDays: data.planDurationDays,
    plannedLossKg:
      Math.round((currentWeightKg - data.targetWeightKg) * 10) / 10,
    startingWeightKg: currentWeightKg,
    targetWeightKg: data.targetWeightKg,
  });
  if (!plan.success) return { success: false, error: plan.error };

  const completed = await markOnboardingComplete(user.id);
  if (!completed.success) return { success: false, error: completed.error };

  return { success: true, redirect: "/dashboard" };
}

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
