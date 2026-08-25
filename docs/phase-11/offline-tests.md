# Phase 11 — Offline & Sync Tests

## Architecture under test

Dexie-backed operation queue → `SyncWatcher` (flush on `online` event + navigation)
→ `POST /api/sync` → zod validation → ownership/lock guards → idempotent upserts →
authoritative completion RPC + achievements. Client-generated session UUID gives
primary-key idempotency; queue `operationId` doubles as the schema's unique
`client_operation_id`.

## Verified this phase

| Scenario | Level | Result |
|---|---|---|
| Queue flush trigger mounted and fires | unit (Phase 10 suite, still 142 green) | ✅ |
| Valid queued WORKOUT_COMPLETED delivered over HTTP | live HTTP | ✅ 200; Day2 unlocked; reports/dashboard revalidated |
| Exact replay of same queued op | live HTTP | ✅ 200 no-op; exactly one notification |
| 6-way concurrent replay of same session | live DB | ✅ all `already_completed`, single progression/notification |
| Locked plan day smuggled through sync payload | live HTTP | ✅ 400 `Invalid plan day` |
| Foreign-session hijack through sync | live HTTP | ✅ fails closed ≥400, victim untouched |
| Malformed/partial payloads (bad ts, huge duration) | live HTTP | ✅ 400 |
| **QA-H9 regression**: delivery previously always 500 (`client_operation_id` NOT NULL violated) | live HTTP before/after fix | ✅ now passes |
| SW never serves cached API responses | code audit (`NetworkOnly` for `/api/*`) | ✅ |
| Navigations intentionally not cached (auth'd pages) — stale-snapshot risk removed by earlier builds' cache purge on activate | code audit + activate handler deletes legacy caches | ✅ |

## Known offline limitations

- Background Sync API is not used; flush requires the tab/app to be open or
  reopened (acceptable per PRD: member-facing workout capture happens in-app).
- Server push delivery still requires VAPID sender (Phase 12 backlog item,
  unchanged from Phase 10).
