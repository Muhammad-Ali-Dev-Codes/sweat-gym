"use client";

import { OfflineBanner } from "@/components/offline-banner";
import { PwaInstallBanner } from "@/components/pwa-install-banner";

export function OfflineOverlay() {
  return (
    <>
      <OfflineBanner />
      <PwaInstallBanner />
    </>
  );
}
