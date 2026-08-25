import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { redirect } from "next/navigation";
import { getReportsData } from "@/services/reports";
import { ReportsClient } from "./reports-client";

export const metadata = {
  title: "Reports — SWEAT",
};

export default async function ReportsPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("user_id", user.id)
    .single();

  // Guard against onboarding loop: if the flag is missing but an active plan
  // exists, the user completed onboarding but the flag wasn't persisted.
  if (profileData && !profileData.onboarding_completed_at) {
    const { data: hasPlan } = await supabase
      .from("user_plans")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (!hasPlan) redirect("/onboarding");
  }

  const reportsData = await getReportsData(user.id);

  return <ReportsClient data={reportsData} />;
}
