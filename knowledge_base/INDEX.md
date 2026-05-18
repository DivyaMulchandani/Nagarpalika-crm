# Knowledge Base Index

> **Usage**: Search this file first. Open linked docs only if index answer is insufficient. Saves tokens.

---

## Quick Lookup Table

| # | File | Type | Topics | Path |
|---|------|------|--------|------|
| 1 | NagarPalika.pdf | SRS | OTR registration, job application, fee payment, call letter, admin panel, data entities | `Reference_Docs/NagarPalika.pdf` |
| 2 | nagarpalika-recruitment-portal.md | PRD | All modules, data model, NFRs, security requirements, open questions | `prds/nagarpalika-recruitment-portal.md` |
| 3 | **tech-stack.md** | **Tech** | **Actual codebase state — Web/Admin/Server stack, routes, models, env vars, gaps** | **`tech-stack.md`** |
| 5 | phase-1-foundation.md | Phase | Server, multi-tenant DB, API skeleton, security baseline | `phases/phase-1-foundation.md` |
| 6 | phase-2-public-frontend.md | Phase | API-driven public site, nav restructure, job listings, notices | `phases/phase-2-public-frontend.md` |
| 7 | phase-3-otr-registration.md | Phase | 10-step OTR flow, Aadhaar OTP, citizen auth, login modal | `phases/phase-3-otr-registration.md` |
| 8 | phase-4-application.md | Phase | Job application flow, edit, print PDF | `phases/phase-4-application.md` |
| 9 | phase-5-fee-payment.md | Phase | Payment gateway, webhook HMAC, receipts | `phases/phase-5-fee-payment.md` |
| 10 | phase-6-call-letter.md | Phase | Eligibility check, signed download token, admit card PDF | `phases/phase-6-call-letter.md` |
| 11 | phase-7-admin-panel.md | Phase | All 7 admin sub-modules, bulk ZIP export, role-based access | `phases/phase-7-admin-panel.md` |
| 12 | phase-8-notifications.md | Phase | WhatsApp → SMS → Email stack, OTP security, delivery log | `phases/phase-8-notifications.md` |
| 13 | phase-9-security-pentest.md | Phase | Pre-pentest hardening, pentest scope, remediation SLA, go-live gate | `phases/phase-9-security-pentest.md` |

---

## Reference_Docs

### 1. NagarPalika.pdf
- **Full Title**: SRS — Nagar Palika Online Recruitment Portal
- **Version**: 1.0 (Draft) — Pending Stakeholder Review
- **Clients**: Patan Municipal Council · Palanpur Municipal Council
- **Pages**: 12
- **Tags**: `SRS` `recruitment` `OTR` `aadhaar` `registration` `job-application` `fee-payment` `call-letter` `admin-panel` `multi-tenant` `gujarati` `bilingual` `whatsapp-otp` `payment-gateway`

#### Summary
- Web portal for citizens to register (OTR via Aadhaar), browse vacancies, apply, pay fees, and download call letters
- Two subdomains on shared server: `patan.domain.gov.in` / `palanpur.domain.gov.in` — same codebase, isolated DB schemas
- Modelled on OJAS (ojas.gujarat.gov.in) UX; bilingual Gujarati + English
- Admin panel: post advertisements, manage applications, publish results/notices, bulk PDF export (ZIP)
- Notification: WhatsApp primary → SMS fallback → Email; all OTP-verified

#### Sections Index

| Section | Title | Page | Key Info |
|---------|-------|------|----------|
| 1.1 | Purpose | 1 | Audience: devs, architects, PMs, stakeholders |
| 1.2 | Scope | 1 | Two subdomains, OTR, fee payment, call letter download |
| 1.3 | Definitions | 2 | OTR, Aadhaar, Advt No, Call Letter, SRS, Captcha |
| 1.4 | References | 2 | OJAS, SSC portal, UIDAI API, Payment gateway |
| 2.1 | Product Perspective | 2 | Standalone Linux server, replaces offline process |
| 2.2 | System Architecture | 2 | REST API, separate DB schemas, WhatsApp/SMS/Email |
| 2.3 | User Roles | 3 | Guest · Registered User · Administrator |
| 2.4 | Operating Constraints | 3 | GIGW compliance, UIDAI norms, 30min session timeout |
| 3.1 | Home Page | 3–4 | Navbar, notice board, quick links, ticker bars |
| 3.2 | Registration Module (OTR) | 4–6 | 10-step flow: Aadhaar OTP → personal details → photo/sig → captcha → Reg ID |
| 3.3 | Online Application Module | 6–7 | Apply/Edit/Print; pre-fill from OTR; Advt selection by dept |
| 3.4 | Fee Payment Module | 7 | UPI/NetBanking/Card; retry on failure; PDF receipt |
| 3.5 | Call Letter / Admit Card | 7 | Eligibility check (fee paid + admin published); PDF download |
| 3.6 | Help / Query Page | 7–8 | Toll-free, FAQ accordions, query submission form |
| 3.7 | Administrator Panel | 8–9 | Auth (2FA), Advertisement Mgmt, Notification, Bulk ZIP export |
| 4 | Non-Functional Requirements | 9–10 | Perf, Security, Reliability, Usability, Scalability |
| 5 | System Constraints | 10 | Single server, UIDAI empanelment, WhatsApp Business API |
| 6 | Key Data Entities | 10 | Candidate, Advertisement, Application, Fee Payment, Call Letter, Notification, Admin |
| 7 | Assumptions & Dependencies | 10–11 | Logos from client, gateway agreement, server by municipality |
| 8 | Open Questions | 11 | 9 unresolved items (edit window, fee modes, Aadhaar method, payment gateway) |
| App A | Registration Flow Summary | 11 | 10-step table (step → screen → action) |
| App B | Application Submission Flow | 12 | 8-step table (step → screen → action) |

#### Key Data Entities (quick ref)

| Entity | Primary Key | Key Fields |
|--------|-------------|------------|
| Candidate (OTR) | Registration ID | Aadhaar hash, name, DOB, gender, category, photo, signature |
| Advertisement | Advt No | post title, dept, vacancies, fee, dates, PDF, status |
| Application | Application Ref No | Registration ID, Advt No, timestamp, status |
| Fee Payment | Payment ID | Application Ref No, amount, gateway tx ID, status |
| Call Letter | Registration ID + Advt No | roll number, exam details, download timestamp |
| Notification | Notice ID | title, body, PDF, publish/expiry date, status |
| Admin User | User ID | name, role, dept, hashed credentials, last login |

#### Open Questions (blocking items)

| # | Question | Blocks |
|---|----------|--------|
| 1 | Edit window — 48h or longer? | Registration edit logic |
| 2 | Online fee only, or offline DD/challan too? | Fee module scope |
| 3 | Aadhaar — OTP-based or offline XML? | Registration flow |
| 4 | Shared or separate admin credentials per subdomain? | Admin architecture |
| 5 | Separate Results module? | Scope |
| 6 | Advertisement PDFs — admin upload or system-generated? | Advt management |
| 7 | Payment gateway — Razorpay / PayGov / Paytm / state portal? | Fee integration |
| 8 | Application form fields beyond OTR? (exam centre, quals, experience) | Apply module |
| 9 | WhatsApp Business API account — municipality to register? | OTP + notification cost |

#### Non-Functional Targets (quick ref)
- Page load: < 3s | Submit response: < 5s | Concurrent: 500 sessions/subdomain
- Security: HTTPS/TLS 1.2+, bcrypt/Argon2, SQL injection + XSS + CSRF protection, IP whitelist for admin
- Uptime: 99.5% | Backups: daily, 30-day retention
- Accessibility: WCAG 2.1 AA | Mobile-responsive

---

## PRDs

### 1. nagarpalika-recruitment-portal.md
- **Path**: `prds/nagarpalika-recruitment-portal.md`
- **Status**: Draft
- **Product**: Nagar Palika Online Recruitment Portal
- **Clients**: Patan Municipal Council · Palanpur Municipal Council
- **Tags**: `OTR` `registration` `aadhaar` `recruitment` `fee-payment` `call-letter` `admin-panel` `multi-tenant` `bilingual` `gujarati` `whatsapp-otp` `payment-gateway` `WCAG` `REST-API` `pentest` `IDOR` `CSRF` `XSS` `SQLi` `session-security` `file-upload` `rate-limiting` `audit-log` `business-logic` `payment-security` `CSP` `HSTS`

#### Summary
- Full-stack portal replacing manual recruitment process for 2 municipalities
- 8 citizen modules: Home · OTR Registration · Application · Fee Payment · Call Letter · Help · Auth · (Results)
- Admin panel with 7 sub-modules including async bulk ZIP export
- Multi-tenant: shared codebase, isolated DB schemas per municipality subdomain
- 9 open questions blocking key modules (esp. #8 blocks application form, #9 blocks WhatsApp OTP)

#### Sections Index

| Section | Title |
|---------|-------|
| 1 | Problem Statement |
| 2 | Goals & Success Metrics |
| 3 | Users & Roles (4 roles) |
| 4 | Deployment Architecture (diagram + stack) |
| 5 | Module Requirements (M1–M8 + Admin) |
| 5.2 | OTR Registration — 10-step flow table |
| 5.8.2 | Advertisement Management — 16-field form |
| 5.8.8 | Bulk ZIP Export specs |
| 6 | Data Model (7 entities with all attributes) |
| 7 | Notification System (events + channel priority) |
| 8 | Non-Functional Requirements (perf/reliability/usability/scalability) |
| **9** | **Security Requirements — full pentest-ready spec (15 subsections)** |
| 9.1 | Authentication (brute force, session, 2FA) |
| 9.2 | OTP Security (expiry, rate limit, logging) |
| 9.3 | Authorization & Access Control (IDOR, tenant isolation, privilege escalation) |
| 9.4 | Input Validation & Injection (SQLi, SSTI, path traversal) |
| 9.5 | File Upload Security (MIME, storage, ZIP links) |
| 9.6 | XSS Prevention (CSP, stored XSS, DOM XSS) |
| 9.7 | CSRF Protection (tokens, SameSite, Origin validation) |
| 9.8 | Multi-Tenant Isolation (schema, storage, Host header) |
| 9.9 | Payment Security (PCI scope, webhook HMAC, amount validation) |
| 9.10 | Security Headers (HSTS, CSP, X-Frame-Options, etc.) |
| 9.11 | Rate Limiting (per endpoint targets) |
| 9.12 | Logging & Audit Trail (events, log rules, retention) |
| 9.13 | Business Logic Security (fee bypass, duplicate registration, etc.) |
| 9.14 | Infrastructure & Deployment Security (SSH, firewall, secrets) |
| 9.15 | Pentest Scope Summary (what the 12–15 experts will test) |
| 10 | Existing Frontend — carry-over & changes table |
| 11 | Out of Scope |
| 12 | Open Questions (9 items with blocking module + owner) |
| 13 | Dependencies & Assumptions |
| App A | Registration Flow summary table |
| App B | Application Submission Flow summary table |

---

## Phases

Build order is sequential. 🟡 = infra done, recruitment features pending. 🔴 = not started.

**Starting point as of 2026-05-18:** Express + MongoDB + session auth + WhatsApp + Email + OTP + secure uploads + admin panel auth/permissions/CRUD all exist. Recruitment-specific models, routes, and frontend flows are what remains to be built.

| Phase | File | Depends On | Status | Remaining Work |
|-------|------|-----------|--------|----------------|
| 1 | [Foundation](phases/phase-1-foundation.md) | None | 🟡 Partial | Multi-tenant middleware + 6 recruitment models + routes |
| 2 | [Public Frontend](phases/phase-2-public-frontend.md) | Phase 1 | 🔴 Not Started | Nav restructure + API wiring + /help page |
| 3 | [OTR Registration](phases/phase-3-otr-registration.md) | Phase 1, 2 | 🔴 Not Started | 10-step form + UIDAI OTP + citizen auth |
| 4 | [Application](phases/phase-4-application.md) | Phase 3 | 🔴 Not Started | Apply flow + edit + print PDF |
| 5 | [Fee Payment](phases/phase-5-fee-payment.md) | Phase 4 | 🔴 Not Started | Payment gateway adapter + webhook HMAC + receipts |
| 6 | [Call Letter](phases/phase-6-call-letter.md) | Phase 5, 7 | 🔴 Not Started | Eligibility check + signed download token |
| 7 | [Admin Panel](phases/phase-7-admin-panel.md) | Phase 1 | 🟡 Partial | 6 recruitment pages (Advt, Candidates, Applications, Fee, CallLetter, Notices) |
| 8 | [Notifications](phases/phase-8-notifications.md) | Phase 3, 7 | 🟡 Partial | Recruitment triggers + SMS fallback + UIDAI OTP + email service |
| 9 | [Security & Pentest](phases/phase-9-security-pentest.md) | All phases | 🔴 Not Started | Hardening checklist + pentest + remediation SLA |

### Open Questions Blocking Phases

| Q# | Question | Blocks Phase |
|----|----------|-------------|
| 1 | Edit window duration (48h?) | Phase 3 |
| 2 | Online only or DD/challan too? | Phase 5 |
| 3 | Aadhaar OTP-based or offline XML? | Phase 3 |
| 4 | Shared or separate admin credentials? | Phase 7 |
| 7 | Payment gateway choice? | Phase 5 |
| **8** | **Application form fields?** | **Phase 4 (HARD BLOCK)** |
| **9** | **WhatsApp BSP registered?** | **Phase 8 (HARD BLOCK)** |

---

### Template (copy when adding new PRD)
```
### N. filename.md
- **Path**: `prds/filename.md`
- **Status**: Draft | Review | Approved
- **Feature**: <feature name>
- **Tags**: `tag1` `tag2`
- **Summary**: One-line description
- **Sections**: Objective, Requirements, Out of scope, Open questions
```

---

## How to Use This Index

1. **Ctrl+F this file** before opening any document
2. Match on **Tags** row or **Section Title** column
3. Go to specific **Page** in the doc — no need to read full doc
4. **Key Data Entities** and **Open Questions** tables: answer without opening PDF
5. Open PDF only when full section text is required

---

## Maintenance

When adding a new document:
1. Add row to **Quick Lookup Table**
2. Add full entry under correct folder section
3. Fill **Summary** (3–5 bullets), **Sections** table, **Tags**

*Last updated: 2026-05-18*
