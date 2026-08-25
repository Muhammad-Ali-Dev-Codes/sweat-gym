"use server";

import { createClient } from "@/lib/supabase/server";
import { generateUserPlan } from "@/services/plan";
import { createNotification } from "@/services/notification/feed";
import { getVerifiedUser } from "@/lib/supabase/auth-user";

/**
 * §21 Controlled recovery: an onboarded user whose active plan is missing
 * (legacy partial failure, archived plan with no successor) gets a fresh
 * plan rebuilt from their STORED onboarding selection — never by pushing
 * them back through onboarding.
 */
export async function recoverPlan(): Promise<{
  success: boolean;
  planId?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);

  if (!user) return { success: false, error: "Not authenticated" };

  return generateUserPlan(user.id);
}

/**
 * Archive the user's current active plan and generate a fresh one.
 *
 * Completed days of the old plan are preserved as history (the plan is
 * archived, never deleted); sessions and stats remain untouched.
 */
export async function regeneratePlan(): Promise<{
  success: boolean;
  planId?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);

  if (!user) return { success: false, error: "Not authenticated" };

  // Archive any active plan (idempotent when none exists).
  const { data: archived } = await supabase
    .from("user_plans")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("status", "active")
    .select("id");

  if (archived && archived.length > 0) {
    await createNotification({
      userId: user.id,
      type: "plan_progress",
      title: "New plan started",
      body: "Your previous plan was archived. A fresh challenge begins today.",
      link: "/plan",
      dedupeKey: null,
    });
  }

  const result = await generateUserPlan(user.id);
  if (!result.success) return { success: false, error: result.error };

  return result;
}
