"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/supabase/auth-user";
import { planningEquivalentKg } from "@/lib/weight-loss";

const LogWeightSchema = z.object({
  weightKg: z.number().min(30, "Weight must be at least 30 kg").max(300, "Weight must be at most 300 kg"),
});

/**
 * Append a historical weight entry. Current weight is always the newest row —
 * history is never overwritten.
 */
export async function logWeight(
  weightKg: number
): Promise<{ success: boolean; error?: string }> {
  const parsed = LogWeightSchema.safeParse({ weightKg });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid weight" };
  }

  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase.from("weight_entries").insert({
    user_id: user.id,
    weight_kg: parsed.data.weightKg,
    recorded_at: new Date().toISOString(),
  });

  if (error) {
    console.error("logWeight failed:", error.message);
    return { success: false, error: "Could not save your weight. Try again." };
  }

  revalidatePath("/reports");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Automatically update weight based on estimated weight loss from burned calories.
 * Calculates: new weight = current weight - estimated loss (from 7,700 kcal = 1 kg)
 */
export async function autoUpdateWeightFromCalories(): Promise<{ success: boolean; error?: string; newWeight?: number }> {
  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    // Get current weight (latest entry)
    const { data: weights, error: weightsError } = await supabase
      .from("weight_entries")
      .select("weight_kg")
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .single();

    if (weightsError || !weights) {
      return { success: false, error: "No weight entry found. Log your weight first." };
    }

    const currentWeight = weights.weight_kg;

    // Get all sessions to calculate total calories
    const { data: sessions, error: sessionsError } = await supabase
      .from("workout_sessions")
      .select("estimated_calories")
      .eq("user_id", user.id)
      .eq("status", "completed");

    if (sessionsError) {
      return { success: false, error: "Could not fetch workout data" };
    }

    const totalCalories = (sessions ?? []).reduce((sum, s) => sum + (s.estimated_calories ?? 0), 0);
    const estimatedWeightLoss = planningEquivalentKg(totalCalories);

    if (estimatedWeightLoss <= 0) {
      return { success: false, error: "No calories burned yet. Complete workouts to track weight loss." };
    }

    // Calculate new weight
    const newWeight = Math.round((currentWeight - estimatedWeightLoss) * 10) / 10;

    // Only update if there's a meaningful change
    if (Math.abs(newWeight - currentWeight) < 0.05) {
      return { success: false, error: "Weight change too small to log" };
    }

    // Log the new weight
    const { error: insertError } = await supabase.from("weight_entries").insert({
      user_id: user.id,
      weight_kg: newWeight,
      recorded_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("autoUpdateWeightFromCalories insert failed:", insertError.message);
      return { success: false, error: "Could not save updated weight" };
    }

    revalidatePath("/reports");
    revalidatePath("/dashboard");
    return { success: true, newWeight };
  } catch (err) {
    console.error("autoUpdateWeightFromCalories error:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}
