# Phase 1: Foundation & Infrastructure

| Field | Value |
|-------|-------|
| **Phase** | 1 of 9 |
| **Status** | 🟡 Partially Complete — infra built, recruitment models missing |
| **Depends On** | None |
| **Blocks** | All other phases |
| **PRD Sections** | §4 Deployment Architecture · §6 Data Model · §9.14 Infrastructure Security |

---

## Already Built ✅

The HMS-to-recruitment migration left a solid foundation. These are DONE — do not rebuild:

| Item | Location |
|------|----------|
| Express server + security middleware stack (Helmet, CORS, mongo-sanitize, HPP, rate-limit) | `Server/server.js` + `Server/middlewares/` |
| MongoDB connection via Mongoose | `Server/server.js` |
| Session auth (connect-mongo, HttpOnly, Secure, SameSite=Lax, 24h TTL) | `Server/server.js` |
| Admin User model + full CRUD + login/logout/verify-session | `Server/models/Employee.js` + `Server/routes/v1/employees.routes.js` |
| CompanyMaster model (Nagar Palika org config) | `Server/models/CompanyMaster.js` |
| Department model + CRUD | `Server/models/Department.js` + `Server/routes/v1/departments.routes.js` |
| Role Master + Menu Master + Employee Roles (full permission system) | `Server/models/RoleMaster.js`, `MenuMaster.js`, `EmployeeRoles.js` |
| Country / State / City (location master) | `Server/models/Country.js`, `State.js`, `City.js` |
| Master Data model + CRUD (enums for gender, category, qualification, etc.) | `Server/models/MasterData.js` + `Server/routes/v1/masterData.routes.js` |
| OTP model (TTL-indexed, 10-min auto-expire) + send/verify/reset routes | `Server/models/Otp.js` + `Server/routes/v1/otp.routes.js` |
| WhatsApp Cloud API integration (config, send, broadcast, webhook, retry) | `Server/models/WhatsAppConfig.js`, `WhatsAppMessage.js`, `Server/services/whatsapp.service.js` |
| Email (EmailSetup, EmailFor, EmailTemplate models + routes) | `Server/models/EmailSetup.js`, `EmailFor.js`, `EmailTemplate.js` |
| Secure file upload (magic byte check, UUID rename, Sharp compression) | `Server/middlewares/secureUpload.js` |
| Security headers (Helmet + custom CSP) | `Server/middlewares/securityHeaders.js` |
| Input validation (express-validator chains) | `Server/middlewares/inputValidator.js` |
| Role scope middleware (dept-scoped queries for DEPT_ADMIN) | `Server/middlewares/roleScope.js` |
| Counter model (sequence/ID generation) | `Server/models/Counter.js` |
| Seed scripts (recruitment master data + menu/role structure) | `Server/scripts/seedMasters.js`, `Server/scripts/seedMenusAndRoles.js` |
| Swagger API docs (dev only, `/api-docs`) | `Server/config/swagger.js` |

---

> **Architecture note (2026-05-25):** No multi-tenant middleware. Each municipality gets its own deployment (separate server + DB). No `tenant_id` on any model.

## Remaining Work 🔴

### 1. New Recruitment Models

Create these 6 models — none exist yet:

#### `Advertisement.js`
```javascript
{
  advt_no: String (unique, auto-generated: ORGCODE/YEAR/SEQ),
  post_title: { en: String, gu: String },
  department: ObjectId → Department,
  class: Enum (I/II/III/IV),
  pay_scale: String,
  vacancies: { total: Number, general: Number, obc: Number, sc: Number, st: Number, ews: Number },
  age_limit: { min: Number, max: Number },
  qualification: String,
  ph_description: String,
  experience_required: String,
  application_fee: Number,
  start_date: Date,
  end_date: Date,
  probation_period: String,
  pdf_path: String,
  other_conditions: String,
  status: Enum (Draft/Published/Closed/Archived),
  createdBy: ObjectId → Employee,
  timestamps
}
```

#### `Candidate.js` (OTR)
```javascript
{
  registration_id: String (unique per tenant, auto-generated),
  aadhaar_hash: String (required, no raw Aadhaar stored),
  name: String,
  father_husband_name: String,
  dob: Date,
  gender: ObjectId → MasterData,
  category: ObjectId → MasterData,
  nationality: String,
  religion: String,
  address_permanent: { line1, line2, taluka, district, state, pincode, countryId, stateId, cityId },
  address_current: { same_as_permanent: Boolean, ...address fields },
  mobile: String (OTP-verified),
  alternate_mobile: String,
  email: String (OTP-verified),
  marital_status: ObjectId → MasterData,
  ph_status: Boolean,
  ph_type: ObjectId → MasterData,
  ph_percentage: Number,
  ex_serviceman: Boolean,
  qualification: ObjectId → MasterData,
  languages: [{ language: ObjectId → MasterData, read: Boolean, write: Boolean, speak: Boolean }],
  mother_tongue: String,
  photo_path: String,
  signature_path: String,
  password: String (bcrypt hashed),
  otr_status: Enum (incomplete/complete),
  edit_window_expires_at: Date,
  timestamps
}
Unique index: { aadhaar_hash: 1 }
```

#### `Application.js`
```javascript
{
  application_ref_no: String (UUID, unique per tenant),
  registration_id: String,
  advt_no: String,
  submitted_at: Date,
  status: Enum (submitted/under_review/shortlisted/rejected/selected),
  edit_log: [{ field, old_value, new_value, changed_at }],
  timestamps
}
Unique index: { registration_id: 1, advt_no: 1 }
```

#### `FeePayment.js`
```javascript
{
  payment_id: String (UUID, unique),
  application_ref_no: String,
  registration_id: String,
  advt_no: String,
  amount: Number,
  gateway_txn_id: String,
  payment_mode: ObjectId → MasterData,
  status: Enum (pending/paid/failed/refunded),
  receipt_path: String,
  webhook_payload: Mixed,
  paid_at: Date,
  createdBy: String (registration_id),
  timestamps
}
```

#### `CallLetter.js`
```javascript
{
  registration_id: String,
  advt_no: String,
  roll_number: String,
  exam_date: Date,
  exam_time: String,
  venue: String,
  enabled: Boolean (default: false),
  available_from: Date,
  downloaded_at: Date,
  timestamps
}
```

#### `Notice.js`
```javascript
{
  notice_id: String (UUID),
  title: String,
  body: String,
  pdf_path: String,
  type: Enum (notice/circular/press/recruitment/tender),
  publish_date: Date,
  expiry_date: Date,
  status: Enum (draft/published/unpublished),
  is_important_instruction: Boolean (default: false),
  createdBy: ObjectId → Employee,
  timestamps
}
```

### 3. New Routes + Controllers

Create these route/controller pairs (parallel to existing pattern):
```
Server/routes/v1/advertisements.routes.js
Server/routes/v1/candidates.routes.js
Server/routes/v1/applications.routes.js
Server/routes/v1/feePayments.routes.js
Server/routes/v1/callLetters.routes.js
Server/routes/v1/notices.routes.js
```
Mount all in `Server/server.js`.

### 4. Update analytics.controller.js
Replace the stub with real queries against new models (Advertisement, Candidate, Application, FeePayment).

### 5. Update WhatsApp Service
Add recruitment trigger functions to `Server/services/whatsapp.service.js`:
- `sendOtpMessage(recipientPhone, otp)`
- `sendRegistrationIdIssued(candidate, registrationId)`
- `sendApplicationSubmitted(candidate, applicationRefNo, postTitle)`
- `sendFeePaymentReceipt(candidate, payment)`
- `sendCallLetterPublished(candidate, advtNo)`

---

## Acceptance Criteria

- `node server.js` starts with no errors
- `GET /api/v1/advertisements` returns 200
- `GET /api/v1/candidates` (admin auth) returns 200
- All 6 new models seeded and queryable

---

## Security Checklist

- [ ] Aadhaar: only SHA-256 hash stored; raw Aadhaar never persisted
- [ ] Candidate passwords: bcrypt (cost ≥ 12)
- [ ] File uploads: secureUpload middleware applied to photo/signature endpoints
