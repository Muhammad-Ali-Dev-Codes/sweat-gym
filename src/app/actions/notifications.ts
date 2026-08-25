"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getLocalDayKey } from "@/lib/dates";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/services/notification/feed";
import { subscribeToPushNotifications } from "@/services/notification";
import { getVerifiedUser } from "@/lib/supabase/auth-user";

export async function markReadAction(
  notificationId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);
  if (!user) return { success: false };

  const ok = await markNotificationRead(user.id, notificationId);
  return { success: ok };
}

export async function markAllReadAction(): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);
  if (!user) return { success: false };

  const ok = await markAllNotificationsRead(user.id);
  return { success: ok };
}

const PrefsSchema = z.object({
  workout_reminders: z.boolean(),
  streak_reminders: z.boolean(),
  achievement_alerts: z.boolean(),
  progress_updates: z.boolean(),
  recommendations: z.boolean(),
  reminder_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time"),
});

export type NotificationPreferencesInput = z.infer<typeof PrefsSchema>;

/** Persist the full notification-preferences set (validated). */
export async function saveNotificationPreferences(
  input: NotificationPreferencesInput
): Promise<{ success: boolean; error?: string }> {
  const parsed = PrefsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid preferences",
    };
  }

  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);
  if (!user) return { success: false, error: "Not authenticated" };

  // Upsert keeps historical columns intact and creates the row lazily.
  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    ...parsed.data,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("saveNotificationPreferences failed:", error.message);
    return { success: false, error: "Could not save preferences. Try again." };
  }

  return { success: true };
}

const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

/**
 * Persist the caller's push subscription (user resolved server-side so the
 * client never needs to know its own id).
 */
export async function subscribePushAction(
  input: z.infer<typeof PushSubscriptionSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = PushSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid subscription payload" };
  }

  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);
  if (!user) return { success: false, error: "Not authenticated" };

  const ok = await subscribeToPushNotifications(user.id, parsed.data);
  return ok
    ? { success: true }
    : { success: false, error: "Could not save subscription" };
}

/**
 * Did the user already complete a workout today (their local calendar)?
 * Used by the local reminder engine so a reminder never fires for a day
 * that is already fulfilled.
 */
export async function hasCompletedWorkoutToday(): Promise<boolean> {
  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);
  if (!user) return false;

  const [{ data: profile }, { data: sessions }] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("user_id", user.id).single(),
    supabase
      .from("workout_sessions")
      .select("completed_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(3),
  ]);

  if (!sessions || sessions.length === 0) return false;

  const timeZone = profile?.timezone || "UTC";
  const todayKey = getLocalDayKey(new Date(), timeZone);

  return sessions.some(
    (s) => s.completed_at && getLocalDayKey(s.completed_at, timeZone) === todayKey
  );
}
