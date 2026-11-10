# Phase 1-2 checkpoint: audit, correctness and security

## Fixed
- results.js: browser-supplied sessionCode can no longer override trusted sessions (mismatch -> 400, IUMS never called).
- batchHelper.js: new `resolveExamSession` + `VERIFIED_EX_SESSIONS` (only 2024/Sem1 Ex = 112025 verified).
- results.js: grades now come from js/academic.js; FL/IL/WL show 0 (previously "N/A"); `passed` flag added per subject.
- results.js: response now includes examType, attemptNumber, sessionCode. Added /fetch rate limit (FETCH_RATE_LIMIT_MAX, default 40 per 15 min per IP).
- auth.js: removed hardcoded demo login (admin@admin.com / admin123), the fake token `demo-jwt-token-12345`, and the unauthenticated demo `/me`. `/me` now requires a real JWT.
- seedAdmin.js: removed hardcoded password; first admin is created only from ADMIN_EMAIL + ADMIN_PASSWORD env vars. Existing admins are untouched.
- server.js: static serving limited to css/, js/, assets/, admin/ and data/links.json (project root, api/, tests/, package.json were publicly readable); *.backup/*.bak/*.map never served; removed /test-iums and /debug-network; removed dead code after module.exports.
- history.js: entries store examType; Regular and Ex for the same enrollment+semester are separate; legacy entries read as Regular; HTML-escaped output; card click now restores examType.
- app.js: toast mojibake fixed (unicode escapes, textContent); history restores exam type; history saved after a successful fetch; "original IUMS" link uses the server's directUrl (correct session).
- tests: mojibake removed from academic.test.js; new tests/backend.test.js (19 tests, IUMS/MongoDB stubbed).

## Files changed
api/server.js, api/routes/results.js, api/routes/auth.js, api/utils/batchHelper.js, api/utils/seedAdmin.js,
api/models/Student.js (additive `passed` field), js/app.js, js/history.js, tests/academic.test.js,
tests/backend.test.js (new), package.json (test script), .env.example, PHASE2_CHANGES.md.
Line endings in rewritten files are normalised to LF.
