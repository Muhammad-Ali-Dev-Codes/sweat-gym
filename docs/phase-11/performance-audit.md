# Phase 11 — Performance Audit

## Bundle & assets

- Production build: 21 routes, all dynamic (auth-gated by design); Proxy active.
  Build exit 0 with no size warnings emitted by Next.
- `.next/static/chunks` total ≈ **1.9 MB** (uncompressed, pre-gzip) across the
  whole route set — gzip delivery typically ~600 KB; largest shared chunks are
  framework + framer-motion + supabase-js. No single route exceeds budget.
- `public/` = 252 KB (two JPGs at 224 KB total — hero + player backdrop, already
  sized for mobile).
- Exercise GIFs intentionally served as raw `<img>` (animated GIFs don't benefit
  from `next/image`; documented lint warning).

## Rendering & data

- Server components fetch directly; client components only where interaction
  demands it (workout player, forms). No waterfall patterns found in dashboards
  (parallel `Promise.all` fetches in shell layout).
- Reports queries are bounded (`TIMESTAMP_CAP` raised to 1000 rows this phase to
  match plan length; previously a 400-row cap silently truncated 30-day×N plans'
  history in edge cases).
- Revalidation is targeted (`revalidatePath`) after sync completions.

## PWA runtime

- Precache manifest injected by Serwist; static chunks StaleWhileRevalidate;
  media CacheFirst with dedicated caches; fonts CacheFirst; `/api/*` NetworkOnly.
- Navigation preload enabled; skipWaiting/clientsClaim for fast updates.

## Fixed this phase (performance-relevant)

| ID | Issue | Fix |
|----|-------|-----|
| A2 | Stats cap mismatch (400 vs 1000) truncated long histories | unified cap 1000 |
| M6 | Manifest icons missing → install prompt broken | generated 192/512 (+maskable) PNGs |
| QA-H9 | Offline deliveries 500'd → repeated retry storms from queue | idempotency key fix stops unbounded retries |

## Measured checks

- `next start` cold boot < 1 s ("Ready in 456 ms" on scratch port).
- Health endpoint used as liveness probe during HTTP suite; p95 of sync POSTs in
  tests well under 500 ms including RPC completion.

## Accepted trade-offs

- Framer-motion ships on authenticated pages for stage transitions (~40 KB gz);
  V1 keeps it for polish.
- Dexie payload for offline exercise media is metadata-only (no blob caching) per
  PRD storage constraints.
