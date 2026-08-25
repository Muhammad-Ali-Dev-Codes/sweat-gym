import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { redirect } from "next/navigation";
import { listNotifications } from "@/services/notification/feed";
import { NotificationsClient } from "./notifications-client";

export const metadata = {
  title: "Notifications — SWEAT",
};

export type NotificationPrefs = {
  workout_reminders: boolean;
  streak_reminders: boolean;
  achievement_alerts: boolean;
  progress_updates: boolean;
  recommendations: boolean;
  reminder_time: string;
};

const NOTIFICATIONS_LIMIT = 100;

export default async function NotificationsPage() {
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

  const [prefsResult, notifications] = await Promise.all([
    supabase
      .from("notification_preferences")
      .select(
        "workout_reminders, streak_reminders, achievement_alerts, progress_updates, recommendations, reminder_time"
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    listNotifications(user.id, NOTIFICATIONS_LIMIT),
  ]);

  const row =
    (prefsResult.data as Partial<NotificationPrefs> | null) ?? {};

  return (
    <NotificationsClient
      initialPrefs={{
        workout_reminders: row.workout_reminders ?? true,
        streak_reminders: row.streak_reminders ?? true,
        achievement_alerts: row.achievement_alerts ?? true,
        progress_updates: row.progress_updates ?? true,
        recommendations: row.recommendations ?? true,
        reminder_time: row.reminder_time ?? "18:00",
      }}
      initialNotifications={notifications}
    />
  );
}
