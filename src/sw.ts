/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference lib="webworker" />

import {
  Serwist,
  CacheFirst,
  StaleWhileRevalidate,
  NetworkOnly,
} from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST?: (readonly [string, string] | string)[];
};

// `renotify` is part of the Notifications spec but missing from TS lib types.
declare global {
  interface NotificationOptions {
    renotify?: boolean;
  }
}

// __SW_MANIFEST is injected at build time by Serwist/Next.js
const precacheManifest: any[] = self.__SW_MANIFEST ?? [];

const EXERCISE_MEDIA_CACHE = "gym-exercise-media-v1";
const STATIC_CACHE = "gym-static-v1";

const serwist = new Serwist({
  precacheEntries: precacheManifest,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: /\/_next\/static\/.*/i,
      handler: new StaleWhileRevalidate({
        cacheName: STATIC_CACHE,
      }),
    },
    {
      matcher: /\.(gif|png|jpg|jpeg|webp|svg)$/i,
      handler: new CacheFirst({
        cacheName: EXERCISE_MEDIA_CACHE,
      }),
    },
    {
      matcher: /\/icons\/.*/i,
      handler: new CacheFirst({
        cacheName: "gym-icons-v1",
      }),
    },
    {
      matcher: /\.(woff|woff2|ttf|eot)$/i,
      handler: new CacheFirst({
        cacheName: "gym-fonts-v1",
      }),
    },
    {
      matcher: /\/api\/.*/i,
      handler: new NetworkOnly(),
    },
    // Navigations are intentionally NOT cached: pages are authenticated and
    // user-specific, so serving a cached snapshot shows stale workouts
    // (missing exercises/animations). Offline UX is handled in-app
    // (OfflineOverlay + Dexie-backed sessions) once the shell has loaded.
  ],
});

serwist.addEventListeners();

// Flush HTML snapshots cached by earlier builds of this service worker.
self.addEventListener("activate", ((event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .delete("gym-navigation-v1")
      .then(() => caches.delete("gym-static-v1"))
  );
}) as EventListener);

// ============================================================
// PUSH + NOTIFICATION CLICK (Phase 10)
// The backend can deliver web-push messages when VAPID keys are
// configured; the app degrades gracefully without them.
// ============================================================
interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
}

self.addEventListener("push", ((event: PushEvent) => {
  let payload: PushPayload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "SWEAT", {
      body: payload.body,
      tag: payload.tag,
      renotify: Boolean(payload.tag),
      data: { url: payload.url },
    })
  );
}) as EventListener);

self.addEventListener("notificationclick", ((event: NotificationEvent) => {
  event.notification.close();

  const target =
    ((event.notification.data as { url?: string } | undefined)?.url ??
      "/dashboard");

  // Only allow internal navigation targets.
  const url = new URL(target, self.location.origin);
  if (url.origin !== self.location.origin) url.pathname = "/dashboard";

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Focus an existing app window and try to navigate it.
      const existing = windowClients.find(
        (client) => client.url.startsWith(self.location.origin)
      );
      if (existing && "focus" in existing) {
        if ("navigate" in existing) {
          try {
            await existing.navigate(url.toString());
          } catch {
            // Client-side router will resolve the path on focus.
          }
        }
        return existing.focus();
      }
      return self.clients.openWindow(url.toString());
    })()
  );
}) as EventListener);
