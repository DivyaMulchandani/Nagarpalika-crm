# Phase 2: Public-Facing Frontend (API-Driven)

| Field | Value |
|-------|-------|
| **Phase** | 2 of 9 |
| **Status** | 🔴 Not Started — static site exists, zero API integration |
| **Depends On** | Phase 1 (Advertisement, Notice, Candidate models + routes must exist) |
| **Blocks** | Phase 3 (nav restructure needed before OTR flow) |
| **PRD Sections** | §5 M1 Home Page · §10 Existing Frontend Carry-Over |

---

## Current State

React 18 + Vite SPA at `Web/`. All 7 routes exist. All data is hardcoded in `src/data/*.js`. Zero API calls. Forms are UI-only (not functional).

| Route | File | Status |
|-------|------|--------|
| `/` | `Home.jsx` | Static — hardcoded facts/services/news |
| `/about` | `About.jsx` | Static — keep as-is |
| `/careers` | `Careers.jsx` | Static — data from `src/data/jobs.js` |
| `/notices` | `Notices.jsx` | Static — hardcoded list |
| `/results` | `Results.jsx` | Static — UI only, not functional |
| `/callletter` | `CallLetter.jsx` | Static — UI only, not functional |
| `/contact` | `Contact.jsx` | Static — form not functional |

**Needs:** `/registration`, `/application`, `/fee`, `/help` routes don't exist yet.

---

## Deliverables

### 1. Nav Restructure (`Web/src/components/Header.jsx`)

Current: flat 7-item nav bar.
Required per SRS §3.1.2: dropdowns on Registration and Online Application.

| Menu Item | Type | Sub-items |
|-----------|------|-----------|
| Home | Link | — |
| Registration | Dropdown | Apply (new OTR) · Edit · Find |
| Online Application | Dropdown | Apply · Edit · Print |
| Fee | Link | — |
| Call Letter | Link | — |
| Help | Link | — |
| Login / Register | Modal trigger | — |

Also add:
- Branding bar (topmost): municipality logo, name in GU + EN, GoG emblem — fetched from `/api/v1/companies/getCompanyDetails` per tenant
- Ticker bar 1: toll-free helpline (from config API)
- Ticker bar 2: OTR status message (from config API — admin-editable)

### 2. Home Page (`/`) — `Web/src/pages/Home.jsx`

- Notice board section: `GET /api/v1/notices?status=published&limit=10` → title, date, PDF link
- Quick links grid: static (6 links per SRS §3.1.6) — no API needed
- Important Instructions section: `GET /api/v1/notices?type=important_instruction`
- Remove hardcoded FACTS, NEWS, VM_ITEMS arrays; replace with API data or remove

### 3. Careers (`/careers`) — `Web/src/pages/Careers.jsx`

- Replace `src/data/jobs.js` with `GET /api/v1/advertisements?status=published`
- Display: Advt No, Post Title, Dept, Last Date, Fee, Class, Status badge
- Filter chips by Class (I/II/III/IV) — client-side filter on fetched data
- "Details" → open advertisement PDF via `/api/v1/advertisements/:id/pdf`
- "Apply" → redirect to `/application` (requires auth — handled in Phase 4)

### 4. Notices (`/notices`) — `Web/src/pages/Notices.jsx`

- Replace hardcoded list with `GET /api/v1/notices?status=published`
- Filter by type: All / Notice / Circular / Press / Recruitment / Tender
- Each row: title, date, ref no, type badge, PDF link

### 5. Results (`/results`) — `Web/src/pages/Results.jsx`

- Wire to `GET /api/v1/notices?type=recruitment&subtype=result`
- Result lookup form: implement `POST /api/v1/results/check` (registration_id + dob) in Phase 1 if needed; else keep UI static until data model defined

### 6. Call Letter (`/callletter`) — replace with functional M5

This page is completely replaced in Phase 6. For now: keep existing static UI. Phase 6 wires it to the real eligibility-check + download flow.

### 7. New Routes to Add

| Route | Component | Notes |
|-------|-----------|-------|
| `/registration/*` | Multi-step OTR flow | Phase 3 |
| `/application/*` | Application module | Phase 4 |
| `/fee` | Fee payment page | Phase 5 |
| `/help` | Help/Query page | This phase (static content + form POST) |

#### `/help` — `Web/src/pages/Help.jsx` (build in this phase)
- Toll-free number + email contact (from config API)
- FAQ (collapsible accordions — static content)
- Step-by-step guides (static — How to Register, How to Apply)
- Query form: name, Reg ID, category dropdown, description → `POST /api/v1/help/query`

### 8. API Client Setup (`Web/src/api/`)

Create Axios instance reading `VITE_API_URL` from `Web/.env`:
```javascript
// Web/src/api/index.js
import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });
export default api;
```

Add `axios` to `Web/package.json` dependencies.

### 9. Language Support

All new API-driven content must support the existing `useLang()` hook pattern. Add new i18n keys to `Web/src/data/i18n.js` for any new UI strings.

---

## Backend Endpoints Required (Phase 1 must build these)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/advertisements` | GET | None | List published advertisements |
| `/api/v1/advertisements/:id/pdf` | GET | None | Serve advertisement PDF |
| `/api/v1/notices` | GET | None | List notices (filterable) |
| `/api/v1/companies/getCompanyDetails` | GET | None | Tenant branding + helpline |
| `/api/v1/help/query` | POST | None | Submit help query |

---

## Acceptance Criteria

- Nav has dropdowns on Registration and Online Application
- Branding bar shows correct municipality name per subdomain
- `/careers` loads from API — zero hardcoded job data in component files
- `/notices` loads from API — zero hardcoded notice data
- `/help` form submits without errors
- `VITE_API_URL=http://localhost:8000` in `Web/.env` — dev proxy works
- All pages render basic content without JavaScript (SSR/pre-render or graceful fallback)
- WCAG 2.1 AA: axe-core passes on all routes
- Mobile-responsive: 360px, 768px, 1280px viewports tested

---

## Security Checklist

- [ ] Advertisement PDF endpoint: path traversal not possible via `:id` param (validate UUID format)
- [ ] No tenant data cross-leakage on public endpoints (test both subdomains)
- [ ] CSP header present and blocks inline script execution
- [ ] X-Frame-Options: DENY on all pages
- [ ] Rate limiting on public GET endpoints: 100 req/min per IP (already on server — verify)
