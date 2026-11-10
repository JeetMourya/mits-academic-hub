# Phase 3: frontend redesign (home, navigation, branding, verification form)

Baseline: Phase 2 (no backend, API, model, security or history-logic file was touched).

## New / changed files
- css/mv-design.css (new): design system. Navy / white / purple tokens for light + dark, buttons, inputs,
  cards, nav, hero, segmented control, footer. Loaded after css/style.css, which is unchanged.
- index.html: new head/title/branding, navigation + mobile menu, hero, quick-access cards, verification form,
  "Before you start" panel, About (How it works + Important information), footer. SVG icon sprite (no emoji).
  All 113 pre-existing element IDs are preserved (verified by diff); tools/admin/history/result markup unchanged.
- js/verify-ui.js (new): Regular/Ex segmented control synced to the original #exam-type-select, menu
  Escape/outside-click/resize, quick-card -> calculator tab shortcuts. No API calls.
- js/theme.js: SVG icons instead of emoji; default theme is now light (stored choice still respected).
- js/app.js: (1) semester pre-load no longer blocks form wiring (form was dead until /api/results/semesters
  returned); (2) CAPTCHA error message was hidden immediately by refresh() - now shown; (3) history restore
  notifies the exam-type control; (4) button label.
- tests/e2e/phase3.e2e.py (new): Playwright browser suite (requires `pip install playwright`).

## Removed
Fake hero stats ("3+ Semesters", "100% Free"), the fake sample enrollment/"Verified" card, the typo
"mits acedamic 2026", decorative ambient blobs, emoji icons.

## Not in this phase (Phase 4/5)
Marksheet header showing exam type/attempt/session, print stylesheet, calculator redesign, history and admin UI.
index.html/theme.js diffs are large because CRLF line endings were normalised to LF.
