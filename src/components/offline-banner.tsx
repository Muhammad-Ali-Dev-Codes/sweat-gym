"use client";

import { useConnectivityContext } from "@/lib/hooks/use-connectivity-context";

export function OfflineBanner() {
  const { state } = useConnectivityContext();

  if (state !== "offline") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center text-sm py-1.5 px-4 font-medium"
    >
      You&apos;re offline — workouts will sync when reconnected
    </div>
  );
}
