/**
 * Fixed-window in-memory rate limiter.
 *
 * First line of defense against flooded endpoints and abusive action
 * replaying. Deliberately generous: it stops floods and runaway loops,
 * never shapes normal usage. Per-process state — a horizontally scaled
 * deployment multiplies the effective limits by instance count (safe
 * default; move to a shared store when scaling demands it).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweepAt = Date.now();

/** Drop expired buckets so the map cannot grow without bound. */
function sweepExpired(now: number): void {
  if (now - lastSweepAt < 60_000) return;
  lastSweepAt = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  /** Whether the call may proceed. */
  ok: boolean;
  /** Calls left in the current window when ok. */
  remaining: number;
  /** Seconds until the window resets (meaningful when !ok). */
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  sweepExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return {
    ok: true,
    remaining: limit - bucket.count,
    retryAfterSeconds: 0,
  };
}
