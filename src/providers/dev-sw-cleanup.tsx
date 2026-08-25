"use client";

import { useEffect } from "react";

// In development Serwist is disabled, but a service worker registered by a
// previous production build keeps controlling the page and serving stale
// HTML/chunks (unstyled text until hard refresh). This component removes any
// leftover SW + caches so dev always runs against the live server.
const CLEANUP_FLAG = "titan-dev-sw-cleanup";

export function DevServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!("serviceWorker" in navigator)) return;

    const cleanup = async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));

      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));

      if (
        registrations.length > 0 &&
        !sessionStorage.getItem(CLEANUP_FLAG)
      ) {
        sessionStorage.setItem(CLEANUP_FLAG, "1");
        window.location.reload();
      }
    };

    void cleanup().catch(() => {});
  }, []);

  return null;
}
