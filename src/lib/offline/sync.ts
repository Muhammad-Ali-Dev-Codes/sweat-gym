import { db, type PendingSync } from "./db";

let isSyncing = false;

/**
 * A queued op that has failed this many times is moved to "dead" instead of
 * retrying forever. 8 attempts ≈ a full backoff ladder (~8.5 min cumulative)
 * plus server-hinted delays; past that, the op needs human attention.
 */
export const MAX_SYNC_ATTEMPTS = 8;

export async function enqueueSync(op: PendingSync): Promise<void> {
  // Idempotent by operationId: a repeated finish/resume flow must never
  // stack duplicate rows for the same logical operation.
  const existing = await db.pendingSync
    .where("operationId")
    .equals(op.operationId)
    .count();
  if (existing > 0) return;
  await db.pendingSync.add(op);
}

export async function startSync(): Promise<{
  synced: number;
  failed: number;
}> {
  if (isSyncing) return { synced: 0, failed: 0 };
  isSyncing = true;

  let synced = 0;
  let failed = 0;

  try {
    const pending = await db.pendingSync
      .where("status")
      .equals("pending")
      .sortBy("createdAt");

    for (const op of pending) {
      try {
        await db.pendingSync.update(op.id!, { status: "syncing" });

        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operationId: op.operationId,
            operationType: op.operationType,
            payload: op.payload,
          }),
        });

        if (res.ok) {
          await db.pendingSync.update(op.id!, { status: "synced" });
          synced++;
        } else {
          const err =
            new Error(`Sync failed: ${res.status}`) as Error & {
              retryAfterMs?: number;
            };
          // Respect the server's backpressure hint (rate limiting) instead
          // of burning through our own exponential-backoff schedule.
          if (res.status === 429) {
            const retryAfter = Number(res.headers.get("retry-after"));
            if (Number.isFinite(retryAfter) && retryAfter > 0) {
              err.retryAfterMs = Math.min(retryAfter * 1000, 30 * 60_000);
            }
          }
          throw err;
        }
      } catch (err) {
        const retryCount = op.retryCount + 1;
        if (retryCount >= MAX_SYNC_ATTEMPTS) {
          // Poison pill: stop retrying, surface for the user. The op stays
          // in the queue (never silently dropped) but leaves both the
          // pending and failed retry paths alone.
          await db.pendingSync.update(op.id!, {
            status: "dead",
            retryCount,
            lastError: err instanceof Error ? err.message : String(err),
          });
        } else {
          const hintedDelay = (err as { retryAfterMs?: number }).retryAfterMs;
          const nextRetryAt =
            hintedDelay ??
            Date.now() + Math.min(1000 * Math.pow(2, retryCount), 300_000);
          await db.pendingSync.update(op.id!, {
            status: "failed",
            retryCount,
            nextRetryAt,
            lastError: err instanceof Error ? err.message : String(err),
          });
        }
        failed++;
      }
    }
  } finally {
    isSyncing = false;
  }

  return { synced, failed };
}

export async function getPendingSyncCount(): Promise<number> {
  return db.pendingSync.where("status").equals("pending").count();
}

export async function getDeadSyncCount(): Promise<number> {
  return db.pendingSync.where("status").equals("dead").count();
}

/** User-invoked: retry dead operations once more (e.g. after re-login). */
export async function resurrectDeadSyncOps(): Promise<void> {
  await db.pendingSync
    .where("status")
    .equals("dead")
    .modify({ status: "pending", nextRetryAt: undefined });
}

export async function retryFailedSyncs(): Promise<{ synced: number; failed: number }> {
  const failed = await db.pendingSync.where("status").equals("failed").toArray();
  const now = Date.now();

  for (const op of failed) {
    if (op.nextRetryAt && op.nextRetryAt > now) continue;
    await db.pendingSync.update(op.id!, { status: "pending" });
  }

  return startSync();
}

export async function getSyncQueue(): Promise<PendingSync[]> {
  return db.pendingSync.toArray();
}

export async function clearSyncedEntries(): Promise<number> {
  return db.pendingSync.where("status").equals("synced").delete();
}

/** Remove dead entries from the queue (user dismissed or data confirmed on server). */
export async function clearDeadSyncOps(): Promise<number> {
  return db.pendingSync.where("status").equals("dead").delete();
}
