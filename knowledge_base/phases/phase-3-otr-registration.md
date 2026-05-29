# Phase 3: OTR Registration (M2 + M7 Auth)

| Field | Value |
|-------|-------|
| **Phase** | 3 of 9 |
| **Status** | 🔴 Not Started |
| **Depends On** | Phase 1 (Candidate model + OTP model + routes) · Phase 2 (public API verified) |
| **Blocks** | Phase 4 (Application requires valid Registration ID) |
| **PRD Sections** | §5 M2 OTR Registration · §5 M7 Authentication · §9.1 Auth · §9.2 OTP · §9.3 Authorization |

> **Backend-first:** This phase builds all candidate registration and auth API endpoints. The 10-step frontend OTR flow is deferred to **Frontend Binding** after backend phases are complete.

> **Definition of Done** is defined in Phase 1. Apply those criteria here.

---

## Remaining Work

### 1. Candidate Auth Routes (`Server/routes/v1/candidates.routes.js`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/candidates/auth/login` | POST | None | Login with Registration ID (or Aadhaar hash) + password |
| `/api/v1/candidates/auth/logout` | POST | Candidate session | Invalidate session |
| `/api/v1/candidates/auth/password/reset` | POST | OTP-verified | Reset password via OTP |

**Session rules:**
- New session ID generated on every login (session fixation prevention)
- Max 1 active session per candidate — previous session invalidated on new login
- 30-min inactivity timeout enforced server-side

---

### 2. OTP Delivery (extend existing `/api/v1/otp`)

The OTP model from Phase 1 supports mobile and email targets. Extend the controller with candidate-specific rate limiting:

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/otp/send` | POST | None | Send OTP to mobile (SMS) or email |
| `/api/v1/otp/verify` | POST | None | Verify OTP code |

**OTP security rules — all enforced in controller:**
- Max 3 OTP requests per phone/email per hour
- Max 3 failed verification attempts before OTP invalidated (`attempts` field on Otp model)
- OTP expires after 10 minutes (TTL index auto-deletes; controller validates `createdAt`)
- OTP value must never appear in any server log or response body
- Constant-time string comparison (prevent timing attacks)

**OTP delivery channels:**
- Mobile OTP: SMS gateway (`SMS_API_URL`, `SMS_API_KEY`, `SMS_SENDER_ID` in `.env`)
- Email OTP: email service (Phase 8 wires the full service; stub the function call here)

> UIDAI Aadhaar OTP (AUA empanelment) is an external dependency. Until UIDAI credentials are obtained, treat Aadhaar verification as a standard OTP delivered to the Aadhaar-linked mobile. Mark as deferred external dependency in code comments.

---

### 3. Candidate Registration Routes

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/candidates/register/step` | POST | Step session | Save one step's data server-side (step ID in body) |
| `/api/v1/candidates/register/photo` | POST | Step session | Upload candidate photo (`secureUpload` middleware) |
| `/api/v1/candidates/register/signature` | POST | Step session | Upload candidate signature (`secureUpload` middleware) |
| `/api/v1/candidates/register/submit` | POST | Step session | Finalize registration → issue Registration ID |
| `/api/v1/candidates/register/resume` | GET | Step session | Return current step + saved data (for page-refresh recovery) |

**Step session:** A temporary session key created after Aadhaar OTP verification (step 1). All subsequent steps attach to this key. `submit` converts to a full Candidate record and clears the step session.

**Business logic (all server-side):**
- `aadhaar_hash` (SHA-256) must be unique — 409 if already registered
- `registration_id` auto-generated via Counter model: `ORGCODE/YEAR/SEQ`
- `edit_window_expires_at = submitted_at + 48h` (configurable via CompanyMaster or env)
- Locked fields after submit: `aadhaar_hash`, `dob`, `name` — 422 if sent in edit
- Photo: JPEG only, max 50 KB, magic-byte validated by `secureUpload`
- Signature: JPEG only, max 20 KB

---

### 4. Candidate Edit + Find Routes

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/candidates/edit` | PATCH | Candidate session | Edit allowed fields (communication, photo, signature, languages) |
| `/api/v1/candidates/find` | POST | None | Find Reg ID by mobile + DOB or Aadhaar hash + DOB |

**Edit rules:**
- Controller checks `edit_window_expires_at > now()` — rejects with 400 + expiry timestamp if window closed
- Editable: `address_current`, `address_permanent`, `mobile`, `email`, `photo_path`, `signature_path`, `languages`
- Locked: `aadhaar_hash`, `dob`, `name` — 422 if included in PATCH body
- OTP re-confirmation to registered mobile required before saving

**Find rules:**
- Registration ID NOT returned in response body — delivered to registered mobile + email only
- Identical response shape and delay for "not found" vs "found" (enumeration prevention)

---

### 5. Admin-Facing Candidate Routes (for Phase 7 Admin APIs)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/candidates` | GET | Admin session | List candidates (searchable by name, Reg ID; filterable by category, otr_status) |
| `/api/v1/candidates/:id` | GET | Admin session | View full OTR profile (read-only) |
| `/api/v1/candidates/export` | POST | Super Admin session | Export to CSV/Excel; auto-logged in audit trail |

---

### 6. Business Logic Reference

| Rule | Enforcement |
|------|------------|
| 1 Aadhaar = 1 Registration ID | DB unique index on `aadhaar_hash` |
| Aadhaar never stored raw | Controller SHA-256 hashes before any DB write or comparison |
| Step state survives browser close | Persisted server-side via connect-mongo session |
| Registration ID not displayed on screen | Delivered via SMS + email only; never in API response |
| Duplicate mobile/email prevention | Unique index on `mobile` and `email` in Candidate model |

---

## Acceptance Criteria

- Full registration flow completable end-to-end via Postman: Aadhaar OTP → step data saved → submit → Registration ID issued
- Duplicate Aadhaar hash → 409 with clear error
- Photo > 50 KB or non-JPEG → 422 rejected server-side (not client-only)
- Edit after `edit_window_expires_at` → 400 with expiry timestamp in response
- `POST /candidates/auth/login` → session cookie with HttpOnly + Secure + SameSite=Strict
- 5 failed logins → 15-min account lockout enforced server-side
- `POST /candidates/find` response is identical body/timing whether Reg ID exists or not
- All endpoints testable via Swagger UI — no frontend required

---

## Security Checklist

- [ ] Aadhaar: SHA-256 hash only; raw Aadhaar never in DB, never in logs, never in any response
- [ ] OTP: 6 digits, 10-min TTL, max 3 attempts, rate-limited 3 req/hour/phone, never logged
- [ ] Photo/signature: magic-byte MIME check, Sharp re-encoding, stored outside webroot, UUID filename
- [ ] Session fixation: new session ID on every login
- [ ] Brute force: 5 failed logins → 15-min lockout (server-side)
- [ ] Edit window: enforced via `edit_window_expires_at` timestamp — no UI-only gating
- [ ] Constant-time OTP comparison (prevent timing attacks)
- [ ] Enumeration prevention: same response for valid vs invalid Aadhaar on OTP request

---

## Frontend Binding — Deferred

Pick up after backend phases 1–7 are complete.

| Work Item | File |
|-----------|------|
| 10-step OTR registration flow | `Web/src/pages/Registration/` |
| Edit Registration page | `Web/src/pages/Registration/Edit.jsx` |
| Find Registration ID page | `Web/src/pages/Registration/Find.jsx` |
| Login modal (M7) with session management | `Web/src/components/LoginModal.jsx` |
