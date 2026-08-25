"use client";

import { QueryProvider } from "./query-provider";
import { ConnectivityProvider } from "./connectivity-provider";
import { DevServiceWorkerCleanup } from "./dev-sw-cleanup";
import { SwUpdateBanner } from "@/components/sw-update-banner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConnectivityProvider>
      <QueryProvider>{children}</QueryProvider>
      <SwUpdateBanner />
      <DevServiceWorkerCleanup />
    </ConnectivityProvider>
  );
}
