import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cache } from "react";

/** Max wall-clock time the online validation may take before we treat the
 * auth server as unreachable and fall back to the local session. Kept short
 * so a slow/blackholed auth server never stalls the render for long. */
const GET_USER_TIMEOUT_MS = 1_500;

/**
 * Resolve the authenticated user WITHOUT bouncing people to /login when
 * the network is down.
 *
 * `auth.getUser()` validates the JWT against Supabase Auth over the
 * network — offline it always "fails", which used to trigger
 * `redirect("/login")` on every protected route (and can HANG for minutes
 * against a blackholed route, since supabase-js retries internally).
 *
 * Strategy:
 *  1. Read the locally stored session (`auth.getSession()` — cookie-only,
 *     no network). No session at all -> definitively logged out -> null.
 *  2. Race `getUser()` against a short timeout:
 *     - Fresh validated user -> use it.
 *     - Definitive rejection by the auth server (400/401/403, e.g. revoked
 *       token) -> null so callers send the user to /login.
 *     - Network failure OR timeout -> fall back to the session user so the
 *       app keeps working offline — but ONLY while the access token has not
 *       expired. A stale token must never grant a fallback identity.
 *
 * Use `getVerifiedUser` for MUTATIONS: it fails closed and never trusts the
 * local session.
 */
export const getAuthUser = cache(async function getAuthUser(
  supabase: SupabaseClient,
  timeoutMs: number = GET_USER_TIMEOUT_MS
): Promise<User | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const attempt = (async (): Promise<
    { kind: "ok"; user: User } | { kind: "rejected" } | { kind: "network" }
  > => {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (data?.user) return { kind: "ok", user: data.user };

      const status = (error as { status?: number | null } | null)?.status;
      if (
        status !== undefined &&
        status !== null &&
        [400, 401, 403].includes(status)
      ) {
        // The auth server answered and rejected this token.
        return { kind: "rejected" };
      }

      // Unreachable auth server (fetch failed, 5xx...) — stay in.
      return { kind: "network" };
    } catch {
      // Thrown network errors (TypeError: fetch failed etc.) — stay in.
      return { kind: "network" };
    }
  })();

  const timeout = new Promise<{ kind: "timeout" }>((resolve) => {
    setTimeout(() => resolve({ kind: "timeout" }), timeoutMs);
  });

  const outcome = await Promise.race([attempt, timeout]);

  switch (outcome.kind) {
    case "ok":
      return outcome.user;
    case "rejected":
      return null;
    default:
      return fallbackSessionUser(session);
  }
});

/**
 * Offline fallback identity from an unverified local session. Only valid
 * while the embedded access token is still within its declared lifetime;
 * an expired session falls through as logged-out instead of impersonating.
 */
function fallbackSessionUser(session: {
  user: User;
  expires_at?: number | null;
}): User | null {
  if (
    typeof session.expires_at === "number" &&
    session.expires_at * 1000 <= Date.now()
  ) {
    return null;
  }
  return session.user;
}

/**
 * Fail-closed identity resolution for MUTATING operations (server actions,
 * sync API). Unlike `getAuthUser`, there is NO offline fallback: if the
 * auth server cannot verify the caller's token within the timeout, the
 * request is treated as unauthenticated. A forged or stale cookie can
 * never authorize a write.
 */
export async function getVerifiedUser(
  supabase: SupabaseClient,
  timeoutMs: number = GET_USER_TIMEOUT_MS
): Promise<User | null> {
  const attempt = supabase.auth.getUser().then(({ data }) => data.user ?? null);
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), timeoutMs);
  });
  return Promise.race([
    attempt.catch(() => null),
    timeout,
  ]) as Promise<User | null>;
}
