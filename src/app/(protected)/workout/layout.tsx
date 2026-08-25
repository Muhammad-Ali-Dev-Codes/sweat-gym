import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { redirect } from "next/navigation";

/**
 * Workouts belong to a plan context (or at minimum to an onboarded member):
 * a direct deep link to /workout must never serve sessions to a user who
 * has not completed onboarding, even when a workout id is supplied.
 */
export default async function WorkoutGateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  // Guard against onboarding loop: if the flag is missing but an active plan
  // exists, the user completed onboarding but the flag wasn't persisted.
  if (!profile?.onboarding_completed_at) {
    const { data: hasPlan } = await supabase
      .from("user_plans")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (!hasPlan) redirect("/onboarding");
  }

  return <>{children}</>;
}
