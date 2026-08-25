"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type ConnectivityState = "online" | "offline" | "checking";

export interface ConnectivityInfo {
  state: ConnectivityState;
  isOnline: boolean;
  isOffline: boolean;
  lastOnlineAt: number | null;
  lastOfflineAt: number | null;
  check: () => Promise<boolean>;
}

const CHECK_INTERVAL_MS = 30_000;
const CHECK_TIMEOUT_MS = 5_000;
const OFFLINE_FAILURE_THRESHOLD = 2;

async function pingServer(): Promise<boolean> {
  try {
    const res = await fetch("/api/health", {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function useConnectivity(): ConnectivityInfo {
  // Deterministic initial state on BOTH server and client prevents a
  // hydration mismatch in the offline banner; the real status is synced
  // from navigator/events after mount.
  const [state, setState] = useState<ConnectivityState>("online");
  const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(null);
  const [lastOfflineAt, setLastOfflineAt] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failuresRef = useRef(0);

  const goOnline = useCallback(() => {
    setState("online");
    setLastOnlineAt(Date.now());
  }, []);

  const goOffline = useCallback(() => {
    setState("offline");
    setLastOfflineAt(Date.now());
  }, []);

  const check = useCallback(async (): Promise<boolean> => {
    setState("checking");
    const ok = await pingServer();
    if (ok) {
      goOnline();
    } else {
      goOffline();
    }
    return ok;
  }, [goOnline, goOffline]);

  useEffect(() => {
    // Sync the real status once mounted (deferred to avoid a cascading
    // synchronous setState during the effect).
    const raf = requestAnimationFrame(() => {
      if (!navigator.onLine) goOffline();
    });

    const handleOnline = () => {
      failuresRef.current = 0;
      goOnline();
    };
    const handleOffline = () => goOffline();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // A single failed ping is not proof of being offline (server restart,
    // laptop wake, transient blip) — require consecutive failures before
    // declaring offline, and always recover on a successful ping.
    const evaluate = async () => {
      if (!navigator.onLine) return;
      const ok = await pingServer();
      if (ok) {
        failuresRef.current = 0;
        goOnline();
        return;
      }
      failuresRef.current += 1;
      if (failuresRef.current >= OFFLINE_FAILURE_THRESHOLD) goOffline();
    };

    intervalRef.current = setInterval(evaluate, CHECK_INTERVAL_MS);

    // Background tabs throttle intervals; re-evaluate as soon as the tab
    // becomes visible again so the banner never shows stale state.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void evaluate();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [goOnline, goOffline]);

  return {
    state,
    isOnline: state === "online",
    isOffline: state === "offline",
    lastOnlineAt,
    lastOfflineAt,
    check,
  };
}
