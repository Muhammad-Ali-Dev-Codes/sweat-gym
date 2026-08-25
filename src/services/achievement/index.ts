import { createClient } from "@/lib/supabase/server";
import {
  evaluateAchievements,
  getAchievement,
  type AchievementStats,
} from "@/lib/personalization/achievements";
import { createNotificationIfAllowed } from "@/services/notification/feed";

export interface EarnedAchievement {
  key: string;
  title: string;
  description: string;
}

/**
 * Evaluate achievement rules against real stats and persist any new awards.
 *
 * Idempotency: user_achievements has UNIQUE (user_id, achievement_key) and we
 * upsert with onConflict "ignore" + select, so only genuinely-new awards are
 * returned and celebrated with a notification.
 */
export async function recordAchievements(
  userId: string,
  stats: AchievementStats
): Promise<EarnedAchievement[]> {
  const earnedKeys = evaluateAchievements(stats);
  if (earnedKeys.length === 0) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_achievements")
    .upsert(
      earnedKeys.map((achievement_key) => ({ user_id: userId, achievement_key })),
      { onConflict: "user_id,achievement_key", ignoreDuplicates: true }
    )
    .select("achievement_key");

  if (error) {
    console.error("recordAchievements insert failed:", error.message);
    return [];
  }

  const insertedKeys = (data as { achievement_key: string }[] | null)?.map(
    (r) => r.achievement_key
  ) ?? [];

  // Celebrate each newly earned achievement (deduped by key, pref-gated).
  for (const key of insertedKeys) {
    const def = getAchievement(key);
    if (!def) continue;
    await createNotificationIfAllowed({
      userId,
      type: "achievement",
      title: `Achievement: ${def.title}`,
      body: def.description,
      link: "/reports#achievements",
      dedupeKey: `achievement:${key}`,
    });
  }

  return insertedKeys
    .map((key) => getAchievement(key))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));
}
