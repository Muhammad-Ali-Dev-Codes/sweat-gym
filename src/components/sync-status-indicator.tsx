"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getPendingSyncCount,
  getDeadSyncCount,
  clearDeadSyncOps,
} from "@/lib/offline/sync";
import { useConnectivityContext } from "@/lib/hooks/use-connectivity-context";

export function SyncStatusIndicator() {
  const { isOnline } = useConnectivityContext();
  const [pendingCount, setPendingCount] = useState(0);
  const [deadCount, setDeadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const [pending, dead] = await Promise.all([
        getPendingSyncCount(),
        getDeadSyncCount(),
      ]);
      setPendingCount(pending);
      setDeadCount(dead);
    } catch {
      // Dexie might not be available during SSR
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const [pending, dead] = await Promise.all([
          getPendingSyncCount(),
          getDeadSyncCount(),
        ]);
        if (!cancelled) {
          setPendingCount(pending);
          setDeadCount(dead);
        }
      } catch {
        // Dexie might not be available during SSR
      }
    }

    check();
    const interval = setInterval(check, 10_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOnline]);

  async function dismissDead() {
    await clearDeadSyncOps();
    refresh();
  }

  if (pendingCount === 0 && deadCount === 0) return null;

  return (
    <>
      {deadCount > 0 && (
        <button
          type="button"
          onClick={dismissDead}
          role="alert"
          title="Click to dismiss — offline changes that failed to sync"
          className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          {deadCount} failed permanently
        </button>
      )}
      {pendingCount > 0 && (
        <div
          role="status"
          aria-label={`${pendingCount} changes pending sync`}
          className="inline-flex items-center gap-1.5 text-xs text-amber-400"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          {pendingCount} pending sync
        </div>
      )}
    </>
  );
}
