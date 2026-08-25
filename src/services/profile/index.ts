import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching profile:", error.message);
    return null;
  }

  return data as Profile;
}

export async function createProfile(
  userId: string,
  fullName: string,
  age: number,
  timezone?: string
): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        full_name: fullName,
        age,
        timezone: timezone || "UTC",
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("Error creating profile:", error.message);
    return null;
  }

  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, "full_name" | "age" | "timezone" | "onboarding_completed">>
): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { user_id: userId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("Error updating profile:", error.message);
    return null;
  }

  return data as Profile;
}

export async function deleteProfile(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting profile:", error.message);
    return false;
  }

  return true;
}
