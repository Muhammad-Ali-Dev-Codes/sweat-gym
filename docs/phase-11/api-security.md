# Phase 11 — API Security

## Surface

| Endpoint | Auth | Notes |
|---|---|---|
| `POST /api/sync` | session (cookie) | offline queue delivery; zod-validated |
| `GET /api/health` | public | no data exposure |

Server Actions are POST-only by framework design and re-check auth server-side
(`createClient()` + `getUser()`), never trusting client-supplied user ids.

## `/api/sync` hardening (this phase)

1. **Envelope schema**: `operationId` 8–128 chars, `operationType` enum,
   `payload` per-type zod schema (UUIDs, bounded ints, ≤100 exercises, timestamps
   parseable & ≤64 chars).
2. **QA-H2 fix — plan-day ownership/lock guard**: a queued completion may only
   reference a `user_plan_days` row the caller owns (RLS scopes the SELECT) and
   that is not `locked`; otherwise 400.
3. **Replay guard**: sessions already `completed` short-circuit as success no-op
   (never rewinds).
4. **QA-H9 fix — idempotency key restored**: upsert now persists
   `client_operation_id = operationId` (NOT NULL UNIQUE column); previously every
   delivery failed with 500.
5. **Error masking**: internal errors are logged server-side only; clients receive
   generic `{ "error": "Sync failed" }` / `"Not authenticated"` /
   `"Malformed sync payload"`. Verified: no SQL/Postgres strings in responses.

## Live HTTP test results (`src/scripts/api-phase11.ts`, production build)

| Check | Result |
|---|---|
| Unauthenticated POST → 401 JSON | ✅ |
| Malformed envelope → 400 | ✅ |
| Unparseable timestamp → 400 | ✅ |
| durationSeconds 86 400 → 400 | ✅ |
| Locked plan day via sync → 400 `Invalid plan day` | ✅ |
| Valid queued completion → 200, Day2 unlocked | ✅ |
| Exact replay → 200 no-op, still exactly 1 notification | ✅ |
| Foreign-session hijack (U→V) → ≥400 generic, victim row untouched | ✅ |

**Result: 12/12 pass** against a production build served on a scratch port.

## Service worker boundary

`src/sw.ts` NetworkOnly for `/api/*` (no cached API responses); push-notification
click navigation is origin-checked with `/dashboard` fallback for foreign targets.
