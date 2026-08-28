"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useConnectivityContext } from "@/lib/hooks/use-connectivity-context";

/**
 * Mounted once inside the protected shell. Flushes the offline sync queue
 * when connectivity returns online AND when there are pending operations to
 * push (the trigger that makes queued WORKOUT_COMPLETED operations reach
 * /api/sync). After a successful flush it refreshes server components so
 * reports/dashboard/plan reflect the newly synced workout immediately.
 *
 * The pending-count gate avoids touching Dexie on every navigation when the
 * queue is empty, and the reconnect gate avoids redundant flushes while
 * already online. Dexie (via the offline sync module) is loaded lazily so it
 * is not part of the initial bundle of every protected page.
 */
export function SyncWatcher() {
  const { isOnline } = useConnectivityContext();
  const pathname = usePathname();
  const router = useRouter();
  const prevOnline = useRef(isOnline);

  useEffect(() => {
    const reconnected = isOnline && !prevOnline.current;
    prevOnline.current = isOnline;
    if (!isOnline) return;

    let cancelled = false;
    void (async () => {
      try {
        const [{ retryFailedSyncs, getPendingSyncCount }] = await Promise.all([
          import("@/lib/offline/sync"),
        ]);
        // Only bother flushing when the queue holds pending ops, or we just
        // transitioned back online (covers resurrected/failed ops too).
        const pending = await getPendingSyncCount();
        if (cancelled || (!reconnected && pending === 0)) return;

        const result = await retryFailedSyncs();
        if (!cancelled && result.synced > 0) {
          router.refresh();
        }
      } catch {
        // Dexie/network failures are non-fatal; the next trigger retries.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOnline, pathname, router]);

  return null;
}
