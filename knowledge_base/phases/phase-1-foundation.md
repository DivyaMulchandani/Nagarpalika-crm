# Phase 1: Foundation & Infrastructure

| Field | Value |
|-------|-------|
| **Phase** | 1 of 9 |
| **Status** | 🔴 Not Started |
| **Depends On** | None |
| **Blocks** | All other phases |
| **PRD Sections** | §4 Deployment Architecture · §6 Data Model · §9.14 Infrastructure Security |

> **Deployment note:** One deployment per municipality. No `tenant_id` on any model.

---

## Definition of Done

A file is not marked done until **every applicable checkbox below passes**.

### Model file is done when:
- [ ] Mongoose schema defined with correct field types, `required`, and `default` values
- [ ] All `ref` fields point to the correct collection
- [ ] Auto-generated fields implemented (UUIDs, Counter-based sequences, SHA-256 hashes)
- [ ] TTL indexes set where applicable (e.g. OTP 10-min auto-expire)
- [ ] Sensitive data never stored raw: Aadhaar → SHA-256 hash only; passwords → bcrypt ≥ 12
- [ ] Model can be imported by `server.js` without errors (`node -e "require('./models/X')"`)

### Route / Controller file is done when:
- [ ] All required endpoints exist (list, get-by-id, create, update, delete — only what this phase needs)
- [ ] `authMiddleware` applied on every non-public route
- [ ] `express-validator` chains (from `inputValidator.js`) applied on every write endpoint
- [ ] Correct HTTP status codes returned: 200, 201, 400, 401, 403, 404, 422, 500
- [ ] Consistent response envelope used: `{ success, data, message }` or `{ success, error }`
- [ ] Route mounted in `Server/server.js`
- [ ] All endpoints testable via Swagger UI at `/api-docs` — **no frontend required**

---

## Remaining Work

### 1. Server Bootstrap

**File:** `Server/server.js`

- Express app with security middleware stack: Helmet, CORS, mongo-sanitize, HPP, rate-limit
- MongoDB connection via Mongoose (strict query mode, connection pooling, reconnect handlers)
- Session auth: connect-mongo, HttpOnly, Secure, SameSite=Lax, 24h TTL
- Static file serving for `/uploads`
- Swagger UI at `/api-docs` (dev only)
- Global error handler: sanitised error responses, no stack traces in production

---

### 2. Middlewares

| File | Purpose |
|------|---------|
| `Server/middlewares/securityHeaders.js` | Helmet + custom CSP, OWASP response headers |
| `Server/middlewares/inputValidator.js` | express-validator chains for all write routes |
| `Server/middlewares/authMiddleware.js` | Session-based auth + role/permission check |
| `Server/middlewares/roleScope.js` | Dept-scoped query injection for DEPT_ADMIN |
| `Server/middlewares/secureUpload.js` | Magic-byte validation, UUID rename, Sharp compression |

---

### 3. Core Foundation Models

Verify each model matches the constraints listed. Fix any deviations before moving to recruitment models.

| Model | File | Key Constraints |
|-------|------|----------------|
| Employee (Admin User) | `Server/models/Employee.js` | name, email, password (bcrypt), role ref, no organizationId |
| Department | `Server/models/Department.js` | name, code, isActive |
| RoleMaster | `Server/models/RoleMaster.js` | roleName, isActive |
| MenuMaster | `Server/models/MenuMaster.js` | permission tree structure |
| MenuGroupMaster | `Server/models/MenuGroupMaster.js` | menu group definitions |
| EmployeeRoles | `Server/models/EmployeeRoles.js` | employee ↔ role mapping |
| Country | `Server/models/Country.js` | location master |
| State | `Server/models/State.js` | countryId ref |
| City | `Server/models/City.js` | stateId ref |
| MasterData | `Server/models/MasterData.js` | type enum: gender, category, qualification, marital_status, ph_type, language, payment_mode |
| OTP | `Server/models/Otp.js` | TTL index (600s), target: mobile or email |
| Counter | `Server/models/Counter.js` | sequence generation for advt_no, registration_id |
| CompanyMaster | `Server/models/CompanyMaster.js` | single-record org config (name, logo, address) — no organizationId scoping |
| EmailSetup | `Server/models/EmailSetup.js` | SMTP config |
| EmailFor | `Server/models/EmailFor.js` | email recipient categories |
| EmailTemplate | `Server/models/EmailTemplate.js` | transactional email templates |

> **Remove:** `Server/models/WhatsAppConfig.js` and `Server/models/WhatsAppMessage.js` — not part of this system. Delete files, remove from any imports.

---

### 4. Core Foundation Routes

| Route File | Mount Point | Auth |
|-----------|-------------|------|
| `Server/routes/v1/employees.routes.js` | `/api/v1/employees` | Admin |
| `Server/routes/v1/departments.routes.js` | `/api/v1/departments` | Admin |
| `Server/routes/v1/roles.routes.js` | `/api/v1/roles` | Admin |
| `Server/routes/v1/menus.routes.js` | `/api/v1/menus` | Admin |
| `Server/routes/v1/employeeRoles.routes.js` | `/api/v1/employee-roles` | Admin |
| `Server/routes/v1/locations.routes.js` | `/api/v1/locations` | Public (read) / Admin (write) |
| `Server/routes/v1/masterData.routes.js` | `/api/v1/master-data` | Public (read) / Admin (write) |
| `Server/routes/v1/otp.routes.js` | `/api/v1/otp` | Public |
| `Server/routes/v1/emails.routes.js` | `/api/v1/emails` | Admin |
| `Server/routes/v1/companies.routes.js` | `/api/v1/companies` | Admin |

> **Remove:** `Server/routes/v1/whatsapp.routes.js` — delete file and unmount from `server.js`.

---

### 5. New Recruitment Models

Create all 6 fresh. None exist yet.

#### `Server/models/Advertisement.js`
```javascript
{
  advt_no: String,            // unique, auto: ORGCODE/YEAR/SEQ via Counter
  post_title: { en: String, gu: String },
  department: ObjectId → Department,
  class: Enum ['I','II','III','IV'],
  pay_scale: String,
  vacancies: {
    total: Number,
    general: Number,
    obc: Number,
    sc: Number,
    st: Number,
    ews: Number
  },
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
  status: Enum ['Draft','Published','Closed','Archived'],
  createdBy: ObjectId → Employee,
  timestamps
}
```

#### `Server/models/Candidate.js` (OTR)
```javascript
{
  registration_id: String,    // unique, auto-generated via Counter
  aadhaar_hash: String,       // required, SHA-256 of raw Aadhaar — unique index
  name: String,
  father_husband_name: String,
  dob: Date,
  gender: ObjectId → MasterData,
  category: ObjectId → MasterData,
  nationality: String,
  religion: String,
  address_permanent: {
    line1: String, line2: String,
    taluka: String, district: String,
    countryId: ObjectId, stateId: ObjectId, cityId: ObjectId,
    pincode: String
  },
  address_current: {
    same_as_permanent: Boolean,
    // same address fields as above
  },
  mobile: String,             // OTP-verified
  mobile_verified: Boolean,
  alternate_mobile: String,
  email: String,              // OTP-verified
  email_verified: Boolean,
  marital_status: ObjectId → MasterData,
  ph_status: Boolean,
  ph_type: ObjectId → MasterData,
  ph_percentage: Number,
  ex_serviceman: Boolean,
  qualification: ObjectId → MasterData,
  languages: [{
    language: ObjectId → MasterData,
    read: Boolean,
    write: Boolean,
    speak: Boolean
  }],
  mother_tongue: String,
  photo_path: String,
  signature_path: String,
  password: String,           // bcrypt >= 12
  otr_status: Enum ['incomplete','complete'],
  edit_window_expires_at: Date,
  timestamps
}
// Unique index: { aadhaar_hash: 1 }
```

#### `Server/models/Application.js`
```javascript
{
  application_ref_no: String, // UUID, unique
  registration_id: String,
  advt_no: String,
  submitted_at: Date,
  status: Enum ['submitted','under_review','shortlisted','rejected','selected'],
  edit_log: [{
    field: String,
    old_value: Mixed,
    new_value: Mixed,
    changed_at: Date
  }],
  timestamps
}
// Unique index: { registration_id: 1, advt_no: 1 }
```

#### `Server/models/FeePayment.js`
```javascript
{
  payment_id: String,         // UUID, unique
  application_ref_no: String,
  registration_id: String,
  advt_no: String,
  amount: Number,
  gateway_txn_id: String,
  payment_mode: ObjectId → MasterData,
  status: Enum ['pending','paid','failed','refunded'],
  receipt_path: String,
  webhook_payload: Mixed,
  paid_at: Date,
  timestamps
}
```

#### `Server/models/CallLetter.js`
```javascript
{
  registration_id: String,
  advt_no: String,
  roll_number: String,
  exam_date: Date,
  exam_time: String,
  venue: String,
  enabled: Boolean,           // default: false
  available_from: Date,
  downloaded_at: Date,
  timestamps
}
```

#### `Server/models/Notice.js`
```javascript
{
  notice_id: String,          // UUID
  title: String,
  body: String,
  pdf_path: String,
  type: Enum ['notice','circular','press','recruitment','tender'],
  publish_date: Date,
  expiry_date: Date,
  status: Enum ['draft','published','unpublished'],
  is_important_instruction: Boolean, // default: false
  createdBy: ObjectId → Employee,
  timestamps
}
```

---

### 6. New Recruitment Routes

| Route File | Mount Point | Auth |
|-----------|-------------|------|
| `Server/routes/v1/advertisements.routes.js` | `/api/v1/advertisements` | Public (read) / Admin (write) |
| `Server/routes/v1/candidates.routes.js` | `/api/v1/candidates` | Public (register/login) / Admin (read) |
| `Server/routes/v1/applications.routes.js` | `/api/v1/applications` | Candidate (submit) / Admin (manage) |
| `Server/routes/v1/feePayments.routes.js` | `/api/v1/fee-payments` | Candidate (initiate) / Admin (read) |
| `Server/routes/v1/callLetters.routes.js` | `/api/v1/call-letters` | Candidate (download) / Admin (manage) |
| `Server/routes/v1/notices.routes.js` | `/api/v1/notices` | Public (read) / Admin (write) |

Mount all in `Server/server.js`.

---

### 7. Analytics Controller

**File:** `Server/controllers/analytics.controller.js`

Replace stub with real aggregation queries against `Advertisement`, `Candidate`, `Application`, `FeePayment`.

Minimum metrics:
- Total advertisements by status
- Total candidates registered
- Total applications submitted
- Total fee payments by status

---

### 8. Seed Scripts

| Script | Purpose |
|--------|---------|
| `Server/scripts/seedMasters.js` | Populate MasterData (gender, category, qualification, marital status, ph_type, language, payment_mode) + Country/State/City |
| `Server/scripts/seedMenusAndRoles.js` | Menu tree + default SUPER_ADMIN role with full permissions |

---

## Acceptance Criteria

- `node server.js` starts with no errors and no WhatsApp-related imports
- `GET /api/v1/advertisements` returns 200
- `GET /api/v1/candidates` (admin session) returns 200
- `POST /api/v1/advertisements` with missing required fields returns 422 with per-field error details
- `GET /api/v1/candidates` without a session returns 401
- `node scripts/seedMasters.js` completes without errors; MasterData documents visible in DB
- All endpoints listed above reachable in Swagger UI at `/api-docs`

> Frontend integration is out of scope for this phase. Swagger UI or Postman is the only required test surface.

---

## Security Checklist

- [ ] Aadhaar: only SHA-256 hash stored; raw Aadhaar never persisted or logged
- [ ] Candidate passwords: bcrypt (cost ≥ 12)
- [ ] Employee passwords: bcrypt (cost ≥ 12)
- [ ] File uploads: `secureUpload` middleware applied to photo and signature endpoints
- [ ] All write endpoints have `express-validator` chains
- [ ] `authMiddleware` applied on all non-public routes
- [ ] No `organizationId` or `tenant_id` on any model
- [ ] `WhatsAppConfig.js`, `WhatsAppMessage.js`, and `whatsapp.routes.js` deleted
