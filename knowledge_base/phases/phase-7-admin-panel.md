# Phase 7: Administrator Panel APIs (M8)

| Field | Value |
|-------|-------|
| **Phase** | 7 of 9 |
| **Status** | 🔴 Not Started |
| **Depends On** | Phase 1 (recruitment models must exist) · Phases 3–6 (data to manage) |
| **Blocks** | Phase 6 (call letter publish) · Phase 8 (notifications use admin-managed data) |
| **PRD Sections** | §5 M8 Administrator Panel · §9.1 Auth · §9.3 Authorization · §9.12 Audit Logging |

> **Backend-first:** This phase builds all admin API endpoints for managing recruitment data. Admin panel frontend pages (`Admin/`) are deferred to **Frontend Binding** after all backend phases are complete.

> **Definition of Done** is defined in Phase 1. Apply those criteria here.

---

## Remaining Work

### 1. Advertisement Management APIs

**File:** `Server/routes/v1/advertisements.routes.js`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/advertisements` | POST | Admin | Create advertisement |
| `/api/v1/advertisements` | GET | Admin | List with filters (dept, status, date range) |
| `/api/v1/advertisements/:id` | GET | Admin | Get single advertisement |
| `/api/v1/advertisements/:id` | PATCH | Admin | Edit advertisement fields |
| `/api/v1/advertisements/:id/status` | PATCH | Admin | Status transition only |
| `/api/v1/advertisements/:id/pdf` | POST | Admin | Upload advertisement PDF (`secureUpload`) |
| `/api/v1/advertisements/:id` | DELETE | Admin | Soft-delete (archive) |
| `/api/v1/advertisements/:id/export-zip` | POST | Admin | Trigger async ZIP of all application PDFs |
| `/api/v1/advertisements/:id/export-zip/status` | GET | Admin | Poll async ZIP job status |
| `/api/v1/advertisements/:id/export-zip/download` | GET | Admin | Download ZIP (HMAC-signed link, 7-day expiry) |

**Business logic:**
- Status transitions: `Draft → Published → Closed → Archived` (no skipping)
- All 16 SRS fields required for `Published` status; `Draft` allows partial
- `DEPT_ADMIN` role: can only manage advertisements for own `departmentId` (enforced by `roleScope` middleware)
- Bulk ZIP for 500+ applications: async job (queue with Bull or simple DB-flag polling); notify admin via email when ready
- ZIP naming: `AdvtNo_Applications_DDMMYYYY.zip`; individual PDF: `RegID_ApplicantName_AdvtNo.pdf`

---

### 2. Candidate Management APIs

**File:** `Server/routes/v1/candidates.routes.js` (extend from Phase 3)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/candidates` | GET | Admin | List (searchable by name, Reg ID; filterable by category, otr_status) |
| `/api/v1/candidates/:id` | GET | Admin | View full OTR profile (read-only) |
| `/api/v1/candidates/export` | POST | Super Admin | Export CSV/Excel — audit-logged |

---

### 3. Application Management APIs

**File:** `Server/routes/v1/applications.routes.js` (extend from Phase 4)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/applications` | GET | Admin | List (filterable by advt, dept, category, fee status) |
| `/api/v1/applications/admin/:ref` | GET | Admin | View application with full candidate OTR details |
| `/api/v1/applications/export` | POST | Admin | Export to CSV/Excel/PDF |

---

### 4. Fee Payment Management APIs

**File:** `Server/routes/v1/feePayments.routes.js` (extend from Phase 5)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/fee-payments` | GET | Admin | List by advt/registration; fee status breakdown |
| `/api/v1/fee-payments/reconciliation` | GET | Admin | Total collected per advt + date range |
| `/api/v1/fee-payments/:id/manual` | PATCH | Super Admin | Manual payment verification (feature-flagged) |

---

### 5. Call Letter Management APIs

**File:** `Server/routes/v1/callLetters.routes.js` (extend from Phase 6)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/call-letters/:advt_no/roll-numbers` | POST | Admin | Upload roll number CSV (validates all Reg IDs have paid) |
| `/api/v1/call-letters/:advt_no` | PATCH | Admin | Set `available_from`, `enabled` toggle |
| `/api/v1/call-letters/:advt_no/preview` | GET | Admin | Preview sample call letter PDF |

---

### 6. Notice Board Management APIs

**File:** `Server/routes/v1/notices.routes.js`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/notices` | POST | Admin | Create notice |
| `/api/v1/notices` | GET | Admin/Public | List (admin: all; public: published only) |
| `/api/v1/notices/:id` | PATCH | Admin | Edit notice |
| `/api/v1/notices/:id/status` | PATCH | Admin | Publish / unpublish |
| `/api/v1/notices/:id` | DELETE | Admin | Soft-delete |
| `/api/v1/notices/:id/pdf` | POST | Admin | Upload notice PDF attachment |

---

### 7. Analytics Endpoint (complete the stub)

**File:** `Server/controllers/analytics.controller.js`

Wire the existing analytics stub to real DB queries:

| Metric | Source |
|--------|--------|
| Active advertisements | `Advertisement.countDocuments({ status: 'Published' })` |
| Candidates registered today | `Candidate.countDocuments({ createdAt: { $gte: startOfDay } })` |
| Applications submitted | `Application.countDocuments()` |
| Fees collected | `FeePayment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }])` |

---

### 8. Seed Script Update

Update `Server/scripts/seedMenusAndRoles.js` to add recruitment module menu entries:

```
Recruitment
  ├── Advertisements    → /advertisements
  ├── Candidates        → /candidates
  ├── Applications      → /applications
  ├── Fee Payments      → /fee-payments
  ├── Call Letters      → /call-letters
  └── Notice Board      → /notices
```

---

## Acceptance Criteria

- `POST /api/v1/advertisements` with all 16 fields → 201 with new advt_no
- `PATCH /api/v1/advertisements/:id/status` skipping a transition step → 422
- `GET /api/v1/advertisements` with DEPT_ADMIN session → returns only own-dept advts
- `POST /api/v1/call-letters/:advt_no/roll-numbers` CSV with unpaid Reg IDs → rejected with error list
- `PATCH /api/v1/call-letters/:advt_no` with `enabled: true` → citizen download becomes possible
- `POST /api/v1/notices` → notice appears in `GET /api/v1/notices?status=published` immediately after publish
- `GET /api/v1/analytics/dashboard` returns real counts — not stub message
- All endpoints testable via Swagger UI / Postman — no frontend required

---

## Security Checklist

- [ ] `DEPT_ADMIN` scope enforced server-side on advertisement and application endpoints (`roleScope` middleware)
- [ ] Bulk ZIP download: HMAC-signed link, 7-day expiry, admin session required
- [ ] Advertisement PDF upload: `secureUpload` MIME check + structure validation
- [ ] Roll number CSV: all Reg IDs validated as belonging to current deployment's DB
- [ ] PII export (candidates CSV): restricted to Super Admin; every export logged to audit trail
- [ ] All admin write actions logged (`createdBy`, `updatedBy` on every model)

---

## Frontend Binding — Deferred

Pick up after all backend phases are complete. The `Admin/` React app already has structural scaffolding.

| Work Item | File |
|-----------|------|
| Advertisement CRUD pages | `Admin/src/pages/Advertisements/` |
| Candidate list + profile view | `Admin/src/pages/Candidates/` |
| Application management table | `Admin/src/pages/Applications/` |
| Fee payment table + reconciliation | `Admin/src/pages/FeePayments/` |
| Call letter CSV upload + enable toggle | `Admin/src/pages/CallLetters/` |
| Notice board CRUD | `Admin/src/pages/Notices/` |
| Dashboard with real stats | `Admin/src/pages/Dashboard/Dashboard.jsx` |
| Update menu structure | `Admin/src/Layouts/LayoutMenuData.jsx` |
