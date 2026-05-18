# Phase 7: Administrator Panel (M8)

| Field | Value |
|-------|-------|
| **Phase** | 7 of 9 |
| **Status** | 🟡 Partially Complete — infrastructure done, recruitment pages missing |
| **Depends On** | Phase 1 (recruitment models must exist before pages can query them) |
| **Blocks** | Phase 6 (call letter publish), Phase 8 (notifications use admin-managed data) |
| **PRD Sections** | §5 M8 Administrator Panel · §9.1 Auth · §9.3 Authorization · §9.12 Audit Logging |
| **Open Questions** | #4 (shared vs separate admin credentials), #5 (Results module), #6 (advert PDF upload vs generate) |

---

## Already Built ✅

| Item | Location |
|------|----------|
| Admin login UI (session-based, AuthContext) | `Admin/src/pages/Authentication/Login.jsx` |
| Auth guard (AuthProtected wrapper) | `Admin/src/Routes/AuthProtected.jsx` |
| Role-based permission system (MenuContext, per-page permissions) | `Admin/src/context/MenuContext.jsx` |
| Admin User management (Employee CRUD: create, view, edit, reset password) | `Admin/src/pages/Setup/Employee.jsx`, `EmployeeForm.jsx` |
| Department CRUD | `Admin/src/pages/Setup/Department.jsx`, `DepartmentForm.jsx` |
| Admin Roles permission matrix | `Admin/src/pages/Setup/EmployeeRoles.jsx` |
| Role Master CRUD | `Admin/src/pages/Master/RoleMaster.jsx` |
| Menu Master + Group CRUD | `Admin/src/pages/Master/MenuMaster.jsx`, `MenuGroup.jsx` |
| Location Master (Country/State/City CRUD) | `Admin/src/pages/Master/` |
| Master Data CRUD (enums) | `Admin/src/pages/MasterData/` |
| WhatsApp config + message log | `Admin/src/pages/WhatsApp/WhatsAppMessages.jsx` |
| Email Setup / For / Template | `Admin/src/pages/CMS/` |
| Nagar Palika Details (CompanyDetails) | `Admin/src/pages/Setup/CompanyDetails.jsx` |
| Dashboard (stub — needs real data from Phase 1) | `Admin/src/pages/Dashboard/Dashboard.jsx` |
| Reports (stub — needs recruitment data from Phase 1) | `Admin/src/pages/Reports/Reports.jsx` |
| Clean recruitment menu (7 groups) | `Admin/src/Layouts/LayoutMenuData.jsx` |
| Server auth: 2FA-ready (OTP routes exist), IP whitelist config | `Server/middlewares/authMiddleware.js` |
| Secure file upload | `Server/middlewares/secureUpload.js` |

**Backend routes already mounted:**
`/api/v1/employees`, `/api/v1/departments`, `/api/v1/roles`, `/api/v1/menus`, `/api/v1/menu-groups`, `/api/v1/employee-roles`, `/api/v1/countries`, `/api/v1/states`, `/api/v1/cities`, `/api/v1/master-data`, `/api/v1/email-*`, `/api/v1/whatsapp`, `/api/v1/otp`

---

## Remaining Work 🔴

All 6 recruitment-specific admin sub-modules need to be built. These require Phase 1 models to exist first.

### 8.1 Advertisement Management

**Backend** (`Server/routes/v1/advertisements.routes.js` + controller):
- `POST /advertisements` — create (ADMIN, EMPLOYEE; DEPT_ADMIN for own dept only)
- `GET /advertisements` — list with filters (dept, status, date range)
- `GET /advertisements/:id` — get single
- `PATCH /advertisements/:id` — edit
- `PATCH /advertisements/:id/status` — status transition only
- `POST /advertisements/:id/pdf` — upload advertisement PDF (`secureUpload` middleware)
- `DELETE /advertisements/:id` — soft-delete (archive)

Status transitions: `Draft → Published → Closed → Archived`
Field validation: all 16 SRS fields required for Published status; Draft allows partial.
DEPT_ADMIN: can only manage advts for own `departmentId`.

**Admin page** (`Admin/src/pages/Advertisements/`):
- List view: table with Advt No, Post Title, Dept, Status, Last Date, Actions
- Form: all 16 fields + PDF upload + bilingual title (EN + GU)
- Status badge + transition buttons

### 8.2 Candidate (OTR) Management

**Backend** (candidates.routes.js):
- `GET /candidates` — list (admin view, searchable + filterable)
- `GET /candidates/:id` — view full OTR profile
- `POST /candidates/export` — export CSV/Excel (Super Admin only)

**Admin page** (`Admin/src/pages/Candidates/`):
- List: name, Registration ID, category, date, OTR status — searchable + filterable
- View: full read-only OTR profile (all steps)
- Export: CSV/Excel button (Super Admin only, logs to audit trail)

### 8.3 Application Management

**Backend** (applications.routes.js):
- `GET /applications` — list (filtered by advt, dept, category, fee status)
- `GET /applications/:ref` — view single with candidate OTR details
- `POST /applications/export` — CSV/Excel/PDF export

**Admin page** (`Admin/src/pages/Applications/`):
- Per-advertisement view with filter chips (dept, category, fee status)
- Individual application view: OTR details + photo + signature + fee status
- Export buttons

### 8.4 Fee Payment Management

**Backend** (feePayments.routes.js):
- `GET /fee-payments` — list by advt/registration; fee status breakdown
- `GET /fee-payments/reconciliation` — total collected per advt + date range report
- `PATCH /fee-payments/:id/manual` — manual verification (Super Admin; feature-flagged)

**Admin page** (`Admin/src/pages/FeePayments/`):
- Payment status table per advertisement
- Reconciliation report with date-range filter + export

### 8.5 Call Letter Management

**Backend** (callLetters.routes.js):
- `POST /call-letters/:advt_no/roll-numbers` — upload CSV (columns: registration_id, roll_number); validates all Reg IDs have paid fee
- `PATCH /call-letters/:advt_no` — set `available_from`, `enabled`
- `GET /call-letters/:advt_no/preview` — admin preview of sample call letter

**Admin page** (`Admin/src/pages/CallLetters/`):
- Per-advertisement: upload roll number CSV + validation error display
- Set availability date/time
- Enable/disable toggle
- Preview sample

### 8.6 Notice Board Management

**Backend** (notices.routes.js):
- `POST /notices` — create notice
- `GET /notices` — list (all tenants — admin; published only — public)
- `PATCH /notices/:id` — edit
- `PATCH /notices/:id/status` — publish/unpublish
- `DELETE /notices/:id` — soft-delete
- `PATCH /config/instructions` — edit home page Important Instructions (Super Admin)

**Admin page** (`Admin/src/pages/Notices/`):
- CRUD table with type badges (notice/circular/press/recruitment/tender)
- Publish/unpublish toggle
- Rich text editor for body
- PDF attachment upload
- Separate "Important Instructions" editor

### 8.7 Bulk Applicant PDF Export (ZIP)

**Backend** (advertisements.routes.js):
- `POST /advertisements/:id/export-zip` — trigger ZIP generation
- `GET /advertisements/:id/export-zip/status` — poll job status
- `GET /advertisements/:id/export-zip/download` — serve ZIP (HMAC-signed link, 7-day expiry, admin session required)

Async for 500+ applicants: job queue → notify admin via WhatsApp + email when ready.
ZIP naming: `AdvtNo_Applications_DDMMYYYY.zip`
Individual PDF naming: `RegID_ApplicantName_AdvtNo.pdf`

**Admin page**: "Download All Applications (ZIP)" button on advertisement detail page + filter options + job status indicator.

### 8.8 Dashboard & Reports (complete stubs)

Wire `Dashboard.jsx` to `/api/v1/analytics/dashboard` with real recruitment stats:
- Active advertisements · Candidates registered today · Applications submitted · Fees collected

Wire `Reports.jsx` to recruitment report endpoints when built in Phase 1.

---

## New Menu Items to Add (after pages are built)

Update `Admin/src/Layouts/LayoutMenuData.jsx` and `Server/scripts/seedMenusAndRoles.js` to add:

```
Recruitment
  ├── Advertisements    (/advertisements)
  ├── Candidates        (/candidates)
  ├── Applications      (/applications)
  ├── Fee Payments      (/fee-payments)
  ├── Call Letters      (/call-letters)
  └── Notice Board      (/notices)
```

---

## API Endpoints Summary

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET/POST /api/v1/advertisements` | Admin | Advertisement CRUD |
| `POST /api/v1/advertisements/:id/pdf` | Admin | Upload advert PDF |
| `GET /api/v1/candidates` | Admin | Search candidates |
| `POST /api/v1/candidates/export` | Super Admin | CSV/Excel export |
| `GET/POST /api/v1/applications` | Admin | Application management |
| `POST /api/v1/applications/export` | Admin | Export list |
| `GET /api/v1/fee-payments` | Admin | Fee status + reconciliation |
| `PATCH /api/v1/fee-payments/:id/manual` | Super Admin | Manual verification |
| `POST /api/v1/call-letters/:advt/roll-numbers` | Admin | Upload roll number CSV |
| `PATCH /api/v1/call-letters/:advt` | Admin | Enable/disable + set date |
| `GET/POST /api/v1/notices` | Admin/Public | Notice board CRUD |
| `POST /api/v1/advertisements/:id/export-zip` | Admin | Trigger bulk ZIP |

---

## Acceptance Criteria

- Admin can publish an advertisement (all 16 fields validated, PDF uploaded)
- DEPT_ADMIN cannot access other department's advertisements (403)
- Roll number CSV upload: Reg IDs without paid fee flagged with error
- Call letter disabled → citizen download attempt returns 403
- Bulk ZIP for 500+ applications: async, admin notified via WhatsApp
- Notice published → appears on public `/api/v1/notices` immediately
- Dashboard shows real recruitment stats (not stub message)

---

## Security Checklist

- [ ] DEPT_ADMIN scope enforced server-side on advertisement + application endpoints
- [ ] Bulk ZIP download link: HMAC-signed, 7-day expiry, admin session required
- [ ] Advertisement PDF upload: MIME check + structure validation via `secureUpload`
- [ ] Roll number CSV: only Reg IDs belonging to current tenant accepted
- [ ] PII export (candidates CSV): restricted to Super Admin; audit-logged
- [ ] All admin actions logged to audit trail (append-only)
