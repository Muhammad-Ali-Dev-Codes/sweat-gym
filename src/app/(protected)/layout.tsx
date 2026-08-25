import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { OfflineOverlay } from "@/components/offline-overlay";
import { ReminderWatcher } from "@/components/reminder-watcher";
import { SyncWatcher } from "@/components/sync-watcher";
import { getUnreadNotificationCount } from "@/services/notification/feed";
import { computeStreaks } from "@/lib/dates";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    redirect("/login");
  }

  const [{ data: profileData }, unreadCount] = await Promise.all([
    supabase.from("profiles").select("full_name, timezone").eq("user_id", user.id).single(),
    getUnreadNotificationCount(user.id),
  ]);

  const timeZone = profileData?.timezone || "UTC";

  // Reminder preferences (defaults when no row exists) + current streak so
  // the reminder engine can use the streak-protection variant.
  const [{ data: prefsRow }, { data: recentSessions }] = await Promise.all([
    supabase
      .from("notification_preferences")
      .select("workout_reminders, streak_reminders, reminder_time")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("workout_sessions")
      .select("completed_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(10),
  ]);

  const currentStreak = computeStreaks(
    (recentSessions ?? [])
      .map((s) => s.completed_at)
      .filter((d): d is string => Boolean(d)),
    timeZone
  ).current;

  return (
    <AppShell
      user={{
        name: profileData?.full_name ?? null,
        email: user.email ?? null,
      }}
      unreadNotifications={unreadCount}
    >
      <OfflineOverlay />
      <SyncWatcher />
      <ReminderWatcher
        userId={user.id}
        timeZone={timeZone}
        currentStreak={currentStreak}
        prefs={{
          workout_reminders: prefsRow?.workout_reminders ?? true,
          streak_reminders: prefsRow?.streak_reminders ?? true,
          reminder_time: prefsRow?.reminder_time ?? "18:00",
        }}
      />
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
