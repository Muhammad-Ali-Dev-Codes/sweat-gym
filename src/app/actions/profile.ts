"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

const ProfileInputSchema = z.object({
  fullName: z.string().trim().min(1).max(80),
  age: z.number().int().min(10).max(120),
  timezone: z.string().max(64).optional(),
});

export async function getServerProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    return null;
  }

  return data as Profile;
}

export async function createOrUpdateProfile(
  fullName: string,
  age: number,
  timezone?: string
): Promise<{ success: boolean; profile?: Profile; error?: string }> {
  const parsed = ProfileInputSchema.safeParse({ fullName, age, timezone });
  if (!parsed.success) {
    return { success: false, error: "Please check your name and age, then try again." };
  }

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        full_name: parsed.data.fullName,
        age: parsed.data.age,
        timezone: parsed.data.timezone || "UTC",
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("createOrUpdateProfile failed:", error.message);
    return { success: false, error: "Could not save your profile. Try again." };
  }

  return { success: true, profile: data as Profile };
}

export async function updateOnboardingStatus(
  completed: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: completed, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) {
    console.error("updateOnboardingStatus failed:", error.message);
    return { success: false, error: "Could not update onboarding status." };
  }

  return { success: true };
}
