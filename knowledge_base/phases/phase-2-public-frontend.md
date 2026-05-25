# Phase 2: Public API Layer

| Field | Value |
|-------|-------|
| **Phase** | 2 of 9 |
| **Status** | 🔴 Not Started |
| **Depends On** | Phase 1 (Advertisement, Notice, CompanyMaster models + routes must exist) |
| **Blocks** | Phase 3 (public advertisement list needed for candidate to choose a post) |
| **PRD Sections** | §5 M1 Home Page · §10 Existing Frontend Carry-Over |

> **Backend-first:** This phase delivers verified, production-ready public READ endpoints. The React frontend (`Web/`) that consumes them is deferred to the **Frontend Binding** track after all backend phases are complete.

> **Definition of Done** is defined in Phase 1. Apply those criteria here.

---

## Remaining Work

### 1. Public Advertisement Endpoints

Public routes — no auth required. Verify these exist and are correct from Phase 1.

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/advertisements` | GET | None | List advertisements (filter: `status`, `class`, `dept`) |
| `/api/v1/advertisements/:id` | GET | None | Get single advertisement detail |
| `/api/v1/advertisements/:id/pdf` | GET | None | Serve advertisement PDF (UUID validation, path traversal prevention) |

**Business logic:**
- Default `status=Published` for unauthenticated callers if no `status` param given
- Pagination: `page` + `limit` query params; default `limit=20`, max `limit=100`
- Default sort: `end_date ASC` (soonest-closing first)

---

### 2. Public Notice Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/notices` | GET | None | List notices (filter: `status`, `type`, `is_important_instruction`) |
| `/api/v1/notices/:id` | GET | None | Get single notice |
| `/api/v1/notices/:id/pdf` | GET | None | Serve notice PDF |

**Business logic:**
- Default `status=published` when no filter given by public callers
- Pagination: same pattern as advertisements
- `is_important_instruction=true` notices returned separately for home page hero section

---

### 3. Org Details Endpoint

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/companies/details` | GET | None | Org name, logo path, helpline number — public branding |

Returns the single CompanyMaster record. No authentication required.

---

### 4. Help / Query Endpoint

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/help/query` | POST | None | Accept public help / feedback submission |

Request body: `name`, `registration_id` (optional), `category` (MasterData ref), `description`.

> If this model is trivial and out of scope, defer it to the agile backlog and note it here. Do not block this phase on it.

---

### 5. Rate Limiting Verification

Confirm global rate limiter from Phase 1 covers public endpoints:
- Public GET endpoints: 100 req/min per IP
- `POST /help/query`: 10 req/min per IP (tighter, prevents spam)

---

## Acceptance Criteria

- `GET /api/v1/advertisements` (no auth) returns 200 with paginated list
- `GET /api/v1/advertisements?status=Published` returns only published records
- `GET /api/v1/advertisements/:id/pdf` with valid UUID serves PDF; non-UUID returns 400
- `GET /api/v1/notices?type=recruitment&status=published` returns filtered list
- `GET /api/v1/companies/details` returns org name and logo path
- `POST /api/v1/advertisements` without admin session returns 401
- All endpoints testable via Swagger UI — no browser required

---

## Security Checklist

- [ ] Advertisement and notice PDF endpoints: UUID format validated before file lookup — no path traversal
- [ ] Public GET responses: no candidate PII, no employee data leaked
- [ ] Rate limiter applied on all public routes
- [ ] No `organizationId` or `tenant_id` filter in any public query

---

## Frontend Binding — Deferred

Pick up after backend phases 1–7 are complete.

| Work Item | File |
|-----------|------|
| Nav restructure (dropdowns, branding bar) | `Web/src/components/Header.jsx` |
| Home page API integration (notices, quick links) | `Web/src/pages/Home.jsx` |
| Careers page: replace hardcoded jobs with API | `Web/src/pages/Careers.jsx` |
| Notices page: replace hardcoded list with API | `Web/src/pages/Notices.jsx` |
| Results page: wire to notice results query | `Web/src/pages/Results.jsx` |
| Axios client setup (`VITE_API_URL`) | `Web/src/api/index.js` |
| i18n keys for new UI strings | `Web/src/data/i18n.js` |
| `/help` page (static FAQ + query form) | `Web/src/pages/Help.jsx` |
