import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getLocalDayKey } from "@/lib/dates";
import type { Profile, FitnessProfile, WeightEntry, UserRestrictionRow } from "@/lib/types/database";

/**
 * Cached profile read. Wrapping in React `cache()` deduplicates the profile
 * table query within a single request — the protected layout, dashboard, plan
 * and other server components all resolve to ONE round-trip instead of N.
 */
export const getProfile = cache(async function getProfile(
  userId: string
): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data as Profile;
});

export async function getFitnessProfile(userId: string): Promise<FitnessProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fitness_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data as FitnessProfile;
}

export async function getUserRestrictions(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_physical_restrictions")
    .select("restriction_id, physical_restrictions(slug)")
    .eq("user_id", userId);

  if (!data) return [];
  return data.map((r: UserRestrictionRow) => r.physical_restrictions?.[0]?.slug).filter(Boolean) as string[];
}

export async function getLatestWeight(userId: string): Promise<WeightEntry | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("weight_entries")
    .select("*")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();

  return (data as WeightEntry) ?? null;
}

/**
 * Should this onboarding submission REPLACE the most recent weigh-in rather
 * than append a new one? True when the latest entry already falls on the
 * same local calendar day — i.e. this is a retry/heal of an interrupted
 * onboarding, not a fresh measurement day. Keeps retries idempotent:
 * a failed plan generation followed by a resubmit must never pile up
 * duplicate starting weigh-ins.
 */
export function shouldReplaceStartingWeighIn(
  latestRecordedAt: string | null,
  nowIso: string,
  timeZone: string
): boolean {
  if (!latestRecordedAt) return false;
  try {
    return (
      getLocalDayKey(latestRecordedAt, timeZone) === getLocalDayKey(nowIso, timeZone)
    );
  } catch {
    // Unknown timezone: fall back to strict UTC-day comparison.
    return (
      latestRecordedAt.slice(0, 10) === nowIso.slice(0, 10)
    );
  }
}

/**
 * Persist every onboarding answer WITHOUT marking onboarding complete.
 * Completion is a separate, final step (`markOnboardingComplete`) that must
 * only run after the plan exists — onboarding state never depends on a
 * successful plan query, but it must never precede plan persistence either.
 * All writes are idempotent upserts so a retried submission heals itself.
 */
export async function saveOnboardingData(data: {
  userId: string;
  fullName: string;
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
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: data.userId,
        full_name: data.fullName,
        age: data.age,
        ...(data.timezone ? { timezone: data.timezone } : {}),
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

  if (profileError) return { success: false, error: profileError.message };

  const { error: fpError } = await supabase
    .from("fitness_profiles")
    .upsert(
      {
        user_id: data.userId,
        fitness_level: data.fitnessLevel,
        push_up_ability: data.pushUpAbility,
        plank_ability: data.plankAbility,
        height_cm: data.heightCm,
        target_weight_kg: data.targetWeightKg,
        plan_duration_days: data.planDurationDays,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

  if (fpError) return { success: false, error: fpError.message };

  if (data.restrictions.length > 0) {
    const { data: restrictRows } = await supabase
      .from("physical_restrictions")
      .select("id, slug")
      .in("slug", data.restrictions);

    if (restrictRows && restrictRows.length > 0) {
      const insertRows = restrictRows.map((r: { id: string; slug: string }) => ({
        user_id: data.userId,
        restriction_id: r.id,
      }));

      await supabase
        .from("user_physical_restrictions")
        .upsert(insertRows, { onConflict: "user_id,restriction_id" });
    }
  }

  // ---- Starting weigh-in (idempotent per local day) ----------------------
  // The profile row was just upserted, so its timezone is authoritative.
  // If the latest weigh-in is already from TODAY, this submission is a
  // retry of an interrupted onboarding: replace that entry instead of
  // appending a duplicate. On any later day it appends a fresh entry.
  let weightError: { message: string } | null;
  const { data: tzRow } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("user_id", data.userId)
    .maybeSingle();
  const timeZone =
    (tzRow as { timezone?: string | null } | null)?.timezone ||
    data.timezone ||
    "UTC";

  const { data: latestEntry } = await supabase
    .from("weight_entries")
    .select("id, recorded_at")
    .eq("user_id", data.userId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    shouldReplaceStartingWeighIn(
      (latestEntry as { recorded_at: string } | null)?.recorded_at ?? null,
      now,
      timeZone
    )
  ) {
    const { error } = await supabase
      .from("weight_entries")
      .update({ weight_kg: data.currentWeightKg, recorded_at: now })
      .eq("id", (latestEntry as { id: string }).id);
    weightError = error;
  } else {
    const { error } = await supabase.from("weight_entries").insert({
      user_id: data.userId,
      weight_kg: data.currentWeightKg,
      recorded_at: now,
    });
    weightError = error;
  }

  // The starting weigh-in powers goal tracking; never silently drop it.
  if (weightError) return { success: false, error: weightError.message };

  return { success: true };
}

/**
 * Final, authoritative completion step. Called ONLY after profile data and
 * the active plan are both durably persisted, so `onboarding_completed`
 * can never describe a half-finished operation.
 */
export async function markOnboardingComplete(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_completed: true,
      onboarding_completed_at: now,
      updated_at: now,
    })
    .eq("user_id", userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
