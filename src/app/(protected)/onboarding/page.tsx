import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "./onboarding-wizard";

/**
 * §21/§22/§23 Deterministic routing. The wizard renders ONLY when
 * `onboarding_completed` is definitively false — never because a plan query
 * failed, and never again once completion has persisted.
 */
export default async function OnboardingPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) redirect("/login");

  const [{ data: profile }, { data: activePlan }] = await Promise.all([
    supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_plans")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
  ]);

  // Completed users are never shown onboarding again — a missing plan does
  // NOT reopen it; the dashboard owns that recovery flow.
  if (profile?.onboarding_completed_at) redirect("/dashboard");

  // Guard: if the user has an active plan, onboarding was completed but the
  // flag was not persisted (e.g. network timeout during markOnboardingComplete).
  // Don't trap them in a loop — send them to the dashboard.
  if (activePlan) redirect("/dashboard");

  return <OnboardingWizard />;
}
