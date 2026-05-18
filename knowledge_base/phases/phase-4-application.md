# Phase 4: Online Application Module (M3)

| Field | Value |
|-------|-------|
| **Phase** | 4 of 9 |
| **Status** | Not Started |
| **Depends On** | Phase 3 (valid Registration ID + citizen auth session) |
| **Blocks** | Phase 5 (Fee Payment requires Application Ref No) |
| **PRD Sections** | §5 M3 Online Application · §9.3 Authorization · §9.13 Business Logic |
| **Open Questions** | #8 (application form fields — BLOCKS this phase) |

---

## Goal

Allow authenticated citizens to browse open vacancies, apply for posts, edit applications before deadline, and print submitted applications as PDF. Application Ref No generated on submit.

> ⚠️ **Open Question #8 blocks form field implementation.** Municipality must confirm which fields beyond OTR profile are required (exam centre preference, qualification details, experience, category declaration). Scaffold the flow; finalize form fields when answered.

---

## Deliverables

### Apply — New Application (`/application/apply`)

| Step | Implementation |
|------|---------------|
| 1 | Enter Registration ID + DOB (unauthenticated entry point) OR auto-filled if already logged in |
| 2 | Option A: Apply with OTR (pre-fill personal details from Registration ID). Option B: Skip (manual fill). |
| 3 | Department dropdown — fetched from `/api/v1/departments` |
| 4 | Post listing table: Advt No · Post Title · Last Date · Fee · Contact. Filtered by selected department. |
| 5 | "Details" → open advertisement PDF in new tab |
| 6 | "Apply" → application form. Fields: OTR pre-fill + TBD municipality fields (open question #8). |
| 7 | "Apply Now" → submit → Application Reference Number displayed |

**Business logic rules (server-enforced):**
- Cannot apply after `advt.end_date` — server checks timestamp, not client
- Cannot apply for same `(registration_id, advt_no)` twice — DB unique constraint
- Cannot apply without completed OTR if Option A selected — server validates OTR status

### Edit Application (`/application/edit`)
- [ ] Entry: Registration ID + DOB → list of submitted applications
- [ ] Edit allowed only if `advt.end_date > now()` — server-enforced
- [ ] Editable: preference order, contact details (fields TBD per open question #8)
- [ ] Every edit logged with timestamp in `edit_log` JSONB column
- [ ] On save: OTP confirmation to registered mobile

### Print Application (`/application/print`)
- [ ] Entry: Registration ID + DOB → list of submitted applications
- [ ] Generate printable PDF per application
- [ ] PDF contents: Registration ID · Advt No · post name · personal details · photo · signature · Application Ref No
- [ ] PDF served via authenticated endpoint only

### API Endpoints (Backend)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/departments` | GET | None | List departments with open advertisements |
| `/api/v1/advertisements?dept=&status=published` | GET | None | List open posts by department |
| `/api/v1/applications` | POST | Session | Submit new application |
| `/api/v1/applications/:ref` | GET | Session | Get application details |
| `/api/v1/applications/:ref` | PATCH | Session | Edit application (pre-deadline only) |
| `/api/v1/applications/:ref/pdf` | GET | Session | Generate + serve application PDF |

---

## Acceptance Criteria

- Apply after `advt.end_date` → rejected server-side with error
- Duplicate application for same post → rejected with clear error
- Application PDF contains photo, signature, all OTR details
- Edit after deadline → rejected server-side (not just UI-disabled)
- Application Ref No generated and unique per tenant
- Citizen A cannot retrieve Citizen B's application by guessing Application Ref No (UUIDs, auth check)

---

## Security Checklist (Pentest Targets for This Phase)

- [ ] IDOR: Application Ref Nos are UUIDs — not sequential integers; auth check on every fetch
- [ ] Cross-tenant: Citizen registered in Patan cannot submit application for Palanpur advertisement
- [ ] Apply-after-close: server-side timestamp check, not relying on client-submitted end date
- [ ] Duplicate prevention: DB unique constraint on `(registration_id, advt_no)` — not just API-level check
- [ ] PDF generation: no SSTI or SSRF if HTML-to-PDF; user content sanitized before template insertion
- [ ] Application PDF endpoint: requires valid authenticated session matching Registration ID
- [ ] CSRF tokens on application submit and edit forms
