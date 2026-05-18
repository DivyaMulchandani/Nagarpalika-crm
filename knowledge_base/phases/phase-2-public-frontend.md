# Phase 2: Public-Facing Frontend (API-Driven)

| Field | Value |
|-------|-------|
| **Phase** | 2 of 9 |
| **Status** | Not Started |
| **Depends On** | Phase 1 (API skeleton, DB, multi-tenant middleware) |
| **Blocks** | Phase 3 (nav restructure needed before OTR flow) |
| **PRD Sections** | §5 M1 Home Page · §10 Existing Frontend Carry-Over |

---

## Goal

Convert the existing static React/Vite site into an API-driven public portal. No citizen auth required in this phase — all pages are guest-accessible. Replace hardcoded `jobs.js`, `marqueeItems.js`, and static arrays with live API calls. Restructure nav to match SRS §3.1.2.

---

## Existing Frontend State

Current site: React 18 + Vite SPA, 7 routes, all data hardcoded in JS files. No auth, no API.

| File | Current | Action |
|------|---------|--------|
| `src/data/jobs.js` | 10 hardcoded job posts | Replace with API call to `/api/v1/advertisements` |
| `src/data/marqueeItems.js` | 5 hardcoded items | Replace with API call to `/api/v1/notices?marquee=true` |
| `src/pages/Notices.jsx` | 12 hardcoded notices | Replace with API call to `/api/v1/notices` |
| `src/pages/Results.jsx` | Hardcoded results | Replace with API call to `/api/v1/results` |
| `src/pages/Home.jsx` | Hardcoded facts/news | Notice board from API; quick links static |
| `src/components/Header.jsx` | Flat 7-item nav | Restructure: add dropdowns per SRS §3.1.2 |

---

## Deliverables

### Navigation Restructure (`Header.jsx`)
- [ ] Replace flat nav with dropdown-capable nav
- [ ] Menu items per SRS §3.1.2:
  - Home
  - Registration → [Apply, Edit, Find]
  - Online Application → [Apply, Edit, Print]
  - Fee
  - Call Letter
  - Help
  - Login / Register (modal trigger)
- [ ] Branding bar (topmost): municipality logo, name in Gujarati + English, GoG emblem — loaded per tenant from config API
- [ ] Ticker bar 1: toll-free helpline number (from config API)
- [ ] Ticker bar 2: OTR status message (from config API, admin-editable)
- [ ] Language toggle: EN / GU retained (HI optional); all new i18n keys added to `i18n.js`

### Home Page (`/`)
- [ ] Notice board section: fetch from `/api/v1/notices` — title, date, PDF link
- [ ] Quick links grid: static (6 links per SRS §3.1.6)
- [ ] Important Instructions section: fetch from `/api/v1/config/instructions`
- [ ] Remove hardcoded FACTS, NEWS, VM_ITEMS arrays — replace with API data or remove

### Careers / Job Listings (`/careers`)
- [ ] Fetch active advertisements from `/api/v1/advertisements?status=published`
- [ ] Display: Advt No, Post Title, Department, Last Date, Fee, Class
- [ ] Filter by Class (I / II / III / IV) — client-side filter
- [ ] "Details" button → open advertisement PDF in new tab (served from `/api/v1/advertisements/:id/pdf`)
- [ ] "Apply" button → redirect to `/application` (requires login — handled in Phase 4)

### Notices (`/notices`)
- [ ] Fetch from `/api/v1/notices?type=all`
- [ ] Display: title, date, ref no, type badge, PDF link
- [ ] Filter by type: All / Notice / Circular / Press / Recruitment / Tender

### Results (`/results`)
- [ ] Fetch from `/api/v1/results` (admin-uploaded result notifications)
- [ ] Display: advt no, post title, result date, PDF link
- [ ] Answer keys linked where available

### About & Contact
- [ ] Keep static; update with municipality-specific placeholders
- [ ] Contact info loaded from tenant config API (phone, email, address)

### API Endpoints Required (Backend — this phase)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/advertisements` | GET | None | List published advertisements |
| `/api/v1/advertisements/:id/pdf` | GET | None | Serve advertisement PDF |
| `/api/v1/notices` | GET | None | List notices (filterable by type) |
| `/api/v1/results` | GET | None | List result notifications |
| `/api/v1/config/branding` | GET | None | Tenant logo, name, helpline |
| `/api/v1/config/instructions` | GET | None | Important Instructions text |

---

## Acceptance Criteria

- Nav matches SRS §3.1.2 exactly (dropdowns, 7 top-level items)
- Branding bar shows correct municipality identity per subdomain
- Job listings load from API — zero hardcoded data in component files
- Notices and Results load from API
- Ticker bars populated from config API
- All pages render without JS for basic content (SSR or pre-rendered fallback)
- WCAG 2.1 AA: no automated accessibility failures (axe-core clean)
- Mobile-responsive: tested on 360px, 768px, 1280px viewports

---

## Security Checklist (Pentest Targets for This Phase)

- [ ] Advertisement PDF endpoint: no path traversal possible in `:id` parameter
- [ ] No tenant data leakage between subdomains on public endpoints
- [ ] CSP header present and blocks inline script execution
- [ ] X-Frame-Options: DENY on all pages
- [ ] No sensitive config (DB credentials, API keys) exposed in any public endpoint response
- [ ] Rate limiting on public GET endpoints: 100 req/min per IP
