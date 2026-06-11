# Phase 10: Frontend Binding & Admin Recruitment Pages

| Field | Value |
|-------|-------|
| **Phase** | 10 of 10 |
| **Status** | 🔴 Not Started |
| **Depends On** | Phases 1–9 (all backend APIs must exist before binding) |
| **Blocks** | Go-Live |
| **PRD** | `.claude/prds/phase-10-frontend-binding.prd.md` |

> This phase binds the frontend to all backend APIs. Admin panel recruitment pages are built
> from scratch following existing patterns. Public Web portal static pages are replaced with
> API-driven components. Backend endpoint gaps discovered during form building are patched inline.

---

## Definition of Done (Frontend)

A page or form is done when ALL of the following pass:

- [ ] Component renders without console errors or warnings
- [ ] All form fields controlled by Formik with a Yup validation schema
- [ ] Yup schema covers: required, min/max length, format (email, phone, date) for every field
- [ ] Validation errors display inline below each field on blur AND on submit attempt
- [ ] All dropdowns use `react-select` with `isSearchable: true`
- [ ] All search/filter inputs debounced 300ms (`useDebounce` hook)
- [ ] All form fields have `tabIndex` in logical reading order — no focus traps
- [ ] Submit button shows spinner and is `disabled` while request is in-flight
- [ ] Success/error feedback via `react-toastify`
- [ ] Admin: permission gates applied (`currentPagePermissions.write/edit/delete` from `MenuContext`)
- [ ] Web: all new UI strings in `Web/src/data/i18n.js` with EN + GU translations
- [ ] Tested at 1280px, 1024px, 768px viewports — no broken layout

---

## Form Standards

### Admin — Form Type by Complexity

| Fields | Pattern | Existing Example to Follow |
|--------|---------|---------------------------|
| ≤ 5 fields | Single-page Formik form | `Admin/src/pages/Setup/DepartmentForm.jsx` |
| 6–15 fields | Bootstrap Nav Tabs + single Formik instance | `Admin/src/pages/Setup/EmployeeForm.jsx` |
| 16+ fields | Bootstrap Nav Tabs, progressive disclosure per tab | Advertisement form (new — follow EmployeeForm pattern) |

### Admin — Mandatory Conventions

- **Layout:** Reactstrap `<Card>` + `<CardBody>`, `<BreadCrumb>` at top
- **Header controls:** `<FormsHeader>` (`Admin/src/components/Common/FormsHeader.jsx`)
- **Footer buttons:** `<FormAddFooter>` for `/add`, `<FormUpdateFooter>` for `/edit`
- **Dropdowns:** `react-select` `<Select>`, always `isSearchable={true}`, reuse `selectStyles` object from existing forms
- **Required fields:** append `*` to label text
- **Inline errors:** `{formik.touched.field && formik.errors.field && <span className="text-danger">{formik.errors.field}</span>}`
- **Loading state:** button `disabled` + spinner icon during submit
- **View mode:** same form component, all inputs `disabled={isView}`, footer hidden
- **Delete confirmation:** reuse `<DeleteModal>` (`Admin/src/components/Common/DeleteModal.jsx`)
- **Tabs:** Bootstrap `<Nav tabs>` + `<TabContent>` with `activeTab` state

### Admin — Table / Search Pattern

- Tables: `react-data-table-component` `<DataTable>` with `sortServer` + `paginationServer`
- Search input: controlled, passed through `useDebounce(value, 300)` before API call
- Column filters: `react-select` dropdowns above the table, same 300ms debounce
- Follow pattern in `Admin/src/pages/Setup/Employee.jsx` for state management

### Web — Form Standards

**Install (add to `Web/package.json`):**
```
formik, yup, react-select, react-toastify
```

- Multi-step forms: shared Formik context across steps + custom `<StepIndicator>` component
- OTP entry: 6-digit input, auto-focus-next digit on entry
- New strings: register in `Web/src/data/i18n.js` under both `en` and `gu` keys
- Error display: `<p className="field-error">{error}</p>` below field

---

## Admin Panel — Remaining Work

### 1. Advertisements (`Admin/src/pages/Advertisements/`)

**Routes to add in `Admin/src/Routes/allRoutes.jsx`:**
```
/advertisements           → AdvertisementList.jsx
/advertisements/add       → AdvertisementForm.jsx
/advertisements/:id       → AdvertisementForm.jsx  (view mode: isView=true)
/advertisements/:id/edit  → AdvertisementForm.jsx  (edit mode: isEdit=true)
```

**List page (`AdvertisementList.jsx`):**
- DataTable columns: Advt No, Post Title (EN), Dept, Class, Status badge, Last Date, Fee, Actions
- Filters above table: Department (react-select → `GET /api/v1/departments`), Status (react-select), Date range inputs
- Debounced search: Advt No + Post Title
- Actions: View, Edit, Archive (permission-gated)

**Form page (`AdvertisementForm.jsx`) — 5-tab Formik form:**
- Tab 1 Basic Info: `post_title.en`, `post_title.gu`, `department` (react-select), `class` (react-select: I/II/III/IV), `pay_scale`
- Tab 2 Vacancies: `vacancies.general`, `vacancies.obc`, `vacancies.sc`, `vacancies.st`, `vacancies.ews` — `vacancies.total` auto-computed, displayed read-only
- Tab 3 Dates & Fee: `start_date`, `end_date` (date inputs), `application_fee`, `probation_period`
- Tab 4 Requirements: `age_limit.min`, `age_limit.max`, `qualification`, `experience_required`, `ph_description`, `other_conditions`
- Tab 5 PDF: file input → `POST /api/v1/advertisements/:id/pdf`; show existing PDF link + preview if uploaded

**Status transition:** button group on view/edit page → `PATCH /api/v1/advertisements/:id/status`
Valid path: `Draft → Published → Closed → Archived`

**API file:** `Admin/src/api/advertisements.api.jsx`
```javascript
// Functions needed:
searchAdvertisements({ skip, per_page, sorton, sortdir, match, status, department })
getAdvertisement(id)
createAdvertisement(data)
updateAdvertisement(id, data)
updateAdvertisementStatus(id, status)
uploadAdvertisementPdf(id, formData)
deleteAdvertisement(id)
```

---

### 2. Candidates (`Admin/src/pages/Candidates/`)

**Routes:**
```
/candidates       → CandidateList.jsx
/candidates/:id   → CandidateProfile.jsx  (read-only — no add/edit)
```

**List page (`CandidateList.jsx`):**
- DataTable columns: Reg ID, Name, Category, Mobile, OTR Status badge, Registered At, Actions (View)
- Debounced search: Reg ID, name, mobile
- Filters: Category (react-select → `GET /api/v1/master-data?type=category`), OTR Status
- Export button (Super Admin only): `POST /api/v1/candidates/export`

**Profile page (`CandidateProfile.jsx`) — 4-tab read-only view:**
- Tab 1 Personal: name, father/husband name, DOB, gender, category, nationality, religion
- Tab 2 Contact: permanent address, current address (same-as indicator), mobile, email
- Tab 3 Documents: photo thumbnail, signature thumbnail, download links
- Tab 4 Other: PH status/type/%, ex-serviceman, qualification, languages table, marital status

**API file:** `Admin/src/api/candidates.api.jsx`

---

### 3. Applications (`Admin/src/pages/Applications/`)

**Routes:**
```
/applications       → ApplicationList.jsx
/applications/:ref  → ApplicationView.jsx  (read-only)
```

**List page (`ApplicationList.jsx`):**
- DataTable columns: App Ref No, Reg ID, Candidate Name, Advt No, Post, Fee Status badge, Submitted At, Actions (View)
- Filters: Advertisement (react-select), Department, Category, Fee Status
- Export button: `POST /api/v1/applications/export`

**View page (`ApplicationView.jsx`):**
- Candidate summary card (photo, name, Reg ID, category)
- Application fields section
- Fee payment status badge + receipt download link (if paid)

**API file:** `Admin/src/api/applications.api.jsx`

---

### 4. Fee Payments (`Admin/src/pages/FeePayments/`)

**Routes:**
```
/fee-payments                → FeePaymentList.jsx
/fee-payments/:id            → FeePaymentView.jsx
/fee-payments/reconciliation → Reconciliation.jsx
```

**List page:** DataTable — Payment ID, Reg ID, Advt No, Amount, Status badge, Gateway Txn ID, Paid At.
Filters: Advertisement (react-select), Status, Date range.

**Reconciliation page:** totals grouped by advertisement; date range selector; export button.

**API file:** `Admin/src/api/feePayments.api.jsx`

---

### 5. Call Letters (`Admin/src/pages/CallLetters/`)

**Routes:**
```
/call-letters                    → CallLetterList.jsx
/call-letters/:advt_no/manage    → CallLetterManage.jsx
```

**List page:** one row per advertisement — Advt No, Post, Roll Count, Enabled badge, Available From, Actions (Manage).

**Manage page (single-page form):**
1. CSV upload: file input → `POST /api/v1/call-letters/:advt_no/roll-numbers`; show error table for invalid Reg IDs
2. Available From: date + time picker → `PATCH /api/v1/call-letters/:advt_no`
3. Enable/disable toggle → same PATCH endpoint
4. Preview button → `GET /api/v1/call-letters/:advt_no/preview` (opens PDF in new tab)

**API file:** `Admin/src/api/callLetters.api.jsx`

---

### 6. Notices (`Admin/src/pages/Notices/`)

**Routes:**
```
/notices           → NoticeList.jsx
/notices/add       → NoticeForm.jsx
/notices/:id       → NoticeForm.jsx  (view mode)
/notices/:id/edit  → NoticeForm.jsx  (edit mode)
```

**List page:** DataTable — Title, Type badge, Publish Date, Expiry Date, Important flag, Status badge, Actions.
Filters: Type (react-select), Status.
Inline publish/unpublish toggle button per row.

**Form (single-page Formik):**
- `title` (text input)
- `type` (react-select: notice/circular/press/recruitment/tender)
- `publish_date`, `expiry_date` (date inputs)
- `is_important_instruction` (checkbox)
- `body` (Jodit rich text editor — already installed as `jodit-react`)
- PDF upload: file input → `POST /api/v1/notices/:id/pdf`
- `status` (radio: draft / published / unpublished)

**API file:** `Admin/src/api/notices.api.jsx`

---

### 7. Dashboard Wiring

**File:** `Admin/src/pages/Dashboard/Dashboard.jsx`

Replace stub with `GET /api/v1/analytics/dashboard` data:
- 4 stat cards: Active Advertisements, Registered Candidates, Applications Submitted, Fees Collected (₹)
- Bar chart (recharts — already installed): applications submitted per advertisement (last 10)

**API:** extend `Admin/src/api/analytics.api.jsx`

---

### 8. Menu & Routes Wiring

**`Admin/src/Layouts/LayoutMenuData.jsx`:** add Recruitment group with 6 items.

**`Admin/src/Routes/allRoutes.jsx`:** add all routes from sections 1–6 above.

---

## Web (Public) — Remaining Work

### Dependencies (`Web/package.json`)
Add: `formik`, `yup`, `react-select`, `react-toastify`

### Axios Setup (`Web/src/api/index.js`)
```javascript
import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL, withCredentials: true });
// Add 401 interceptor → redirect to login
export default api;
```

### 9. Careers Page API Bind

**File:** `Web/src/pages/Careers.jsx`

- Replace `src/data/jobs.js` import with `GET /api/v1/advertisements?status=Published`
- Filter chips (I/II/III/IV) — client-side filter on fetched array
- "Details" button → open `GET /api/v1/advertisements/:id/pdf` in new tab
- Loading skeleton while fetching; error state if API fails

### 10. Notices Page API Bind

**File:** `Web/src/pages/Notices.jsx`

- Replace hardcoded list with `GET /api/v1/notices?status=published`
- Type filter tabs (All / Notice / Circular / Press / Recruitment / Tender)
- PDF link per notice row

### 11. OTR Registration (`Web/src/pages/Registration/`)

**Routes (add to `Web/src/App.jsx`):**
```
/registration                    → redirect to step 1
/registration/apply/step/:step   → RegistrationStep.jsx
/registration/edit               → EditRegistration.jsx
/registration/find               → FindRegistration.jsx
```

Shared Formik context holds all step data. Steps persist to server via `POST /api/v1/candidates/register/step`.

| Step | Key fields | API call |
|------|-----------|---------|
| 1 Instructions | Scroll + I-Agree checkbox | — |
| 2 Aadhaar + Auth | Aadhaar input, OTP, password | `POST /otp/send`, `POST /otp/verify` |
| 3 Personal | Name, DOB, gender, category (react-select) | `POST /register/step` |
| 4 Communication | Permanent + current address, OTP-verified mobile + email | `POST /otp/send`, `POST /register/step` |
| 5 Other | Marital status, PH, ex-serviceman, qualification | `POST /register/step` |
| 6 Languages | Multi-row: language + R/W/S checkboxes | `POST /register/step` |
| 7 Photo | JPEG, max 50 KB, preview before upload | `POST /register/photo` |
| 8 Signature | JPEG, max 20 KB, preview before upload | `POST /register/signature` |
| 9 Declaration | Bilingual text + required checkbox | — |
| 10 Submit | CAPTCHA → `POST /register/submit` → Registration ID screen | `POST /register/submit` |

`<StepIndicator steps={10} current={step} />` component at top of each step.

### 12. Application Flow (`Web/src/pages/Application/`)

**Routes:**
```
/application          → ApplicationEntry.jsx  (Reg ID + DOB lookup or auto-fill)
/application/apply    → ApplicationForm.jsx   (multi-step, Formik)
/application/edit     → EditApplication.jsx
/application/print    → PrintApplication.jsx  (PDF download link)
```

### 13. Fee Payment (`Web/src/pages/Fee/`)

**Routes:**
```
/fee            → FeeStatus.jsx    (lookup by Aadhaar hash or Reg ID)
/fee/checkout   → Razorpay redirect (client calls POST /fee-payments/initiate → opens Razorpay)
/fee/success    → FeeSuccess.jsx   (display only — no DB calls)
/fee/failure    → FeeFailure.jsx   (display only — retry button)
```

### 14. Call Letter (`Web/src/pages/CallLetter/`)

Replace static `CallLetter.jsx`:

**Routes:**
```
/callletter         → CallLetterCheck.jsx   (Reg ID + DOB form)
/callletter/result  → CallLetterResult.jsx  (eligibility per advt + download buttons)
```

---

## Additional APIs (Discovered During Form Building)

Log gaps here as they are found — create inline with the frontend milestone that needs them.

| Gap | Required By | Endpoint |
|-----|------------|---------|
| Advertisement list (id + title only, for filter dropdowns) | Applications list, Fee Payments list | `GET /api/v1/advertisements?fields=_id,advt_no,post_title.en` |
| Per-advertisement application stats | Advertisement view page | `GET /api/v1/advertisements/:id/stats` |
| Candidate's own application list | Web Application entry | `GET /api/v1/applications/me` (candidate session) |
| MasterData by type | All category/gender/qualification dropdowns | `GET /api/v1/master-data?type=X` (verify exists from Phase 1) |

---

## Acceptance Criteria

**Admin:**
- Advertisement CRUD: create Draft, publish, edit, close, archive — no console errors
- Advertisement form: Yup rejects submit if any tab has an invalid required field
- Candidate profile: all 4 tabs load correct data
- Applications list: filter by advertisement returns correct subset
- Roll number CSV upload with unpaid Reg IDs: error table shows offending rows
- Call letter toggle enabled → `/api/v1/call-letters/check` returns eligible for test candidate
- Notice published via admin → appears in `GET /api/v1/notices?status=published` immediately
- Dashboard stat cards show real DB counts (not "0" stub)

**Web:**
- `/careers` has zero hardcoded job data — all from API
- OTR step 2: Yup rejects invalid Aadhaar format before API call
- OTR step 7: file > 50 KB rejected client-side before upload attempt
- Full 10-step OTR completable end-to-end in browser
- Fee status page shows Paid/Pending badges correctly
- Eligible candidate (fee paid, call letter enabled) downloads PDF

---

## Security Checklist

- [ ] Admin: every action button gated by `currentPagePermissions.write/edit/delete`
- [ ] Web: candidate session validated before `/application`, `/fee`, `/callletter` pages render
- [ ] No API base URL, keys, or secrets hardcoded — read from `import.meta.env.VITE_API_URL`
- [ ] Call letter download: signed token in URL — not a guessable static path
- [ ] File upload: client-side size + MIME check before sending (belt-and-suspenders)
- [ ] react-select options for sensitive lists (e.g., candidates) not pre-fetched without auth
