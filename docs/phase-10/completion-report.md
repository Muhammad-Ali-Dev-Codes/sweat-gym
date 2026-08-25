# Phase 10 Completion Report — Reports, Progress & Notifications

Date: 2026-08-23

## Scope Delivered
- Reports dashboard: 7 timezone-aware ranges, workout/calorie/duration stats,
  per-day/weekly/monthly series, like-for-like previous-period comparisons,
  category + level mix, deterministic insights, all-time hero band.
- Streaks (current/longest/milestones) from a single shared implementation used by
  Reports, Dashboard, and the stats service; mirrored by `calculate_current_streak_local`.
- Plan progress ring driven by real `user_plan_days` rows; weight tracking with
  append-only history, target line, and validated logging action.
- Achievements: 12 rules, pure evaluation, idempotent awards
  (`UNIQUE(user_id, achievement_key)`), gallery with progress bars.
- Notifications: typed feed with dedupe (`UNIQUE(user_id, type, dedupe_key)`),
  Today/Yesterday/Earlier grouping, unread/read state, mark one/all, shell badge,
  preference gating in both app code and the completion RPC, deep links
  (internal-only, origin-checked SW click handler).
- Local reminders via ServiceWorker incl. streak-protection variant; push subscription
  capture when `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is present.

## Audit Remediations (this phase)
1. **Sync flush trigger mounted** — `SyncWatcher` flushes the offline queue on
   connectivity regain / route change and refreshes server components. Previously the
   trigger existed but was never mounted, so offline completions never reached the API.
2. Fallback sync payload now includes per-exercise outcomes where ids are known.
3. Dashboard plan denominator uses actual plan length; rolling week card relabeled
   "Last 7 Days"; streak-card and weight-entry labels are timezone-aware.
4. Reports reachable from mobile bottom nav; dashboard weight CTA points to /reports.
5. Middleware answers unauthenticated `/api/*` with JSON 401.

## Verification
- `npm run typecheck` — clean
- `npm run lint` — 0 errors
- `npm test` — 137 passing (report calc/ranges/insights, grouping, achievements,
  dates, calories, personalization, offline sync/workout/cache)
- `npm run build` — production build succeeds
- `src/scripts/e2e-phase9.ts` covers the live-DB chain (RPC completion → progression →
  streak → deduped notifications → ownership guard); not executed during audit to avoid
  writing to the remote project.

## Known Limitations
- Real web-push delivery requires VAPID keys + a server-side sender (cron/function);
  subscriptions are captured but nothing sends yet.
- `recommendation` / `system` notification types have preferences but no producers.
- Notification feed is capped at 100 items per page view (no pagination UI).
