"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { retryFailedSyncs } from "@/lib/offline/sync";
import { useConnectivityContext } from "@/lib/hooks/use-connectivity-context";

/**
 * Mounted once inside the protected shell. Flushes the offline sync queue
 * whenever connectivity returns AND on every route change while online —
 * this is the trigger that makes queued WORKOUT_COMPLETED operations reach
 * /api/sync. After a successful flush it refreshes server components so
 * reports/dashboard/plan reflect the newly synced workout immediately.
 */
export function SyncWatcher() {
  const { isOnline } = useConnectivityContext();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isOnline) return;
    let cancelled = false;

    void (async () => {
      try {
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
