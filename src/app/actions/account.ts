"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated" };
  }

  // Every user-data table carries `user_id ... REFERENCES auth.users(id)
  // ON DELETE CASCADE` (migrations 0005–0014), so deleting the auth user
  // removes profiles, plans, sessions, weights, notifications, etc.
  // The admin API requires the service-role key — the anon-key client
  // used elsewhere in this action cannot perform it.
  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error("Account deletion failed:", deleteError.message);
    return { success: false, error: "Failed to delete account. Please try again." };
  }

  // Clear the now-invalid session cookies so navigation doesn't error.
  await supabase.auth.signOut();

  revalidatePath("/");
  return { success: true };
}
