import { createClient } from "@/lib/supabase/client";

/** Browser PushSubscription.toJSON() shape (plain, serializable). */
export interface PushSubscriptionJson {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function subscribeToPushNotifications(
  userId: string,
  subscription: PushSubscriptionJson
): Promise<boolean> {
  const supabase = createClient();
  const { endpoint, keys } = subscription;

  const p256dh = keys?.p256dh;
  const auth = keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    console.error("Invalid push subscription data");
    return false;
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint,
      p256dh,
      auth,
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    console.error("Error saving push subscription:", error.message);
    return false;
  }

  return true;
}

export async function revokePushSubscription(
  userId: string,
  endpoint: string
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);

  if (error) {
    console.error("Error revoking push subscription:", error.message);
    return false;
  }

  return true;
}
