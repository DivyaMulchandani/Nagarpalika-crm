# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Advertisement detail page (`/advertisement/:id`) — full post info: vacancies by category, eligibility, important dates, PDF download, and Apply button
- `🔍` Details column on Careers table; post title is now a clickable link to the detail page
- Inline OTP login on apply page (`/apply/:id`) — candidates login and submit on the same screen with no redirect
- `.btn-link` utility CSS class for inline anchor-styled buttons

### Fixed
- Apply links used `advt_no` (e.g. `ADV/2026/0006`, contains slashes) as URL segment, breaking React Router — switched to MongoDB `_id`
- OTR `saveStep` sent flat payload `{ step, ...fields }`; backend expects `{ step, data: {...} }` — payload corrected
- Navigating directly to `/registration/apply/step/3+` or refreshing showed "No registration in progress" error — added session check on mount with redirect-to-step-1 banner
- `uploadFile` used bare `fetch` with relative URL, ignoring `VITE_API_URL` — prefixed with `API_BASE`
- OTR submit showed `'—'` for Registration ID (backend sends ID via SMS/email) — replaced with correct confirmation message
- Application auth check called `/api/v1/applications/my` (wrong endpoint); corrected to `/api/v1/applications/me`

- Candidate login via mobile OTP — replaced password-based login with 2-step phone + OTP flow; dev mode accepts `000000` and auto-fills from API response
- `POST /api/v1/otp/candidates/login/send` and `/verify` endpoints with rate limiting and session fixation prevention
- REGISTRATION nav tab in Web header linking to `/registration`
- SiteMarquee fetches live advertisements and notices from API

### Removed
- MasterData and Reports pages/routes from Admin panel
- Static `jobs.js` and `marqueeItems.js` data files (replaced by API-driven marquee)

### Changed
- Resolved open questions Q2/Q3/Q4/Q7 in knowledge base: fee payment online-only via Razorpay, Aadhaar + UIDAI phone OTP, two separate deployments replacing multi-tenant architecture
- Removed multi-tenant middleware task and `tenant_id` from all 6 recruitment model schemas in phase-1 plan
- Updated phase-3 to reflect Aadhaar + phone OTP (UIDAI) and single-deployment unique constraint
- Updated phase-5 to lock payment gateway to Razorpay, remove DD/challan scope, and concrete env var names

### Added
- Three-tier project structure: `Web/` (public portal), `Admin/` (admin panel), `Server/` (REST API backend)
- `Admin/` — full admin panel frontend repurposed from hms-admin (React 18, Reactstrap, Formik, Recharts, role-based permission system)
- `Server/` — Express 4 + MongoDB backend repurposed from hms-server (session auth, secure file uploads, WhatsApp Cloud API, Nodemailer)
- `knowledge_base/` — SRS index, full PRD (incl. 15-section pentest-ready security spec), 9 phase plan docs, and tech-stack reference
- `.env` templates for all three folders with all required variable keys documented
- Converted static HTML/CSS/JS multi-page site to a React 18 + Vite 5 SPA
- React Router v6 client-side navigation across 7 pages (Home, About, Careers, Notices, Results, Call Letter, Contact)
- `LangContext` — EN / HI / GU language toggle with localStorage persistence
- Interactive filter chips on Careers and Notices pages (React `useState`)
- Shared `Header`, `Footer`, and `SiteMarquee` components replacing DOM-injection pattern in `site.js`
- Job listings and i18n strings extracted into typed data modules (`src/data/`)
- Static SVG assets moved to `public/assets/` for Vite static serving
- `CHANGELOG.md` — this file

### Removed
- All HMS (Hospital Management System) code from Admin and Server: Patient, Doctor, Appointment, Invoice, TreatmentPlan, Prescription, CurrencyMaster models, routes, and controllers (60+ files deleted)
- HMS-specific WhatsApp trigger functions (appointment reminder, follow-up, birthday wish, no-show); replaced with recruitment notification stubs
- DOCTOR role replaced with DEPT_ADMIN across roles constant, seed script, and analytics route guards
- Demo/template auth pages (`AuthenticationInner/`) removed from Admin panel
- `doctorScope` middleware deleted; replaced with `roleScope` (department-scoped queries for DEPT_ADMIN)
- Stale root-level source files removed (previously moved to `Web/` subfolder)

### Changed
- Moved public portal source from repo root into `Web/` subfolder
- `Admin/src/config.jsx` reads API base URL from `VITE_API_URL` env var (was hardcoded to `hms.vyaris.com`)
- `Admin/package.json` build script outputs to `Server/out/admin` (was `hms-server/out/admin`)
- `.gitignore` extended to block `.env` files, `Admin/build/`, `Server/out/`, `Server/uploads/`, `Server/log/`
