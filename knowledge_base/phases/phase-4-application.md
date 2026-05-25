# Phase 4: Online Application Module (M3)

| Field | Value |
|-------|-------|
| **Phase** | 4 of 9 |
| **Status** | 🔴 Not Started |
| **Depends On** | Phase 3 (valid Candidate + Registration ID) · Phase 1 (Advertisement + Application models) |
| **Blocks** | Phase 5 (Fee Payment requires Application Ref No) |
| **PRD Sections** | §5 M3 Online Application · §9.3 Authorization · §9.13 Business Logic |

> **Backend-first:** This phase builds all application submission and management API endpoints. The multi-step frontend application form is deferred to **Frontend Binding**.

> **Definition of Done** is defined in Phase 1. Apply those criteria here.

---

## Remaining Work

### 1. Application Routes (`Server/routes/v1/applications.routes.js`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/applications` | POST | Candidate session | Submit new application |
| `/api/v1/applications/:ref` | GET | Candidate session | Get own application details |
| `/api/v1/applications/:ref` | PATCH | Candidate session | Edit own application (pre-deadline only) |
| `/api/v1/applications/:ref/pdf` | GET | Candidate session | Generate and serve application PDF |
| `/api/v1/applications` | GET | Admin session | List all applications (filterable by advt, dept, category, fee status) |
| `/api/v1/applications/admin/:ref` | GET | Admin session | View any application with full candidate OTR details |
| `/api/v1/applications/export` | POST | Admin session | Export applications to CSV/Excel/PDF |

---

### 2. Business Logic (all server-side enforced)

| Rule | Enforcement |
|------|------------|
| Cannot apply after `advt.end_date` | Server timestamp check — not client-gated |
| Cannot apply for same `(registration_id, advt_no)` twice | DB unique index on both fields |
| Application Ref No is UUID | UUID v4 — not sequential integer (IDOR prevention) |
| Edit only before `advt.end_date` | Server timestamp check; all changes appended to `edit_log` |
| Candidate can only read own applications | Controller verifies `registration_id` matches session |
| PDF generation: no SSTI or injection | All user content HTML-escaped before template insertion |

---

### 3. Application PDF Service (`Server/services/applicationPdf.service.js`)

PDF contains:
- Candidate photo + signature
- Registration ID, Application Ref No, Advt No, Post Name
- All OTR personal details (name, DOB, category, address, qualification, languages)
- Municipality branding from CompanyMaster (logo + name)
- Additional application fields (scaffold placeholder fields; finalize when municipality confirms requirements)

Implementation:
- Generate server-side (PDFKit or Puppeteer — pick one, stay consistent)
- Serve via authenticated endpoint — not stored as a static file
- All user-provided strings HTML-escaped and length-capped before template insertion

> **Deferred open item:** Additional application form fields beyond OTR profile (exam centre, experience, category declaration) to be finalized with municipality. Scaffold with placeholders — do not block this phase.

---

### 4. Public Supporting Endpoints (verify from Phase 1)

The application flow depends on these Phase 1 endpoints being live:

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/departments` | GET | None | List active departments |
| `/api/v1/advertisements?status=Published` | GET | None | List open advertisements |
| `/api/v1/advertisements/:id` | GET | None | Get single advertisement detail |

---

## Acceptance Criteria

- `POST /api/v1/applications` after `advt.end_date` → 400 rejected server-side
- `POST /api/v1/applications` for same `(registration_id, advt_no)` → 409 with clear error
- `GET /api/v1/applications/:ref` for another candidate's ref → 403
- `GET /api/v1/applications/:ref/pdf` returns a valid PDF with candidate photo and OTR details
- `PATCH /api/v1/applications/:ref` after `advt.end_date` → 400 rejected
- Application Ref No in response is a UUID — not a guessable integer
- All endpoints testable via Swagger UI / Postman — no frontend required

---

## Security Checklist

- [ ] IDOR: every fetch verifies `registration_id` in session matches Application Ref No owner
- [ ] Apply-after-close: server-side `advt.end_date` timestamp check on every POST
- [ ] Duplicate prevention: DB unique index on `(registration_id, advt_no)`
- [ ] PDF generation: all user content sanitized (HTML-escape + length cap) before template insertion
- [ ] PDF endpoint: requires valid candidate session — not a public URL
- [ ] No cross-candidate data: candidate A cannot read candidate B's application

---

## Frontend Binding — Deferred

Pick up after backend phases 1–7 are complete.

| Work Item | File |
|-----------|------|
| Multi-step application form with OTR pre-fill | `Web/src/pages/Application/` |
| Edit application page (pre-deadline) | `Web/src/pages/Application/Edit.jsx` |
| Print / download application PDF page | `Web/src/pages/Application/Print.jsx` |
