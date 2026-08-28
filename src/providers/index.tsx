"use client";

import { lazy, Suspense } from "react";
import { QueryProvider } from "./query-provider";
import { ConnectivityProvider } from "./connectivity-provider";
import { DevServiceWorkerCleanup } from "./dev-sw-cleanup";

const SwUpdateBanner = lazy(() =>
  import("@/components/sw-update-banner").then((m) => ({
    default: m.SwUpdateBanner,
  }))
);

const ReducedMotion = lazy(() =>
  import("./reduced-motion").then((m) => ({ default: m.ReducedMotion }))
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConnectivityProvider>
      <Suspense fallback={children}>
        <ReducedMotion>
          <QueryProvider>{children}</QueryProvider>
        </ReducedMotion>
      </Suspense>
      <Suspense fallback={null}>
        <SwUpdateBanner />
      </Suspense>
      <DevServiceWorkerCleanup />
    </ConnectivityProvider>
  );
}
