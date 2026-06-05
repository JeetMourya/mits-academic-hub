# Changelog — MITS Academic Hub

## [1.2.0] — 2025-06-05

### Unified Platform Architecture

- Merged separate admin panel into the main dashboard (`index.html`).
- **Student Mode** (default) — results, calculators, history unchanged.
- **Admin Mode** (after login) — semester management section appears dynamically.
- Navbar **Admin Login** button opens a modal (guest users only).
- Navbar **Admin Profile** dropdown with Semester Management link and Logout.
- `admin/admin.html` now redirects to `index.html#admin`.
- Admin logic moved to `js/admin.js`; semester changes refresh student dropdown live.

## [1.1.0] — 2025-06-05

### Academic Calculations (Critical Fixes)

- **SGPA grade scale** — Replaced incorrect O/A+/P/F scale with official MITS-DU grades: AAA, AA, A, B+, B, C, D, FL, IL, WL.
- **SGPA formula** — Centralized `Σ(Credit × Grade Point) / Σ(Credits)` in `js/academic.js`.
- **CGPA formula** — Verified weighted calculation `Σ(SGPA × Semester Credits) / Σ(Semester Credits)` (not simple average).
- **Percentage formula** — Fixed from incorrect `(SGPA − 0.75) × 10` to official **CGPA × 10**.
- **CGPA Predictor** — Validated required-SGPA math; added achievable check for SGPA > 10.
- **Shared module** — New `js/academic.js` removes duplicate logic between calculators.

### Admin Panel Security

- **Login screen** — Username + password gate before admin dashboard loads.
- **Session auth** — `sessionStorage`-based sessions with expiry.
- **Route protection** — Direct access to `admin/admin.html` shows login; dashboard hidden until authenticated.
- **Logout** — Logout button clears session.
- **Inactivity timeout** — Auto-logout after 15 minutes of inactivity (configurable).
- **Brute-force protection** — Lockout after 5 failed attempts for 15 minutes.
- **Hidden admin links** — Navbar/footer admin links visible only when admin session is active.
- **Central config** — Credentials and timeouts in `js/config.js`.

### Admin Features

- **Enable/Disable toggle** — Quick ⏸/▶ button per semester row.
- **Future semesters** — Auto-increment semester ID supports semesters 4–8+ without code changes.

### Code Quality

- Event delegation in SGPA/CGPA calculators (fixes duplicate listener bug on add-row).
- Progress card shows percentage from CGPA.
- CGPA result panel shows equivalent percentage.
- Accessibility: `aria-selected` on tool tabs.

### Tests

- Added `tests/academic.test.js` with Node.js test runner (`npm test`).
- Covers grade points, SGPA, weighted CGPA, percentage, and predictor.

### Configuration

Default admin credentials (change in `js/config.js`):

- Username: `admin`
- Password: `mits@hub2025`
