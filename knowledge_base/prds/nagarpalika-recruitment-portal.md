# PRD: Nagar Palika Online Recruitment Portal

| Field | Value |
|-------|-------|
| **Product** | Nagar Palika Online Recruitment Portal |
| **Version** | 1.0 |
| **Source SRS** | `Reference_Docs/NagarPalika.pdf` v1.0 Draft |
| **Clients** | Patan Municipal Council · Palanpur Municipal Council |
| **Status** | Draft — Pending Stakeholder Review |
| **Prepared by** | Vyaris |

---

## 1. Problem Statement

Both Patan and Palanpur Municipal Councils currently manage recruitment through manual or offline processes — physical forms, in-person fee submission, and offline call letter distribution. This creates friction for citizens (travel, queues, paper errors), delays for administrators (manual data entry, physical file management), and no audit trail.

This portal replaces that process end-to-end: citizens register once using Aadhaar, browse vacancies, apply, pay fees, and download call letters — entirely online. Administrators publish advertisements, manage applications, generate reports, and distribute call letters through a secure backend panel.

---

## 2. Goals & Success Metrics

| Goal | Metric |
|------|--------|
| Eliminate offline applications | 0 paper applications for advertised posts within 1 cycle |
| Fast public access | Home page load < 3s on standard broadband |
| High availability | 99.5% uptime (excl. scheduled maintenance) |
| Concurrent load | 500 simultaneous sessions per subdomain |
| Accessibility | WCAG 2.1 Level AA compliance |
| Notification reach | WhatsApp delivery rate > 90%; SMS fallback covers remainder |

---

## 3. Users & Roles

| Role | Auth | Capabilities |
|------|------|-------------|
| **Guest / Public** | None | Browse notices, view job listings, access Help page, view quick links |
| **Registered Citizen** | OTR login (Reg ID or Aadhaar + password) | Apply for posts, pay fees, download call letters, edit OTR profile (within edit window) |
| **Department Admin** | 2FA (password + OTP) | Manage advertisements, applications, call letters for own department only |
| **Super Admin** | 2FA (password + OTP) | Full access across all departments + system configuration |

---

## 4. Deployment Architecture

```
Internet
    │
    ├── patan.domain.gov.in   ──┐
    │                           ├── Shared Linux Server
    └── palanpur.domain.gov.in ─┘     │
                                       ├── Same Codebase (multi-tenant)
                                       ├── DB Schema: patan_db
                                       ├── DB Schema: palanpur_db
                                       └── Shared: File Storage, REST API
```

- **Server**: Single physical/virtual Linux server (municipality-purchased)
- **Subdomains**: `patan.domain.gov.in` · `palanpur.domain.gov.in`
- **Backend**: REST API layer (framework TBD)
- **Database**: Separate schemas per municipality — full data isolation
- **Storage**: File server for photos, signatures, PDFs (per-tenant paths)
- **Notifications**: WhatsApp Business API → SMS (30s fallback) → Email (SMTP)
- **SSL**: Provisioned by municipality IT team
- **Scalability**: Adding a new municipality = config entry only, no code change

---

## 5. Module-by-Module Requirements

### M1 — Home Page

#### 5.1.1 Navigation Bar 1 — Branding Bar (topmost)
- Municipality seal / Ashoka emblem (logo provided by municipality)
- Official municipality name in Gujarati and English
- Government of Gujarat emblem

#### 5.1.2 Navigation Bar 2 — Main Menu

| Menu Item | Type | Sub-items |
|-----------|------|-----------|
| Home | Link | — |
| Registration | Dropdown | Apply (new OTR) · Edit · Find |
| Online Application | Dropdown | Apply · Edit · Print |
| Fee | Link | — |
| Call Letter | Link | — |
| Help | Link | — |
| Login / Register | Modal trigger | Login form · Redirect to OTR |

#### 5.1.3 Header Section
- Full-width banner image (municipality-specific)
- Ticker bar 1: Toll-free helpline number (scrolling)
- Ticker bar 2: OTR status message e.g. "OTR Registration is Live" (scrolling)

#### 5.1.4 Notice Board
- Admin-managed list of recent notifications
- Each entry: notice title · publication date · PDF download link
- Sorted by date descending

#### 5.1.5 Important Instructions
- Static informational section for applicants
- Editable by admin from backend panel (no redeploy required)

#### 5.1.6 Quick Links Grid
- How to Register
- How to Apply
- Apply (direct link)
- Admit Card / Call Letter
- Results
- Help / Query

---

### M2 — OTR Registration Module

One Aadhaar = one Registration ID per subdomain. Duplicate Aadhaar rejected system-wide.

#### 5.2.1 New Registration — 10-Step Flow

| Step | Screen | Key Actions & Constraints |
|------|--------|--------------------------|
| 1 | Instructions | Bilingual (Gujarati + English). Must scroll to bottom. "I Agree" button gates entry. |
| 2 | Aadhaar Verification | Enter 12-digit Aadhaar → UIDAI OTP → verify. Pre-fill Aadhaar-linked data. Separate phone OTP (WhatsApp primary, SMS fallback after 30s). Password creation: min 8 chars, 1 uppercase, 1 digit, 1 special char. |
| 3 | Personal Details | Full name (as per Aadhaar), Father's/Husband's name, DOB, gender, category (General/OBC/SC/ST/EWS), nationality, religion |
| 4 | Communication Details | Permanent address (house no, street, locality, taluka, district, state, PIN), current address (or "same as permanent" checkbox), OTP-verified mobile, optional alternate mobile, OTP-verified email |
| 5 | Other Details | Marital status, PH status (type + % if yes), ex-serviceman status, highest educational qualification |
| 6 | Language Details | Languages known — Read / Write / Speak checkboxes per language; mother tongue |
| 7 | Photo Upload | Format: JPG/JPEG · Max: 50 KB · Dimensions: 3.5 × 4.5 cm · Background: white/light |
| 8 | Signature Upload | Format: JPG/JPEG · Max: 20 KB · Dimensions: 3.5 × 1.5 cm |
| 9 | Declaration | Checkbox: "I hereby declare that all information provided is true and correct" |
| 10 | CAPTCHA + Save | Image CAPTCHA → submit → Registration ID generated → displayed on screen + sent via SMS + email |

#### 5.2.2 Edit Registration
- Access: Registration ID + DOB **or** Aadhaar + OTP
- Window: 48 hours from initial registration *(confirm with municipality — open question #1)*
- Editable: communication details, photo, signature, language details
- Locked (non-editable): Aadhaar number, DOB, name (as per Aadhaar)
- Any save triggers OTP confirmation

#### 5.2.3 Find Registration ID
- Input: Mobile + DOB **or** Aadhaar + DOB
- Output: Registration ID sent to registered mobile and email after OTP verification

---

### M3 — Online Application Module

#### 5.3.1 New Application — Flow

| Step | Action |
|------|--------|
| 1 | Enter Registration ID + DOB |
| 2 | Option A: Apply with OTR (pre-fills personal details) · Option B: Skip (manual fill) |
| 3 | Select Department from dropdown |
| 4 | View post listing table: Advt No · Post Title · Last Date (dd/mm/yyyy hh:mm) · Fee · Contact |
| 5 | Click "Details" → view full advertisement PDF |
| 6 | Click "Apply" → application form |
| 7 | Fill form fields *(fields TBD — open question #8)* |
| 8 | "Apply Now" → Application Reference Number generated and displayed |

#### 5.3.2 Edit Application
- Editable only before advertisement closing date
- Editable: preference order, contact details
- All changes logged with timestamp

#### 5.3.3 Print Application
- Generate printable PDF of submitted application
- PDF contains: Registration ID · Advt No · post name · personal details · photo · signature · Application Ref No

---

### M4 — Fee Payment Module

- Entry: Aadhaar number **or** Registration ID
- View: list of all posts applied for, with payment status (Paid / Pending)
- Select pending posts → "Pay Fee" → payment gateway redirect
- Accepted modes: UPI · Net Banking · Debit Card · Credit Card
- On success: fee receipt generated (Paid status updated), PDF receipt downloadable
- On failure: application retained, user can retry
- Gateway selection: *(open question #7 — Razorpay / PayGov / Paytm / state portal)*
- Offline DD/challan support: *(open question #2 — TBD)*

---

### M5 — Call Letter / Admit Card Module

- Entry: Registration ID + DOB
- Eligibility check: fee Paid + application submitted + call letter published by admin
- If eligible: call letter PDF rendered and downloadable
- PDF contents: candidate name · Registration ID · roll number · exam date · time · venue · instructions
- If ineligible: clear error message (e.g. "Fee not paid" or "Call letter not yet published")

---

### M6 — Help / Query Page

- Toll-free helpline number — prominently displayed at top
- Email contact for queries
- FAQ section — collapsible accordions
- Step-by-step guides: "How to Register" · "How to Apply"
- Query submission form: name · Registration ID · query category (dropdown) · description · submit
- No auth required (guest access)

---

### M7 — Authentication

#### Login Modal
- Fields: Registration ID **or** Aadhaar + Password
- "Forgot password" → OTP-based reset via registered mobile/email

#### Session
- Timeout: 30 minutes of inactivity
- Tokens invalidated on logout and timeout

#### Password Policy
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 digit
- At least 1 special character

---

### M8 — Administrator Panel

#### 5.8.1 Authentication
- Separate admin login URL (not publicly linked or indexed)
- Credentials: username + password + OTP (two-factor)
- Roles: Super Admin (all departments) · Department Admin (own department only)
- Admin IP whitelist (configurable per deployment)

#### 5.8.2 Advertisement Management

Admin publishes posts via structured form:

| Field | Notes |
|-------|-------|
| Advt No | Auto-generated: `ORGCODE/YEAR/SEQ` e.g. `PATAN/202627/1` |
| Post Title | English + Gujarati |
| Department | Dropdown (configured list) |
| Class | Class I / II / III / IV |
| Pay Scale | e.g. `26000/-` |
| Vacancies | Total + category-wise breakup |
| Age Limit | Min–Max or "As per advertisement" |
| Educational Qualification | Text or "As per detailed advertisement" |
| PH Description | Categories eligible: LV · HH · OL etc. |
| Experience Required | Text or "Not Applicable" |
| Application Fee | Amount in INR |
| Application Start Date | `dd/mm/yyyy hh:mm` |
| Application End Date | `dd/mm/yyyy hh:mm` |
| Probation Period | e.g. "5 years fixed pay" |
| Detailed PDF | Upload full advertisement document |
| Other Conditions | Free text or "As per advertisement" |
| Status | Draft · Published · Closed · Archived |

#### 5.8.3 Notification Management
- CRUD for notice board entries
- Each notice: title · body text · optional PDF attachment · publish date · expiry date
- Toggle publish/unpublish
- Edit "Important Instructions" section on home page

#### 5.8.4 Registration Management
- View all registered candidates
- Search and filter: name · Registration ID · date · category
- View full OTR profile of any candidate
- Export: CSV / Excel

#### 5.8.5 Application Management
- View all applications per advertisement
- Filters: department · post · category · fee status
- Download application list: CSV · Excel · PDF
- View individual application with full candidate details

#### 5.8.6 Fee Management
- View payment status per application
- Manual fee verification *(if offline payments enabled — open question #2)*
- Payment reconciliation report

#### 5.8.7 Call Letter Management
- Upload roll number list (CSV) per advertisement
- Set call letter availability date and time
- Upload call letter PDF template **or** generate from system template
- Enable / disable call letter download per advertisement

#### 5.8.8 Bulk Applicant PDF Export (ZIP)

After application window closes:

| Spec | Detail |
|------|--------|
| Trigger | Admin clicks "Download All Applications (ZIP)" on an advertisement |
| Per-applicant PDF contains | Application Ref No · Advt No · Registration ID · all personal/communication/other/language details · photo · signature · applied posts · fee status · declaration |
| ZIP filename | `AdvtNo_Applications_DDMMYYYY.zip` e.g. `PATAN-202627-1_Applications_15062026.zip` |
| PDF filename | `RegID_ApplicantName_AdvtNo.pdf` e.g. `10001234_Rahul_Patel_PATAN-202627-1.pdf` |
| Filters before export | All · Fee Paid only · Category-wise · Department-wise |
| Async threshold | 500+ applicants → async generation |
| Notification on ready | WhatsApp + email with download link |
| Link validity | 7 days; admin can regenerate at any time |

---

## 6. Data Model

| Entity | Primary Key | Key Attributes |
|--------|-------------|----------------|
| **Candidate (OTR)** | `registration_id` | aadhaar_hash, name, dob, gender, category, address, mobile (OTP-verified), email (OTP-verified), photo_path, signature_path, languages, created_at, tenant_id |
| **Advertisement** | `advt_no` | post_title, department, class, pay_scale, vacancies (total + category), age_limit, qualification, fee, start_date, end_date, pdf_path, status, tenant_id |
| **Application** | `application_ref_no` | registration_id, advt_no, submitted_at, status, edit_log (JSONB), tenant_id |
| **Fee Payment** | `payment_id` | application_ref_no, amount, gateway_txn_id, mode, status, paid_at, receipt_path, tenant_id |
| **Call Letter** | `(registration_id, advt_no)` | roll_number, exam_date, exam_time, venue, published_at, downloaded_at, tenant_id |
| **Notification** | `notice_id` | title, body, pdf_path, publish_date, expiry_date, status, tenant_id |
| **Admin User** | `user_id` | name, role (super/dept), department, password_hash, last_login, ip_whitelist, tenant_id |

---

## 7. Notification System

| Event | Channel Priority |
|-------|-----------------|
| OTP delivery (Aadhaar / phone / email verify) | WhatsApp → SMS (30s fallback) → Email |
| Registration ID issued | SMS + Email |
| Application submitted | WhatsApp → SMS |
| Fee payment receipt | WhatsApp → SMS + Email (receipt PDF) |
| Call letter published | WhatsApp → SMS |
| Bulk ZIP export ready | WhatsApp + Email (download link) |

**Infrastructure:**
- WhatsApp Business API via Meta-approved BSP *(municipality must register — open question #9)*
- SMS gateway (API credentials provided by municipality)
- Email: SMTP relay (credentials provided by municipality)
- Channel priority configurable per deployment

---

## 8. Non-Functional Requirements

### Performance
| Metric | Target |
|--------|--------|
| Home page load | < 3 seconds (standard broadband) |
| Application submit response | < 5 seconds |
| Concurrent sessions | 500 per subdomain |

### Security
> Full security requirements in **§9**. Summary targets:
- HTTPS / TLS 1.2+ everywhere
- Passwords: bcrypt / Argon2 (never plaintext)
- Aadhaar: hash-only storage, UIDAI compliance
- OWASP Top 10 protections (SQLi, XSS, CSRF, IDOR, broken auth, security misconfiguration)
- Session timeout: 30 minutes inactivity; invalidated on logout
- Admin panel: IP whitelist + 2FA
- Security headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- GIGW compliance
- Portal will undergo end-to-end penetration testing by 12–15 cybersecurity experts before launch — all controls below are mandatory, not optional

### Reliability
- Target uptime: 99.5% (excluding scheduled maintenance)
- Database backups: automated daily, 30-day retention
- Maintenance notice: 48 hours in advance via notice board

### Usability
- Bilingual: Gujarati (primary) + English
- Mobile-responsive (smartphones + tablets)
- WCAG 2.1 Level AA accessibility
- UI patterns consistent with OJAS (ojas.gujarat.gov.in) and SSC portal for citizen familiarity

### Scalability
- New municipality subdomain: config-only addition, no code change
- Database schema supports multi-tenant isolation via `tenant_id`

---

## 9. Security Requirements

> This section is mandatory. The portal undergoes full end-to-end penetration testing by 12–15 cybersecurity experts before launch. Every requirement below must be implemented and verifiable.

---

### 9.1 Authentication

| Requirement | Detail |
|-------------|--------|
| Login brute force | Lock account for 15 minutes after 5 consecutive failed login attempts |
| Login lockout notification | Notify registered mobile/email on lockout |
| Password hashing | bcrypt (cost ≥ 12) or Argon2id — never MD5/SHA1 |
| Password policy enforcement | Server-side: min 8 chars, 1 uppercase, 1 digit, 1 special char |
| Session fixation | Issue new session ID immediately on successful login |
| Session storage | HttpOnly + Secure + SameSite=Strict cookies; session ID never in URL |
| Concurrent sessions | Single active session per user (new login invalidates old session) |
| Password reset | OTP to registered mobile/email only — no security questions |
| Admin 2FA | TOTP (Google Authenticator compatible) or OTP to registered admin mobile; required on every login |
| Admin session | Separate session store from citizen sessions; shorter timeout (15 min inactivity) |

---

### 9.2 OTP Security

| Requirement | Detail |
|-------------|--------|
| OTP length | 6 digits |
| OTP expiry | 5 minutes from generation |
| Max OTP attempts | 3 attempts before OTP invalidated; new OTP must be requested |
| Rate limiting | Max 3 OTP requests per phone number or email per hour |
| OTP delivery | Never sent in URL parameters; only via side channel (WhatsApp / SMS / email) |
| OTP logging | OTPs must not appear in application logs or error messages |
| OTP uniqueness | Each OTP single-use; invalidated immediately after successful use |
| Enumeration prevention | Same response time and message for valid and invalid phone/email in OTP request |

---

### 9.3 Authorization & Access Control

| Requirement | Detail |
|-------------|--------|
| Tenant isolation | `tenant_id` derived from authenticated subdomain at the server, never from request body or query params |
| Every DB query | Must include `WHERE tenant_id = ?` — no cross-tenant data possible |
| Dept Admin scope | API enforces department-only access; cannot access other departments even with direct API calls |
| IDOR prevention | Registration IDs, Application Ref Nos, Payment IDs, Notice IDs must be UUIDs or cryptographically opaque tokens — not sequential integers |
| Eligibility re-check | Call letter download eligibility (fee paid + published) re-validated on every download request server-side, not just on page render |
| Fee bypass prevention | Call letter and result access cannot be unlocked via direct API call without fee payment record in DB |
| Admin URL | Not in robots.txt, sitemap.xml, or any public page link |
| Privilege escalation | Department Admin cannot elevate own role via API; role field not user-editable |
| Object-level auth | Every resource (application, payment, call letter) verified to belong to authenticated user's Registration ID before serving |

---

### 9.4 Input Validation & Injection

| Requirement | Detail |
|-------------|--------|
| Server-side validation | All inputs validated server-side; client-side validation is UX-only |
| SQL injection | Parameterized queries or ORM for all DB operations — no string-concatenated queries |
| Aadhaar validation | Format: 12 digits, Verhoeff checksum algorithm verified server-side |
| NoSQL injection | If any NoSQL used, sanitize operator injection (`$where`, `$gt`, etc.) |
| Command injection | No user input passed to shell commands; file processing uses safe libraries only |
| SSTI | If templating engine used for PDF/email generation, sandbox user input; never evaluate user-supplied template expressions |
| HTML injection | All user-supplied text HTML-escaped before rendering; admin notice board content also sanitized |
| Path traversal | Uploaded filenames sanitized: strip `../`, `./`, absolute paths, and null bytes |

---

### 9.5 File Upload Security

| Requirement | Detail |
|-------------|--------|
| MIME type validation | Validate actual file magic bytes server-side (not just extension or Content-Type header) |
| Photo uploads | Accept: JPG/JPEG only; max 50 KB; re-encode through image library to strip metadata and embedded content |
| Signature uploads | Accept: JPG/JPEG only; max 20 KB; same re-encoding requirement |
| Admin PDF uploads (advt) | Validate PDF structure; scan for embedded JavaScript, macros, and active content |
| Storage location | All uploads stored outside webroot; served via authenticated signed URLs or API endpoint — never directly accessible via public URL |
| Execute permissions | Upload directory: no execute permissions at OS level |
| Filename in storage | Rename to system-generated UUID on storage; original filename stored in DB only for display |
| ZIP export downloads | Admin-only download endpoint; validate admin session and tenant before serving file |
| Bulk ZIP link | 7-day expiry links must be signed tokens (HMAC); unauthenticated access must be rejected |

---

### 9.6 XSS Prevention

| Requirement | Detail |
|-------------|--------|
| Output encoding | All user-supplied data HTML-encoded before rendering in browser |
| Content Security Policy | Strict CSP header: `default-src 'self'`; no `unsafe-inline`; no `unsafe-eval`; nonce-based for any inline scripts |
| Stored XSS | Notice board, Important Instructions, advertisement fields — all stored content sanitized with allowlist-based HTML sanitizer (e.g. DOMPurify) |
| DOM XSS | No direct insertion of URL parameters or hash fragments into `innerHTML` / `document.write` |
| PDF injection | Generated PDF content (call letters, receipts) uses template literals not HTML-to-PDF with raw user input |

---

### 9.7 CSRF Protection

| Requirement | Detail |
|-------------|--------|
| CSRF tokens | Synchronizer token on all state-changing forms (registration, application submit, fee initiation, admin actions) |
| Cookie SameSite | `SameSite=Strict` on session cookies |
| Origin validation | Server validates `Origin` or `Referer` header as secondary CSRF defence |
| CSRF on JSON APIs | Double-submit cookie or custom header (`X-Requested-With`) pattern for AJAX requests |

---

### 9.8 Multi-Tenant Isolation

| Requirement | Detail |
|-------------|--------|
| Schema separation | Patan and Palanpur use separate DB schemas; no shared tables for PII or transactional data |
| tenant_id enforcement | Middleware-level enforcement: every authenticated request has `tenant_id` injected server-side from subdomain |
| File storage isolation | Per-tenant directory paths; symlink attacks and path traversal between tenant directories must be impossible |
| Cross-tenant admin | Super Admin cross-tenant access (if any) must be explicitly logged with reason |
| Subdomain spoofing | `Host` header validated against configured allowed subdomains; reject unknown Host values |

---

### 9.9 Payment Security

| Requirement | Detail |
|-------------|--------|
| PCI-DSS scope | Redirect model only — no card data touches application server; gateway handles card entry |
| Fee amount source | Fee amount sent to gateway is read from DB (by Advt No), never from client-submitted form field |
| Webhook verification | Verify gateway webhook HMAC signature before processing any payment status update |
| Idempotency | Duplicate webhook calls (same payment ID) must not update fee status twice |
| Amount validation | Webhook payment amount verified against expected amount in DB before marking Paid |
| Application Ref match | Webhook payload's Application Ref No cross-checked against payment record in DB |
| Receipt exposure | Payment receipts served only to the registered user who made the payment |

---

### 9.10 Security Headers

All responses must include:

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `Content-Security-Policy` | Strict policy; `default-src 'self'`; no `unsafe-inline`/`unsafe-eval` |
| `X-Frame-Options` | `DENY` (clickjacking prevention) |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Cache-Control` (auth pages) | `no-store` on all authenticated/sensitive responses |

---

### 9.11 Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Login (citizen) | 5 failed attempts → 15-min lockout per account |
| Login (admin) | 3 failed attempts → 30-min lockout; alert sent to Super Admin |
| OTP request | 3 requests per phone/email per hour |
| Application submit | 10 submissions per Registration ID per hour |
| Public API (read) | 100 requests per minute per IP |
| Admin API | 50 requests per minute per user |
| File uploads | 5 uploads per minute per session |

---

### 9.12 Logging & Audit Trail

| Event Category | Events Logged |
|---------------|---------------|
| Authentication | Login success/failure, logout, lockout, password reset, 2FA success/failure |
| OTP | Request, delivery channel, success/failure (no OTP value in logs) |
| Registration | OTR create, edit, find attempts |
| Application | Submit, edit, print |
| Fee | Payment initiation, gateway redirect, webhook received, status updated |
| Call Letter | Download attempts (eligible and ineligible) |
| Admin actions | Advertisement create/edit/publish/close, notice CRUD, call letter enable/disable, bulk export trigger |
| Access control | 403/401 events, cross-tenant access attempts |

**Log rules:**
- Logs must NOT contain: raw Aadhaar numbers, OTP values, passwords, full card details, raw session tokens
- Log retention: minimum 1 year
- Audit log: append-only / immutable (no admin can delete or modify logs)
- Log access: restricted to Super Admin and infrastructure team only

---

### 9.13 Business Logic Security

| Scenario | Required Defence |
|----------|-----------------|
| Double registration with same Aadhaar | Unique constraint on `aadhaar_hash + tenant_id`; checked server-side |
| Apply for same post twice | Unique constraint on `(registration_id, advt_no)`; reject duplicate server-side |
| Apply after advertisement closing date | Server-side timestamp check on `advt.end_date`; client-side date is not trusted |
| Edit OTR after edit window | Server-side check on `created_at + edit_window_hours`; reject if window expired |
| Download call letter without eligibility | Server-side check: fee status = Paid AND call letter enabled for advt |
| Fee payment for non-existent application | Application Ref No validated in DB before gateway redirect |
| Admin publishing advt without required fields | Server-side field validation; Draft status cannot be Published with missing mandatory fields |
| Mass download of call letters | Rate limit + session auth on call letter endpoint; bulk unauthenticated download must be impossible |

---

### 9.14 Infrastructure & Deployment Security

| Requirement | Detail |
|-------------|--------|
| SSH access | Key-based authentication only; password SSH disabled; non-standard port recommended |
| Firewall | Only ports 80 and 443 exposed publicly; DB port (5432/3306) not accessible from internet |
| Default credentials | No default credentials on DB, OS accounts, or any service |
| Debug mode | Production deployment: debug mode off; no stack traces or internal paths in API error responses |
| Error messages | Generic error messages to users; detailed errors logged server-side only |
| Dependency management | Package lockfiles committed; no packages with known High/Critical CVEs at launch |
| Environment variables | No secrets (DB passwords, API keys, gateway credentials) in source code or version control |
| TLS configuration | TLS 1.2 minimum; TLS 1.0/1.1 disabled; weak cipher suites disabled |
| CAPTCHA | Server-side CAPTCHA validation; CAPTCHA token verified with provider API before processing submission |

---

### 9.15 Pentest Scope Summary

The 12–15 cybersecurity experts will test (at minimum):

- **Auth & session**: brute force, session fixation, token leakage, 2FA bypass, concurrent session handling
- **Authorization**: IDOR on all resource IDs, horizontal privilege escalation (citizen A accessing citizen B's data), vertical privilege escalation (Dept Admin → Super Admin), cross-tenant data access
- **Injection**: SQLi, XSS (stored/reflected/DOM), SSTI, command injection, header injection
- **File uploads**: MIME bypass, malicious file upload, path traversal in filename, serving uploaded files directly
- **Business logic**: fee bypass → call letter access, duplicate registration, apply-after-close, edit-after-window
- **Payment**: fee amount tampering in gateway redirect, webhook replay, missing signature verification
- **Multi-tenant**: cross-subdomain data access, tenant_id manipulation in API calls
- **OTP**: OTP enumeration, rate limit bypass, OTP reuse, OTP in logs
- **Infrastructure**: exposed ports, default credentials, debug endpoints, error message leakage
- **Security headers**: missing/misconfigured headers, CSP bypass, clickjacking

> All findings from pentest must be resolved before go-live. Critical and High severity issues block deployment.

---

## 10. Existing Frontend — Carry-Over & Changes

Current state: React 18 + Vite SPA, 7 routes, all data hardcoded in JS files.

| Route | Current State | Required Change |
|-------|--------------|-----------------|
| `/` | Static home (facts, services, news) | Add admin-driven notice board + quick links section |
| `/careers` | Static `jobs.js` data | Wire to API — feed from admin-published advertisements |
| `/notices` | Static hardcoded list | Wire to API — feed from admin notice board |
| `/results` | Static hardcoded results | Wire to API — feed from admin results/notifications |
| `/callletter` | Static exam/centre info | Replace with functional M5 call letter module |
| `/about` | Static org info | Keep as-is (static, municipality-provided content) |
| `/contact` | Static contact info | Keep as-is; update municipality-specific data |
| `/registration` | Does not exist | Add: full 10-step OTR flow (M2) |
| `/application` | Does not exist | Add: application module (M3) |
| `/fee` | Does not exist | Add: fee payment module (M4) |
| `/help` | Does not exist | Add: help/query page (M6) |

**Nav restructure required:** Current nav is a flat 7-item bar. SRS requires dropdowns on Registration and Online Application items (per §3.1.2).

**Language support:** Current site has EN/HI/GU via `LangContext`. All new modules must use the same `useLang()` hook and add keys to `i18n.js`.

---

## 11. Out of Scope

- Online examination / test-taking (portal is recruitment + advertising only)
- Direct Aadhaar data storage (UIDAI compliance — hash only)
- Offline DD/challan payment *(pending — open question #2)*
- Results computation or merit list generation (admin uploads result PDFs)

---

## 12. Open Questions

All 9 items below are unresolved. Items marked **BLOCKS** halt development of the named module until answered.

| # | Question | Blocks | Owner |
|---|----------|--------|-------|
| 1 | Edit window for completed registration — 48h or longer? | M2 edit logic | Municipality |
| 2 | Fee payment — online only, or offline DD/challan too? | M4 scope | Municipality |
| 3 | Aadhaar integration method — OTP-based or offline XML? | M2 registration flow | Municipality + UIDAI |
| 4 | Admin credentials — shared across both subdomains or fully separate? | M8 admin architecture | Municipality |
| 5 | Results module — separate module beyond notice board? | Scope | Municipality |
| 6 | Advertisement PDFs — admin uploads or system-generated? | M8 advertisement mgmt | Municipality |
| 7 | Payment gateway — Razorpay / PayGov / Paytm / state portal? | M4 integration | Municipality |
| 8 | Application form fields beyond OTR profile? (exam centre, category declaration, qualifications, experience) | **BLOCKS** M3 apply form | Municipality |
| 9 | Will municipality register WhatsApp Business API account (Meta-approved BSP)? | M7 OTP + all notifications; determines SMS fallback cost | Municipality |

---

## 13. Dependencies & Assumptions

| Dependency | Owner | Required Before |
|-----------|-------|----------------|
| Official logos, seal images, branding guidelines | Municipality | Frontend development |
| UIDAI AUA/KUA empanelment (Aadhaar OTP API access) | Municipality | M2 registration |
| Payment gateway contract + API credentials | Municipality | M4 fee payment |
| SMS gateway API credentials | Municipality | M2 OTP (fallback) |
| WhatsApp Business API account (Meta-approved BSP) | Municipality | M2 OTP (primary) |
| Email SMTP relay credentials | Municipality | All email notifications |
| Server provisioned (Linux, specs TBD) | Municipality IT | Deployment |
| Domain DNS + SSL certificate configured | Municipality IT | Deployment |

---

## Appendix A — Registration Flow (Reference)

| Step | Screen | Key Action |
|------|--------|-----------|
| 1 | Instructions | Read → I Agree |
| 2 | Aadhaar Verification | Aadhaar + OTP → phone OTP → set password |
| 3 | Personal Details | Name, DOB, gender, category |
| 4 | Communication Details | Address, mobile, email |
| 5 | Other Details | PH status, qualification, ex-serviceman |
| 6 | Language Details | Languages + proficiency |
| 7 | Upload Photo | JPG, max 50 KB, 3.5×4.5 cm |
| 8 | Upload Signature | JPG, max 20 KB, 3.5×1.5 cm |
| 9 | Declaration | Accept checkbox |
| 10 | CAPTCHA + Save | Submit → Registration ID generated |

---

## Appendix B — Application Submission Flow (Reference)

| Step | Screen | Key Action |
|------|--------|-----------|
| 1 | Enter Reg No | Registration ID + DOB |
| 2 | OTR Verification | Pre-fill from OTR or Skip |
| 3 | Select Department | Dropdown |
| 4 | Post Listing | View open posts → Details or Apply |
| 5 | Application Form | Fill fields *(TBD — open question #8)* |
| 6 | Apply Now | Submit → Application Ref No generated |
| 7 | Fee Payment | Pay via gateway → receipt |
| 8 | Print Application | Download PDF |
