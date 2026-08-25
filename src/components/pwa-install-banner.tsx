"use client";

import { usePwaInstall } from "@/lib/hooks/use-pwa-install";

export function PwaInstallBanner() {
  const { isInstallable, isInstalled, promptInstall, dismissInstall } = usePwaInstall();

  if (isInstalled || !isInstallable) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-card border border-border rounded-xl p-4 shadow-lg flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Add to Home Screen</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Install for quick access and offline workouts
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={dismissInstall}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
        >
          Later
        </button>
        <button
          onClick={promptInstall}
          className="text-xs bg-primary text-primary-foreground font-medium px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Install
        </button>
      </div>
    </div>
  );
}
