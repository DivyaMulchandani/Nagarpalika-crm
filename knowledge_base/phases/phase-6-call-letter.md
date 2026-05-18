# Phase 6: Call Letter / Admit Card Module (M5)

| Field | Value |
|-------|-------|
| **Phase** | 6 of 9 |
| **Status** | 🔴 Not Started |
| **Depends On** | Phase 5 (fee = Paid required for eligibility) · Phase 7 (admin must publish before citizen can download) |
| **Blocks** | Nothing (leaf module) |
| **PRD Sections** | §5 M5 Call Letter · §9.3 Authorization · §9.13 Business Logic |

---

## Already Built ✅

| Item | Location |
|------|----------|
| secureUpload middleware (for call letter PDF template upload by admin) | `Server/middlewares/secureUpload.js` |
| WhatsApp send (for "call letter published" notification) | `Server/services/whatsapp.service.js` |
| Session auth | `Server/middlewares/authMiddleware.js` |

---

## Remaining Work 🔴

### Backend (`Server/routes/v1/callLetters.routes.js`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/call-letters/check` | POST | None | Check eligibility by Reg ID + DOB |
| `/api/v1/call-letters/:advt_no/download` | POST | Signed token | Serve call letter PDF |

**Eligibility check — 4 server-side conditions (all must pass):**
1. Application exists for `(registration_id, advt_no, tenant_id)`
2. `fee_payment.status = paid` for that application
3. `call_letter.enabled = true` for that `advt_no`
4. `call_letter.available_from <= now()`

**Signed token flow:**
- Eligibility check returns short-lived HMAC-signed download token (10-minute expiry, single-use)
- Download endpoint: validates token, not session (so unauthenticated citizens can download)
- Token payload: `{ registration_id, advt_no, tenant_id, exp }`

**Call Letter PDF contents:**
- Candidate name · Registration ID · Roll Number · Advt No · Post Name
- Exam date · Exam time · Venue · Reporting instructions
- Municipality branding (logo, name)

### Frontend (`Web/src/pages/CallLetter/`)

Replaces current static `CallLetter.jsx`.

- Entry form: Registration ID + Date of Birth (no login required)
- Server returns eligibility per advertisement candidate applied to
- For each advt: if eligible → download button; if not → specific reason message
  - "Fee not paid" / "Call letter not yet released" / "Application not found"
- Download: use signed token → GET `/api/v1/call-letters/:advt_no/download?token=...`

---

## Acceptance Criteria

- Eligible candidate (fee Paid + call letter enabled) → PDF downloads
- Fee Pending → download not shown + clear error message
- Call letter not published by admin → download not shown + clear error
- Direct API call to download without valid signed token → 401
- Reg ID + wrong DOB → same response as "not eligible" (enumeration prevention)
- Roll number correct from admin CSV upload (Phase 7)

---

## Security Checklist

- [ ] All 4 eligibility conditions checked server-side on every download — not cached or client-gated
- [ ] Signed token: 10-min expiry, single-use (invalidated after first use), HMAC with server secret
- [ ] Fee bypass: direct POST to download without Paid status → rejected
- [ ] IDOR: Reg ID + DOB combination validated; cannot download another candidate's letter
- [ ] Enumeration: identical response time + message for Reg ID not found vs ineligible
- [ ] PDF: venue/name fields sanitized to prevent PDF injection
- [ ] Download URL: not a static file path — requires valid token
