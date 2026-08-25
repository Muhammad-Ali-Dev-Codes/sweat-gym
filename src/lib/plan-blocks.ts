import {
  DAILY_SESSION_TARGET_SECONDS,
  DAILY_SESSION_TARGET_KCAL,
} from "@/lib/weight-loss";

/**
 * One video inside a composed day. A day is a sequence of blocks played
 * back-to-back; block calories always follow the uniform burn rate.
 */
export interface ComposedBlock {
  position: number;
  workoutId: string;
  durationSeconds: number;
  calories: number;
}

/** Smallest sensible slice of a video — below this a block feels pointless. */
export const MIN_BLOCK_SECONDS = 240;

/** Hard cap so pathological pools can never loop forever. */
const MAX_BLOCKS_PER_DAY = 12;

interface BlockCandidate {
  id: string;
  durationSeconds: number;
}

/**
 * Compose one day's workout sequence landing on EXACTLY `targetSeconds`
 * (default: one hour / 1,100 kcal at the uniform session rate).
 *
 * Videos are whole routines; only the block that closes the hour may be
 * clipped or gently stretched so the total is exact. Deterministic per
 * dayNumber: the pool rotates with the day, consecutive days open with
 * different videos, and no day repeats a video until the pool is spent.
 */
export function composeDayBlocks(
  pool: BlockCandidate[],
  dayNumber: number,
  targetSeconds: number = DAILY_SESSION_TARGET_SECONDS
): ComposedBlock[] {
  const usable = pool.filter(
    (p) => Number.isFinite(p.durationSeconds) && p.durationSeconds > 0
  );
  if (usable.length === 0 || targetSeconds <= 0) return [];

  const rotation =
    ((dayNumber - 1) % usable.length + usable.length) % usable.length;
  const ordered = [...usable.slice(rotation), ...usable.slice(0, rotation)];

  const blocks: ComposedBlock[] = [];
  let total = 0;
  const used = new Set<string>();
  let cursor = 0;

  while (total < targetSeconds && blocks.length < MAX_BLOCKS_PER_DAY) {
    // Next not-yet-used candidate; once every video has been used today,
    // allow repeats starting from where the rotation stands.
    let chosen: BlockCandidate | null = null;
    for (let step = 0; step < ordered.length; step++) {
      const candidate = ordered[(cursor + step) % ordered.length];
      if (!used.has(candidate.id)) {
        chosen = candidate;
        cursor = (cursor + step + 1) % ordered.length;
        break;
      }
    }
    if (!chosen) {
      // Every video has been used today — allow repeats from here on.
      used.clear();
      chosen = ordered[cursor % ordered.length];
      cursor = (cursor + 1) % ordered.length;
    }

    const remaining = targetSeconds - total;
    // Whole video fits AND leaves a worthwhile tail for the next block?
    // Otherwise this block closes the hour exactly (clip or slight stretch).
    const closesHour =
      chosen.durationSeconds >= remaining ||
      remaining - chosen.durationSeconds < MIN_BLOCK_SECONDS;
    const duration = closesHour ? remaining : chosen.durationSeconds;

    // Calories via cumulative rounding so every day's blocks sum to
    // EXACTLY the proportional total (1,100 kcal for a full hour) with
    // no per-block rounding drift.
    const kcalAt = (seconds: number) =>
      Math.round((seconds * DAILY_SESSION_TARGET_KCAL) / DAILY_SESSION_TARGET_SECONDS);

    blocks.push({
      position: blocks.length + 1,
      workoutId: chosen.id,
      durationSeconds: duration,
      calories: Math.max(1, kcalAt(total + duration) - kcalAt(total)),
    });
    used.add(chosen.id);
    total += duration;
  }

  return blocks;
}
