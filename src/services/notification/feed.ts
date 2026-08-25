import { createClient } from "@/lib/supabase/server";
import type { AppNotification } from "@/lib/types/database";

export interface CreateNotificationInput {
  userId: string;
  type: AppNotification["type"];
  title: string;
  body?: string | null;
  link?: string | null;
  /** When provided, repeated events with the same key are inserted once. */
  dedupeKey?: string | null;
}

/** Insert a notification. Idempotent when dedupeKey is supplied. */
export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    dedupe_key: input.dedupeKey ?? null,
  });

  // Unique-violation (already deduped) is success; anything else is logged.
  if (error && error.code !== "23505") {
    console.error("createNotification failed:", error.message);
  }
}

/**
 * Which notification_preferences column gates a given notification type.
 * "system" notifications are always delivered.
 */
const PREF_COLUMN_BY_TYPE: Record<
  AppNotification["type"],
  keyof PrefsRow | null
> = {
  workout_completed: "progress_updates",
  plan_progress: "progress_updates",
  achievement: "achievement_alerts",
  streak_milestone: "streak_reminders",
  recommendation: "recommendations",
  system: null,
};

interface PrefsRow {
  progress_updates: boolean;
  achievement_alerts: boolean;
  recommendations: boolean;
  streak_reminders: boolean;
}

async function preferencesAllow(
  userId: string,
  type: AppNotification["type"]
): Promise<boolean> {
  const column = PREF_COLUMN_BY_TYPE[type];
  if (!column) return true;

  const supabase = await createClient();
  const { data } = await supabase
    .from("notification_preferences")
    .select(column)
    .eq("user_id", userId)
    .maybeSingle();

  // Missing row / column value => enabled by default.
  const row = data as Partial<PrefsRow> | null;
  return row?.[column] !== false;
}

/** Create a notification only when the user's preferences allow its type. */
export async function createNotificationIfAllowed(
  input: CreateNotificationInput
): Promise<void> {
  if (!(await preferencesAllow(input.userId, input.type))) return;
  await createNotification(input);
}

export async function listNotifications(
  userId: string,
  limit = 50,
  offset = 0
): Promise<AppNotification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("listNotifications failed:", error.message);
    return [];
  }
  return (data as AppNotification[]) ?? [];
}

export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  return count ?? 0;
}

export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", notificationId)
    .is("read_at", null);

  if (error) {
    console.error("markNotificationRead failed:", error.message);
    return false;
  }
  return true;
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    console.error("markAllNotificationsRead failed:", error.message);
    return false;
  }
  return true;
}
