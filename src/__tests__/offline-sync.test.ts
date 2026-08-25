import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  enqueueSync,
  getPendingSyncCount,
  getDeadSyncCount,
  startSync,
  clearSyncedEntries,
  getSyncQueue,
  retryFailedSyncs,
  MAX_SYNC_ATTEMPTS,
} from "@/lib/offline/sync";
import { db } from "@/lib/offline/db";

beforeEach(async () => {
  await db.pendingSync.clear();
  await db.offlineWorkoutSessions.clear();
});

function makeSyncOp(overrides?: Partial<Parameters<typeof enqueueSync>[0]>) {
  return {
    operationId: crypto.randomUUID(),
    operationType: "WORKOUT_COMPLETED" as const,
    payload: { workoutId: "w1", exercises: [] },
    createdAt: Date.now(),
    status: "pending" as const,
    retryCount: 0,
    ...overrides,
  };
}

describe("Offline sync queue", () => {
  it("should enqueue a sync operation", async () => {
    const op = makeSyncOp();
    await enqueueSync(op);
    const count = await getPendingSyncCount();
    expect(count).toBe(1);
  });

  it("should count only pending operations", async () => {
    await enqueueSync(makeSyncOp({ status: "pending" }));
    await enqueueSync(makeSyncOp({ status: "synced" }));
    await enqueueSync(makeSyncOp({ status: "pending" }));
    const count = await getPendingSyncCount();
    expect(count).toBe(2);
  });

  it("should retrieve the full sync queue", async () => {
    await enqueueSync(makeSyncOp());
    await enqueueSync(makeSyncOp());
    const queue = await getSyncQueue();
    expect(queue.length).toBe(2);
  });

  it("should clear synced entries", async () => {
    await enqueueSync(makeSyncOp({ status: "synced" }));
    await enqueueSync(makeSyncOp({ status: "synced" }));
    await enqueueSync(makeSyncOp({ status: "pending" }));
    const deleted = await clearSyncedEntries();
    expect(deleted).toBe(2);
    const remaining = await getPendingSyncCount();
    expect(remaining).toBe(1);
  });

  it("should startSync returns 0 when offline (fetch fails)", async () => {
    await enqueueSync(makeSyncOp());
    const result = await startSync();
    expect(result.failed).toBe(1);
    expect(result.synced).toBe(0);
  });

  it("should retryFailedSyncs re-enqueues failed ops", async () => {
    await enqueueSync(makeSyncOp({ status: "failed", retryCount: 0 }));
    const result = await retryFailedSyncs();
    expect(result.failed + result.synced).toBeGreaterThanOrEqual(1);
  });

  it("should deduplicate by operationId (idempotent enqueue)", async () => {
    const id = crypto.randomUUID();
    await enqueueSync(makeSyncOp({ operationId: id }));
    await enqueueSync(makeSyncOp({ operationId: id }));
    const queue = await getSyncQueue();
    expect(queue.length).toBe(1);
  });

  it("marks an op dead after MAX_SYNC_ATTEMPTS instead of retrying forever", async () => {
    await enqueueSync(
      makeSyncOp({ retryCount: MAX_SYNC_ATTEMPTS - 1, status: "pending" })
    );
    // fetch fails naturally in the test environment.
    const result = await startSync();
    expect(result.failed).toBe(1);
    expect(await getDeadSyncCount()).toBe(1);
    expect(await getPendingSyncCount()).toBe(0);
  });

  it("keeps ops below MAX_SYNC_ATTEMPTS in the failed-retry lane", async () => {
    await enqueueSync(makeSyncOp({ retryCount: MAX_SYNC_ATTEMPTS - 2 }));
    await startSync();
    expect(await getDeadSyncCount()).toBe(0);
    const queue = await getSyncQueue();
    expect(queue[0]?.status).toBe("failed");
  });

  it("one poison op does not block other ops in the same batch", async () => {
    const ok = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        call += 1;
        if (call === 1) throw new TypeError("network down");
        return ok();
      })
    );

    try {
      const firstId = crypto.randomUUID();
      await enqueueSync(makeSyncOp({ operationId: firstId }));
      await enqueueSync(makeSyncOp());
      const result = await startSync();

      expect(result.synced).toBe(1);
      expect(result.failed).toBe(1);
      expect(ok).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
