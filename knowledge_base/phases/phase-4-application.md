# Phase 4: Online Application Module (M3)

| Field | Value |
|-------|-------|
| **Phase** | 4 of 9 |
| **Status** | 🔴 Not Started |
| **Depends On** | Phase 3 (valid Registration ID + citizen session) · Phase 1 (Advertisement + Application models) |
| **Blocks** | Phase 5 (Fee Payment requires Application Ref No) |
| **PRD Sections** | §5 M3 Online Application · §9.3 Authorization · §9.13 Business Logic |
| **Open Questions** | #8 (application form fields — HARD BLOCKS this phase) |

---

## Already Built ✅

| Item | Location |
|------|----------|
| Secure file upload (for application PDF generation) | `Server/middlewares/secureUpload.js` |
| Input validation framework | `Server/middlewares/inputValidator.js` |
| Session auth (candidate session from Phase 3) | `Server/middlewares/authMiddleware.js` |
| Department model + routes (for department dropdown) | `Server/models/Department.js` |

> ⚠️ **Open Question #8 blocks form field implementation.** Municipality must confirm which fields beyond OTR profile are required (exam centre preference, qualification details, experience, category declaration). Scaffold the flow now; finalize form fields when answered.

---

## Remaining Work 🔴

### Backend (`Server/routes/v1/applications.routes.js`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/departments` | GET | None | List departments with open advertisements |
| `/api/v1/advertisements?dept=&status=published` | GET | None | List open posts by dept |
| `/api/v1/applications` | POST | Candidate session | Submit new application |
| `/api/v1/applications/:ref` | GET | Candidate session | Get application details |
| `/api/v1/applications/:ref` | PATCH | Candidate session | Edit (pre-deadline only) |
| `/api/v1/applications/:ref/pdf` | GET | Candidate session | Generate + serve application PDF |

**Business logic (all server-side enforced):**
- Cannot apply after `advt.end_date` — server timestamp check, not client-gated
- Cannot apply for same `(registration_id, advt_no, tenant_id)` twice — DB unique constraint
- Application Ref No: UUID (not sequential integer — IDOR prevention)
- Edit: only before `advt.end_date`; every change logged in `edit_log` with timestamp
- PDF: generated server-side from OTR data + application data; user content sanitized before template insertion (prevent SSTI/PDF injection)

### Frontend (`Web/src/pages/Application/`)

| Step | Implementation |
|------|---------------|
| 1 | Entry: Reg ID + DOB (unauthenticated) OR auto-filled if logged in |
| 2 | Option A: Apply with OTR (pre-fill from Reg ID). Option B: Skip (manual fill). |
| 3 | Department dropdown → fetched from `/api/v1/departments` |
| 4 | Post listing table: Advt No · Title · Last Date · Fee · Contact. "Details" → PDF |
| 5 | Application form — OTR pre-fill + TBD municipality fields (open question #8) |
| 6 | Submit → Application Ref No displayed |

**Edit** (`/application/edit`): Reg ID + DOB → list submitted applications → edit form (pre-deadline only).

**Print** (`/application/print`): Generate PDF — Reg ID, Advt No, post name, personal details, photo, signature, Application Ref No. Served via authenticated endpoint.

---

## Acceptance Criteria

- Apply after `advt.end_date` → 400 rejected server-side
- Duplicate application for same post → 409 with clear error
- Application PDF contains photo, signature, all OTR details
- Edit after deadline → 400 rejected (not just UI-disabled)
- Application Ref No is UUID — not guessable
- Candidate A cannot fetch Candidate B's application (auth + object ownership check)

---

## Security Checklist

- [ ] IDOR: Application Ref Nos are UUIDs; auth check on every fetch (ownership verified)
- [ ] Cross-tenant: Candidate from Patan cannot apply for Palanpur advertisement
- [ ] Apply-after-close: server-side `advt.end_date` timestamp check
- [ ] Duplicate prevention: DB unique constraint on `(registration_id, advt_no, tenant_id)`
- [ ] PDF generation: user content sanitized before template insertion
- [ ] Print endpoint: requires valid candidate session matching Registration ID
- [ ] CSRF tokens on application submit and edit
