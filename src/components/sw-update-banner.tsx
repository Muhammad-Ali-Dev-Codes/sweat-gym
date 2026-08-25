"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, X } from "lucide-react";

/**
 * Service-worker update prompt.
 *
 * The SW uses skipWaiting + clientsClaim, so a newly installed worker
 * activates immediately while the open tab keeps running its current
 * assets. `controllerchange` fires at that moment; instead of a jarring
 * hard reload (which can interrupt a workout), we surface a dismissible
 * banner and let the user refresh when it is safe.
 */
export function SwUpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    // Only prompt once per activation of a NEW controller.
    let prompted = false;

    const onControllerChange = () => {
      if (prompted) return;
      prompted = true;
      setVisible(true);
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );
    return () =>
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          role="status"
          className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-3.5 shadow-xl backdrop-blur lg:bottom-6"
        >
          <p className="text-sm font-medium text-foreground">
            A new version is ready.
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Refresh
            </button>
            <button
              onClick={() => setVisible(false)}
              aria-label="Dismiss update banner"
              className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
