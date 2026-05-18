# Phase 7: Administrator Panel (M8)

| Field | Value |
|-------|-------|
| **Phase** | 7 of 9 |
| **Status** | Not Started |
| **Depends On** | Phase 1 (DB, multi-tenant) · Phase 3 (auth pattern established) |
| **Blocks** | Phase 6 (call letter publish), Phase 8 (notifications use admin-managed data) |
| **PRD Sections** | §5 M8 Administrator Panel (all 7 sub-modules) · §9.1 Auth · §9.3 Authorization · §9.12 Audit Logging |
| **Open Questions** | #4 (shared vs separate admin credentials), #5 (Results module), #6 (advert PDF upload vs generate) |

---

## Goal

Build the full administrator backend panel with 7 sub-modules. Admin panel lives at a separate, non-indexed URL. All admin actions are audit-logged. Role-based access: Super Admin sees everything; Department Admin sees own department only.

---

## Deliverables

### 8.1 Admin Authentication

- [ ] Separate login URL: `/admin/login` (not linked from public site, not in robots.txt, not in sitemap)
- [ ] Login: username + password + TOTP (Google Authenticator) or OTP to registered admin mobile
- [ ] Max 3 failed login attempts → 30-minute lockout; alert sent to Super Admin
- [ ] Admin session: separate session store, 15-minute inactivity timeout
- [ ] IP whitelist enforcement: login rejected from non-whitelisted IPs (configurable per admin user)
- [ ] Role enforcement middleware on every admin API endpoint

### 8.2 Advertisement Management

Admin form fields (all required unless noted):

| Field | Validation |
|-------|-----------|
| Advt No | Auto-generated: `ORGCODE/YEAR/SEQ`; not editable |
| Post Title (EN + GU) | Required, bilingual |
| Department | Dropdown from configured list |
| Class | I / II / III / IV |
| Pay Scale | Text |
| Total Vacancies | Integer > 0 |
| Category-wise vacancies | General / OBC / SC / ST / EWS — must sum ≤ Total |
| Age Limit | Min–Max or text |
| Educational Qualification | Text |
| PH Description | Text or N/A |
| Experience Required | Text or N/A |
| Application Fee | Decimal, INR |
| Application Start Date | Future date; before End Date |
| Application End Date | Future date; after Start Date |
| Probation Period | Text |
| Detailed PDF | Upload (PDF only, validated structure, max 10 MB) |
| Other Conditions | Text (optional) |
| Status | Draft → Published → Closed → Archived |

- [ ] Status transitions: Draft → Published (requires all required fields); Published → Closed (auto at end_date or manual); Closed → Archived (manual)
- [ ] Dept Admin can only create/edit adverts for own department
- [ ] Super Admin can manage all departments

### 8.3 Notification Management

- [ ] CRUD for notice board entries
- [ ] Fields: title · body text · optional PDF attachment · publish date · expiry date · type (notice/circular/press/recruitment/tender)
- [ ] Toggle publish/unpublish
- [ ] Edit "Important Instructions" section (rendered on home page ticker + instructions section)
- [ ] Edit ticker bar messages (OTR status, helpline number)

### 8.4 Registration Management

- [ ] List all registered candidates for tenant
- [ ] Search: name · Registration ID · date range · category · gender
- [ ] View full OTR profile (read-only)
- [ ] Export: CSV / Excel (PII export — requires Super Admin role)
- [ ] No admin can edit a citizen's OTR data (view only)

### 8.5 Application Management

- [ ] List all applications per advertisement
- [ ] Filters: department · post · category · fee status (Paid/Pending) · date range
- [ ] View individual application with full candidate OTR details
- [ ] Export: CSV · Excel · PDF (application list)
- [ ] Dept Admin: only see applications for own department advertisements

### 8.6 Fee Management

- [ ] View payment status per application: Paid / Pending / Failed
- [ ] Payment reconciliation report: total collected per advt, per department, date range
- [ ] Manual fee verification (feature-flagged; requires `enable_offline_payment = true` — open question #2)
- [ ] Export reconciliation report as PDF/Excel

### 8.7 Call Letter Management

- [ ] Per advertisement: upload roll number CSV (columns: `registration_id, roll_number`)
- [ ] CSV validation: check all `registration_id` values exist and have paid fee; flag errors
- [ ] Set call letter `available_from` date and time
- [ ] Upload call letter PDF template **or** select system-generated template
- [ ] Enable / disable download toggle per advertisement (sets `call_letter.enabled`)
- [ ] Preview: admin can view a sample call letter before enabling

### 8.8 Bulk Applicant PDF Export (ZIP)

- [ ] Trigger: "Download All Applications (ZIP)" button on advertisement detail page
- [ ] Filter options before export: All / Fee Paid only / Category-wise / Department-wise
- [ ] Sync for < 500 applicants: generate and download immediately
- [ ] Async for 500+ applicants:
  - Job queued; admin sees "Generating..." status
  - WhatsApp + email notification sent when ready (link valid 7 days)
  - Link is HMAC-signed; requires admin session to download
- [ ] ZIP name: `AdvtNo_Applications_DDMMYYYY.zip`
- [ ] Individual PDF name: `RegID_ApplicantName_AdvtNo.pdf`
- [ ] Each PDF contains: Application Ref No · Advt No · Reg ID · all OTR details · photo · signature · applied posts · fee status · declaration

### API Endpoints (Backend)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/admin/api/advertisements` | GET, POST | Admin | List / create advertisement |
| `/admin/api/advertisements/:id` | PATCH, DELETE | Admin | Edit / archive advertisement |
| `/admin/api/advertisements/:id/pdf` | POST | Admin | Upload advertisement PDF |
| `/admin/api/notices` | GET, POST, PATCH, DELETE | Admin | Notice board CRUD |
| `/admin/api/config/instructions` | PATCH | Super Admin | Edit home page instructions |
| `/admin/api/registrations` | GET | Admin | Search candidates |
| `/admin/api/registrations/:id` | GET | Admin | View single OTR profile |
| `/admin/api/registrations/export` | POST | Super Admin | Export CSV/Excel |
| `/admin/api/applications` | GET | Admin | List applications (filtered) |
| `/admin/api/applications/:ref` | GET | Admin | View single application |
| `/admin/api/applications/export` | POST | Admin | Export application list |
| `/admin/api/fee/status` | GET | Admin | Fee payment status per application |
| `/admin/api/fee/reconciliation` | GET | Admin | Reconciliation report |
| `/admin/api/callletter/:advt_no/rollnumbers` | POST | Admin | Upload roll number CSV |
| `/admin/api/callletter/:advt_no` | PATCH | Admin | Set available_from, enable/disable |
| `/admin/api/applications/:advt_no/zip` | POST | Admin | Trigger bulk ZIP export |
| `/admin/api/applications/:advt_no/zip/status` | GET | Admin | Check export job status |

---

## Acceptance Criteria

- Dept Admin cannot access another department's advertisements, applications, or call letters (403)
- Super Admin can access all departments
- Admin login from non-whitelisted IP → rejected
- 3 failed admin logins → 30-min lockout + Super Admin alert
- Every admin action appears in audit log (action, user, timestamp, affected record)
- Roll number CSV with invalid Registration IDs → upload rejected with error list
- Bulk ZIP for 500+ applications: async job completes; admin notified via WhatsApp + email
- Admin cannot delete or modify audit log entries (DB-level permission)
- Advertisement PDF upload: non-PDF file → rejected; PDF with embedded JS → rejected

---

## Security Checklist (Pentest Targets for This Phase)

- [ ] Admin URL not in robots.txt, sitemap, or any public page
- [ ] Dept Admin IDOR: cannot access other dept data via direct API call with known advertisement ID
- [ ] Privilege escalation: Dept Admin cannot change own role via API
- [ ] PII export (CSV): restricted to Super Admin only; Dept Admin gets 403
- [ ] Advertisement PDF upload: MIME check + embedded content scan; stored outside webroot
- [ ] Roll number CSV: only Registration IDs that belong to current tenant accepted
- [ ] Bulk ZIP download link: HMAC-signed, 7-day expiry, requires admin session
- [ ] Admin session: 15-min inactivity timeout; invalidated on logout
- [ ] CSRF tokens on all admin state-changing operations
- [ ] Audit log: append-only verified (attempt DELETE on audit table → permission denied)
- [ ] Manual fee verification (if enabled): requires Super Admin; every manual verification audit-logged with reason
