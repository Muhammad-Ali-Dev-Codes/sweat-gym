"use client";

import { OfflineBanner } from "@/components/offline-banner";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { SyncStatusIndicator } from "@/components/sync-status-indicator";
import { useEffect, useCallback } from "react";
import { useConnectivityContext } from "@/lib/hooks/use-connectivity-context";
import { retryFailedSyncs } from "@/lib/offline/sync";

export function OfflineProviders({ children }: { children: React.ReactNode }) {
  const { isOnline } = useConnectivityContext();

  const attemptSync = useCallback(async () => {
    try {
      await retryFailedSyncs();
    } catch {
      // sync will retry on next connectivity change
    }
  }, []);

  useEffect(() => {
    if (isOnline) {
      attemptSync();
    }
  }, [isOnline, attemptSync]);

  return (
    <>
      <OfflineBanner />
      <div className="fixed top-1 right-4 z-40 pt-1">
        <SyncStatusIndicator />
      </div>
      {children}
      <PwaInstallBanner />
    </>
  );
}
