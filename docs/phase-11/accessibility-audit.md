# Phase 11 — Accessibility Audit

Standard: WCAG 2.1 AA (target), verified by code inspection + axe-style manual
checks; no automated a11y runner is wired into CI (documented gap).

## Fixed this phase

| ID | Issue | Fix |
|----|-------|-----|
| B1 | PWA install banner used `text-white` on light surfaces (contrast failure) | switched to theme token `text-foreground` |
| B2 | Rest timer / countdown state changes were silent for screen readers | sr-only `role="status" aria-live="polite"` live regions added to **both** rest and exercise stage branches of the workout player; announcements are event-driven (set completion, phase transition, final-5s countdown, workout complete) — implemented via handler/tick callbacks rather than effects (react-hooks compliant) |
| B14 | Signup "Show password" toggle aria-label typo ("passwords") | corrected |
| B5 | Profile save showed unconditional "Saved" even on RPC error | error state surfaced with `role="alert"` paragraph |

## Verified in place

- Skip-to-content link; landmark structure (`header/nav/main`) on protected shell.
- All interactive controls keyboard-operable; visible focus rings via Tailwind
  defaults + `focus-visible:` styles on primary CTAs.
- Forms: labels bound with `htmlFor`; errors announced via `role="alert"`
  (login/signup/profile/weight entry).
- Bottom mobile nav has `aria-current="page"` handling and icon+label pairs.
- Workout player: exercise name/set progress exposed as text (not color-only);
  rest timer digits mirrored in an accessible node; skip/finish buttons ≥44px hit
  area.
- Reports charts have text alternatives (numeric tables/values rendered alongside).
- `prefers-reduced-motion`: framer-motion usage is limited to short transitions;
  timer digits do not animate.

## Residual (low)

- Chart SVGs rely on adjacent text summaries rather than per-point descriptions.
- Notification list groups use headings but lack `aria-setsize` bookkeeping.

Both accepted as non-blocking for V1; logged for Phase 12 polish.
