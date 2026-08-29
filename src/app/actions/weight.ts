"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/supabase/auth-user";

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
