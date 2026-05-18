# Phase 3: OTR Registration (M2 + M7 Auth)

| Field | Value |
|-------|-------|
| **Phase** | 3 of 9 |
| **Status** | Not Started |
| **Depends On** | Phase 1 (DB, multi-tenant, API skeleton) · Phase 2 (nav restructure) |
| **Blocks** | Phase 4 (Application requires valid Registration ID) |
| **PRD Sections** | §5 M2 OTR Registration · §5 M7 Authentication · §9.1 Auth · §9.2 OTP · §9.3 Authorization |
| **Open Questions** | #1 (edit window), #3 (Aadhaar method), #9 (WhatsApp BSP) |

---

## Goal

Implement the full One Time Registration (OTR) flow — 10-step citizen onboarding with Aadhaar verification, OTP delivery, profile creation, and login. One Aadhaar = one Registration ID per tenant. Also implements the Login modal (M7).

---

## Deliverables

### Registration Flow — 10 Steps (`/registration/apply`)

| Step | Route | Key Implementation |
|------|-------|--------------------|
| 1 | `/registration/apply/instructions` | Bilingual instruction page. "I Agree" button disabled until user scrolls to bottom. Gate enforced client + server (session flag). |
| 2 | `/registration/apply/aadhaar` | Aadhaar input → UIDAI OTP API → verify. Separate phone OTP (WhatsApp → SMS fallback after 30s). Password creation with policy enforcement. |
| 3 | `/registration/apply/personal` | Name, Father/Husband name, DOB, gender, category (General/OBC/SC/ST/EWS), nationality, religion |
| 4 | `/registration/apply/communication` | Permanent + current address, OTP-verified mobile, optional alt mobile, OTP-verified email |
| 5 | `/registration/apply/other` | Marital status, PH status (type + % if yes), ex-serviceman status, highest qualification |
| 6 | `/registration/apply/language` | Languages known: Read/Write/Speak checkboxes per language; mother tongue |
| 7 | `/registration/apply/photo` | Upload JPG/JPEG, max 50 KB, 3.5×4.5 cm. Preview + re-upload option. |
| 8 | `/registration/apply/signature` | Upload JPG/JPEG, max 20 KB, 3.5×1.5 cm. Preview + re-upload option. |
| 9 | `/registration/apply/declaration` | Bilingual declaration text. Checkbox required to proceed. |
| 10 | `/registration/apply/submit` | Image CAPTCHA (server-side verified) → submit → Registration ID displayed + sent via SMS + email |

**Step persistence**: Multi-step form state saved server-side per session — user can resume if browser closes after Aadhaar verification.

### Edit Registration (`/registration/edit`)
- [ ] Access: Registration ID + DOB **or** Aadhaar + OTP
- [ ] Server checks edit window: `created_at + edit_window_hours < now()` — reject if expired
- [ ] Editable fields: communication details, photo, signature, language details
- [ ] Locked fields (read-only UI + server rejects changes): Aadhaar number, DOB, name
- [ ] Any save triggers OTP confirmation to registered mobile

### Find Registration ID (`/registration/find`)
- [ ] Input: Mobile + DOB **or** Aadhaar + DOB
- [ ] OTP verification before revealing Registration ID
- [ ] Registration ID delivered to registered mobile + email (not displayed on screen)

### Authentication — Login Modal (M7)
- [ ] Triggered from nav "Login / Register" button
- [ ] Fields: Registration ID **or** Aadhaar + Password
- [ ] On success: session created (HttpOnly + Secure + SameSite=Strict cookie)
- [ ] New session ID issued on login (session fixation prevention)
- [ ] Max 1 concurrent session per user (new login invalidates previous session)
- [ ] "Forgot Password": OTP to registered mobile/email → reset form
- [ ] Session timeout: 30 minutes inactivity

### API Endpoints (Backend)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/registration/otp/aadhaar` | POST | None | Request Aadhaar OTP via UIDAI |
| `/api/v1/registration/otp/aadhaar/verify` | POST | None | Verify Aadhaar OTP |
| `/api/v1/registration/otp/phone` | POST | None | Send phone OTP (WhatsApp → SMS) |
| `/api/v1/registration/otp/phone/verify` | POST | None | Verify phone OTP |
| `/api/v1/registration/otp/email` | POST | None | Send email OTP |
| `/api/v1/registration/otp/email/verify` | POST | None | Verify email OTP |
| `/api/v1/registration/apply` | POST | Session (step 2+) | Submit each step's data |
| `/api/v1/registration/apply/photo` | POST | Session | Upload photo (multipart) |
| `/api/v1/registration/apply/signature` | POST | Session | Upload signature (multipart) |
| `/api/v1/registration/apply/submit` | POST | Session | Final submit with CAPTCHA token |
| `/api/v1/registration/edit` | PATCH | Session / OTP | Edit allowed fields only |
| `/api/v1/registration/find` | POST | None | Find Reg ID by mobile+DOB or Aadhaar+DOB |
| `/api/v1/auth/login` | POST | None | Login with Reg ID/Aadhaar + password |
| `/api/v1/auth/logout` | POST | Session | Invalidate session |
| `/api/v1/auth/password/reset` | POST | OTP | Reset password |

---

## Acceptance Criteria

- 10-step flow completes end-to-end: Aadhaar OTP → Registration ID issued
- Same Aadhaar submitted twice → second attempt rejected with clear error
- Photo > 50 KB or non-JPG → rejected server-side
- Signature > 20 KB or non-JPG → rejected server-side
- Edit after window expires → rejected with timestamp reason
- Login with correct credentials → session cookie set (HttpOnly, Secure, SameSite=Strict)
- 6 failed logins within 10 minutes → account locked 15 minutes
- Registration ID NOT displayed on Find page — delivered via SMS/email only

---

## Security Checklist (Pentest Targets for This Phase)

- [ ] Aadhaar number: never stored in DB; only Verhoeff-validated hash stored
- [ ] OTP: 6 digits, 5-min expiry, max 3 attempts, rate-limited (3/hour/phone), not in logs
- [ ] Photo/signature: magic-byte MIME check server-side; re-encoded to strip metadata; stored outside webroot; UUID filename
- [ ] Session fixation: new session ID on every login
- [ ] Brute force: 5 failed attempts → 15-min lockout; lockout enforced server-side, not cookie-based
- [ ] Edit window: enforced server-side via `created_at` timestamp, not client-submitted value
- [ ] CSRF tokens on all registration form submissions
- [ ] CAPTCHA: token verified server-side against provider API before processing step 10
- [ ] Aadhaar OTP endpoint: rate-limited; same response time for valid and invalid Aadhaar (enumeration prevention)
- [ ] Password reset: OTP-only; no security questions; new password cannot equal last 3 passwords
