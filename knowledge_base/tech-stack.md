# Tech Stack — Actual Codebase State

> Last updated: 2026-05-18 (post HMS cleanup — commit 8128381)
> Source: Full codebase scan of Web/, Admin/, Server/
> **Current state:** HMS code removed. Recruitment-specific models/routes/pages not yet built. This is the clean starting point.

---

## Project Structure

```
Nagarpalika/
├── Web/        Public-facing citizen portal (React + Vite)
├── Admin/      Admin panel frontend (React + Vite — repurposed from hms-admin)
├── Server/     REST API backend (Express + MongoDB — repurposed from hms-server)
└── knowledge_base/
```

---

## Web — Public-Facing Portal

| Item | Detail |
|------|--------|
| **Framework** | React 18.3.1 |
| **Build tool** | Vite 5.4.0 |
| **Router** | React Router DOM 6.26.0 |
| **Styling** | Vanilla CSS — `site.css` + `ojas-tokens.css` (CSS custom properties, no Tailwind/MUI) |
| **Fonts** | Noto Sans + Noto Sans Gujarati (Google Fonts) |
| **i18n** | Custom `LangContext` — EN / HI / GU, persisted in localStorage |
| **State** | React hooks only (useState, useContext) |
| **API calls** | **None** — all data is static/hardcoded |
| **Dev port** | 5173 (Vite default) |
| **Entry** | `Web/index.html` → `src/main.jsx` → `src/App.jsx` |

### Routes

| Path | Component | Status |
|------|-----------|--------|
| `/` | `Home.jsx` | Static — hardcoded facts/news/services |
| `/about` | `About.jsx` | Static |
| `/careers` | `Careers.jsx` | Static — data from `src/data/jobs.js` |
| `/notices` | `Notices.jsx` | Static — hardcoded notice list |
| `/results` | `Results.jsx` | Static — form UI-only (not functional) |
| `/callletter` | `CallLetter.jsx` | Static — form UI-only (not functional) |
| `/contact` | `Contact.jsx` | Static — form UI-only (not functional) |

### Data Files (all hardcoded — to be replaced with API calls)

| File | Contents |
|------|----------|
| `src/data/jobs.js` | 10 job postings (JOBS array) |
| `src/data/marqueeItems.js` | 5 marquee ticker items |
| `src/data/i18n.js` | 40+ translation keys × 3 languages |

### What Needs to Be Built (Phase 2+)

- Wire `/careers`, `/notices`, `/results` to Server API
- Add `/registration`, `/application`, `/fee`, `/help` routes
- Nav restructure: add dropdowns (Registration, Online Application)
- Replace all static data arrays with API calls

---

## Admin — Admin Panel Frontend

| Item | Detail |
|------|--------|
| **Framework** | React 18.2.0 |
| **Build tool** | Vite 7.3.1 |
| **Router** | React Router DOM 6.4.1 |
| **UI library** | Reactstrap 9 (Bootstrap 5 wrapper) |
| **Tables** | react-data-table-component 7.5.2 |
| **Forms** | Formik 2.2.9 + Yup 0.32.11 |
| **Charts** | Recharts 3.6.0 |
| **HTTP client** | Axios 0.26.0 (with interceptors) |
| **Styling** | SCSS (Bootstrap 5 + custom themes) |
| **State** | React Context API — AuthContext + MenuContext |
| **Auth** | Cookie session (`withCredentials: true`) — no JWT on client |
| **Dev port** | 3000 |
| **API base URL** | `VITE_API_URL` env var (defaults to `http://localhost:8000`) |
| **Build output** | `Admin/build/` → copied to `Server/out/admin/` on `npm run build` |

### Auth Flow

1. Login → `POST /api/v1/auth/company/login` or `/auth/employee/login`
2. Server sets HttpOnly session cookie
3. `AuthContext.verifyUserSession()` called on app mount → `GET /api/v1/auth/verify-session`
4. 401 response → interceptor clears localStorage, redirects to `/`
5. All API calls use `withCredentials: true` to send session cookie

### Contexts

| Context | Provides |
|---------|----------|
| `AuthContext` | `adminData`, `role`, `loading`, `getAdmin()`, `verifyUserSession()` |
| `MenuContext` | `menuData`, `employeeRoles`, `currentPagePermissions` (read/write/delete/edit/print/mail) |

### Permission System

- `MenuContext` fetches role-based menus from server (30-min cache)
- Every protected page checks `currentPagePermissions` before showing action buttons
- `AuthProtected.jsx` redirects to `/` if no session role

### Current Routes (HMS — to be repurposed for Nagar Palika)

HMS pages that map to Nagar Palika equivalents:

| HMS Route | HMS Purpose | Nagar Palika Equivalent |
|-----------|-------------|------------------------|
| `/dashboard` | Analytics dashboard | Recruitment dashboard |
| `/employee` | Staff management | Admin user management |
| `/patients` | Patient list | Applicant (OTR) list |
| `/patients/new` | Patient registration | OTR registration review |
| `/appointments` | Appointment list | Job application list |
| `/invoices` | Invoice management | Fee payment management |
| `/whatsapp` | WhatsApp messages | Notification log |
| `/email-template` | Email templates | Notification templates |
| `/role-master` | Role management | Admin role management |
| `/menu-master` | Menu management | Admin menu management |
| `/employee-roles` | Role permissions matrix | Admin permission matrix |
| `/reports` | Analytics reports | Recruitment reports |
| `/department` | Department CRUD | Department CRUD (keep) |

### What Needs to Be Built (Phase 7)

- Replace all HMS-specific pages with recruitment portal admin pages
- New pages: Advertisement management, Call Letter management, Bulk ZIP export
- Update `LayoutMenuData.jsx` with Nagar Palika admin menu structure
- Update `constants/roles.js`: replace DOCTOR with DEPT_ADMIN, add SUPER_ADMIN

---

## Server — REST API Backend

| Item | Detail |
|------|--------|
| **Framework** | Express 4.21.2 |
| **Runtime** | Node.js ≥ 22 / Bun compatible |
| **Database** | MongoDB (Mongoose 8.11.0) |
| **Auth** | Express Session (connect-mongo, 24h TTL, HttpOnly cookie) |
| **Port** | 8000 (configurable via `PORT` env var) |
| **API prefix** | `/api/v1/` |
| **File uploads** | Multer + magic byte validation (file-type) + Sharp compression |
| **Input validation** | express-validator chains |
| **Security** | Helmet + CORS + express-mongo-sanitize + HPP + express-rate-limit |
| **Email** | Nodemailer (SMTP, DB-configured via admin panel) |
| **WhatsApp** | Meta Cloud API v21.0 (DB-configured via admin panel) |
| **Documentation** | Swagger UI at `/api-docs` (dev only) |
| **Logging** | Morgan (request log) + error log to `log/error.html` |

### Middleware Stack (in order)

1. Helmet + custom security headers
2. CORS (origins from `ALLOWED_ORIGINS` env var)
3. Body parser (10 MB limit)
4. `express-mongo-sanitize` (NoSQL injection prevention)
5. HPP (HTTP Parameter Pollution prevention)
6. Express Session (MongoDB-backed)
7. Morgan (dev logging)
8. Route handlers
9. Global error handler (no stack traces in production)

### Current Models (HMS — to be repurposed)

| HMS Model | Nagar Palika Equivalent | Action |
|-----------|------------------------|--------|
| `CompanyMaster` | Municipality config | Rename + add municipality fields |
| `Employee` | Admin user | Rename to AdminUser; keep structure |
| `RoleMaster` | Admin role | Keep; rename roles |
| `Department` | Department | Keep as-is |
| `Patient` | Candidate (OTR) | Replace with OTR Candidate model |
| `Doctor` | — | Remove |
| `Appointment` | Job Application | Replace with Application model |
| `Invoice` | Fee Payment | Replace with FeePayment model |
| `Payment` | Fee receipt | Fold into FeePayment |
| `TreatmentPlan` | — | Remove |
| `Prescription` | — | Remove |
| `PatientDocument` | Applicant document | Rename; adjust fields |
| `WhatsAppConfig` | WhatsApp config | Keep as-is (perfect fit) |
| `WhatsAppMessage` | Notification log | Keep as-is |
| `EmailSetup` | Email config | Keep as-is |
| `EmailTemplate` | Notification template | Keep as-is |
| `MasterData` | Master data (gender, category, etc.) | Keep; add recruitment categories |
| `MenuMaster` | Admin menu | Keep as-is |
| `Otp` | OTP (TTL-indexed) | Keep as-is |
| `Country/State/City` | Location data | Keep as-is |
| `CurrencyMaster` | — | Remove |

### New Models Needed (Phase 1)

| Model | Key Fields |
|-------|-----------|
| `Advertisement` | advt_no, post_title, department, class, pay_scale, vacancies, fee, start_date, end_date, pdf_path, status, tenant_id |
| `Candidate` (OTR) | registration_id, aadhaar_hash, name, dob, gender, category, address, mobile, email, photo_path, signature_path, languages, tenant_id |
| `Application` | application_ref_no, registration_id, advt_no, submitted_at, status, edit_log, tenant_id |
| `FeePayment` | payment_id, application_ref_no, amount, gateway_txn_id, mode, status, receipt_path, tenant_id |
| `CallLetter` | registration_id, advt_no, roll_number, exam_date, venue, enabled, available_from, tenant_id |

### Multi-Tenant Status

**Current:** Single-tenant. Most models have NO `organizationId`/`tenant_id`.
**Required:** `tenant_id` derived from `Host` header on every request. Two subdomains = two isolated DB namespaces.
**Approach:** Add `tenant_id` to all new models. Existing models (Employee, Dept, Menu, Role) can stay single-tenant initially if only one municipality uses admin panel.

### Security Features Already Present

- ✅ bcrypt password hashing
- ✅ Session-based auth (HttpOnly, Secure, SameSite)
- ✅ Magic byte file validation (`file-type` library)
- ✅ Secure filenames (UUID-based)
- ✅ Image compression (Sharp → WebP)
- ✅ Input validation (express-validator)
- ✅ NoSQL injection prevention (express-mongo-sanitize)
- ✅ HPP protection
- ✅ Rate limiting (express-rate-limit)
- ✅ Security headers (Helmet + custom CSP)
- ✅ Swagger docs (dev only)
- ✅ OTP with TTL index (10-min auto-expire)
- ✅ Soft deletes (isDeleted flag)
- ✅ Audit fields (createdBy, updatedBy on all models)

### Security Gaps to Fix (Before Go-Live)

- ❌ No multi-tenant isolation (tenant_id missing from all models)
- ❌ No UIDAI Aadhaar OTP integration
- ❌ No payment gateway webhook HMAC verification
- ❌ `express-async-errors` not installed (unhandled promise rejections possible)
- ❌ JWT secrets defined but JWT not used for auth (inconsistency — remove or clarify)
- ❌ No append-only audit log table

---

## Environment Variables Summary

| File | Key Variables |
|------|--------------|
| `Web/.env` | `VITE_API_URL`, `VITE_APP_NAME` |
| `Admin/.env` | `VITE_API_URL`, `VITE_APP_NAME` |
| `Server/.env` | `DATABASE`, `PORT`, `NODE_ENV`, `SESSION_SECRET`, `ALLOWED_ORIGINS`, `JWT_*`, `WHATSAPP_*`, `SMS_*`, `SMTP_*`, `UIDAI_*`, `PAYMENT_GATEWAY_*` |

---

## Running the Project

```bash
# Web (public portal)
cd Web && npm install && npm run dev      # → http://localhost:5173

# Admin panel
cd Admin && npm install && npm run dev   # → http://localhost:3000

# Server
cd Server && npm install && npm run dev  # → http://localhost:8000
# API docs (dev): http://localhost:8000/api-docs
```

## Build & Deploy

```bash
# Build admin and copy to Server/out/admin/
cd Admin && npm run build

# Server serves:
# - API:          http://localhost:8000/api/v1/*
# - Admin UI:     http://localhost:8000/out/admin/ (static)
# - Web (separate Vite build or served independently)
```
