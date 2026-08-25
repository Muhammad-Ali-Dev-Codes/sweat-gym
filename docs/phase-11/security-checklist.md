# Phase 11 — Security Checklist

## Secrets & keys
- [x] No secrets/keys in `src/`, `public/`, or repo history (fresh repo, no commits)
- [x] `.env.local` gitignored; `.env.example` carries placeholders only
- [x] Service-role key used only in server-only contexts: account-deletion action + dev scripts
- [x] No `NEXT_PUBLIC_*` variable exposes privileged material
- [x] VAPID keys absent → push capture disabled gracefully (no dead endpoints)

## Authentication
- [x] Email confirmation enforced server-side (live-verified)
- [x] Session via httpOnly cookies (`@supabase/ssr`), PKCE flow
- [x] Proxy protects routes, refreshes sessions with `getUser()` (server verification)
- [x] Unauthenticated `/api/*` → JSON 401 (HTTP-verified)
- [x] OAuth/callback: single-use code exchange, open-redirect guard on `next`
- [x] Sign-out clears session + local Dexie cache

## Authorization / RLS
- [x] RLS enabled on all member tables; policies owner-scoped
- [x] Public tables read-only for members (write attempts filtered)
- [x] Cross-account CRUD matrix 100% denied (2-user live penetration)
- [x] SECURITY DEFINER surface minimized: legacy unowned functions dropped;
      completion RPC hardened (anon check, `IS DISTINCT FROM` ownership,
      locked-day guard) and revoked from `anon`
- [x] DB triggers block client-role writes of terminal statuses
- [x] One-active-plan / one-in-progress-session enforced by partial unique indexes

## Input validation & injection
- [x] All server actions zod-validated; profile/onboarding hardened this phase
- [x] `/api/sync` payload schema strict (enums, UUIDs, bounded numbers/timestamps)
- [x] Parameterized PostgREST queries only — no string-built SQL in app code
- [x] Timestamps bounded/parsed before persistence

## API hardening
- [x] Replay/idempotency guards at HTTP route AND database (PK + unique op key)
- [x] Ownership checks before any state transition on queued ops
- [x] Generic client errors; internals logged server-side only (verified over HTTP)

## Client integrity
- [x] No dangerouslySetInnerHTML with user data; markdown-free feeds
- [x] External links not rendered from untrusted input; SW notification click origin-checked
- [x] No client/server boundary violations ("use server" imports audited)

## Dependencies & build
- [x] `npm audit --omit=dev`: 0 vulnerabilities
- [x] Production build green; middleware→proxy migration complete (no deprecated convention)

## Data lifecycle
- [x] Account deletion cascades every private table (row-count verified == 0)
- [x] Weight history append-only; no PII in logs (server logs carry ids/messages only)
