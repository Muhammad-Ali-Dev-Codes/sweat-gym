import { createClient } from "@/lib/supabase/client";
import type { WeightEntry } from "@/lib/types";

export async function getWeightEntries(
  userId: string,
  options?: { limit?: number; startDate?: string; endDate?: string }
): Promise<WeightEntry[]> {
  const supabase = createClient();
  let query = supabase
    .from("weight_entries")
    .select("*")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false });

  if (options?.startDate) {
    query = query.gte("recorded_at", options.startDate);
  }
  if (options?.endDate) {
    query = query.lte("recorded_at", options.endDate);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching weight entries:", error.message);
    return [];
  }

  return (data ?? []) as WeightEntry[];
}

export async function addWeightEntry(
  userId: string,
  weightKg: number
): Promise<WeightEntry | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("weight_entries")
    .insert({ user_id: userId, weight_kg: weightKg, recorded_at: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    console.error("Error adding weight entry:", error.message);
    return null;
  }

  return data as WeightEntry;
}
