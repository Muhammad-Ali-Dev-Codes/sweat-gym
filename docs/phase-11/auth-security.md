# Phase 11 — Authentication & Authorization Security

## Architecture

- Supabase Auth (email+password). Sessions via `@supabase/ssr` cookie storage
  (`sb-<ref>-auth-token`, base64url-encoded, chunked >3180 B).
- Clients: browser (`@supabase/supabase-js` + anon key), server
  (`createServerClient` bound to request cookies), admin (service role, server-only).
- Email confirmation is **enforced** on the project (verified live: signup returns no
  session until confirm).

## Route protection

- `src/proxy.ts` (new) replaces deprecated `src/middleware.ts` (Next 16 proxy
  convention; build log confirms `ƒ Proxy (Middleware)` with no deprecation warning).
- Unauthenticated users hitting protected routes are redirected; unauthenticated
  `/api/*` receives JSON 401 (verified over HTTP).
- Session refresh handled in the proxy with `supabase.auth.getUser()` (server-verified,
  never trusts raw JWT claims).

## Findings & fixes

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| QA-L2 | LOW | `auth/callback` forwarded attacker-controlled `next` param (open redirect) | Allow-listed to same-origin paths beginning `/`; fallback `/dashboard` |
| — | INFO | OAuth callback exchanges code once; replay returns controlled error page | Verified by code review |

## Authorization invariants verified live

- Ownership guard on the completion RPC fails closed for anonymous callers
  (`auth.uid() IS NULL → forbidden`) and for foreign owners (`IS DISTINCT FROM`).
- Cross-account SELECT/UPDATE/DELETE denied on all private tables
  (see rls-audit.md matrix).
- Account deletion (service role, user-initiated with re-auth) cascades every
  private table — verified row-by-row after `auth.admin.deleteUser`.

## Password & session hygiene

- Min 8 chars enforced client+server (zod); breach checks deferred to Supabase
  defaults (documented limitation).
- Cookies are httpOnly/SameSite=Lax by ssr defaults; PKCE flow configured.
- Sign-out clears cookies and local Dexie cache (client-side wipe verified by unit
  tests from Phase 8).
