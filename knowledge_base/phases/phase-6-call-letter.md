# Phase 6: Call Letter / Admit Card Module (M5)

| Field | Value |
|-------|-------|
| **Phase** | 6 of 9 |
| **Status** | 🔴 Not Started |
| **Depends On** | Phase 5 (fee = Paid required for eligibility) · Phase 7 (admin must publish before citizen can download) |
| **Blocks** | Nothing (leaf module) |
| **PRD Sections** | §5 M5 Call Letter · §9.3 Authorization · §9.13 Business Logic |

> **Backend-first:** This phase builds call letter eligibility check and signed-token download. The citizen-facing download page is deferred to **Frontend Binding**.

> **Definition of Done** is defined in Phase 1. Apply those criteria here.

---

## Remaining Work

### 1. Call Letter Routes (`Server/routes/v1/callLetters.routes.js`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/call-letters/check` | POST | None | Check eligibility by Reg ID + DOB |
| `/api/v1/call-letters/:advt_no/download` | POST | Signed token | Serve call letter PDF |
| `/api/v1/call-letters/:advt_no/roll-numbers` | POST | Admin session | Upload roll number CSV |
| `/api/v1/call-letters/:advt_no` | PATCH | Admin session | Set `available_from`, `enabled` toggle |
| `/api/v1/call-letters/:advt_no/preview` | GET | Admin session | Admin preview of sample call letter |

---

### 2. Eligibility Check — 4 Conditions (all must pass server-side)

1. Application exists for `(registration_id, advt_no)`
2. `fee_payment.status = paid` for that application
3. `call_letter.enabled = true` for that `advt_no`
4. `call_letter.available_from <= now()`

Return per-condition failure reason if not eligible (e.g., `"fee_not_paid"`, `"not_yet_released"`, `"application_not_found"`). Identical response timing for all failure cases (enumeration prevention).

---

### 3. Signed Download Token Flow

The eligibility check endpoint returns a short-lived HMAC-signed token on success:

```
Token payload: { registration_id, advt_no, exp: now + 600 }
Signed with: CALL_LETTER_TOKEN_SECRET (in .env)
```

Download endpoint:
- Validates token signature and expiry before any processing
- Marks token as used (store hash in Redis or MongoDB with TTL) — single-use only
- Generates PDF call letter on-demand; streams to response
- Does not require a candidate session — token is the only auth mechanism

---

### 4. Call Letter PDF Generation

PDF contents:
- Candidate name, Registration ID, Roll Number
- Advertisement number, Post name
- Exam date, exam time, venue, reporting instructions
- Municipality branding (CompanyMaster logo + name)

All venue/name fields sanitized before template insertion (PDF injection prevention).

---

### 5. Roll Number CSV Upload

Admin uploads a CSV with columns: `registration_id`, `roll_number`.

Validation:
- All `registration_id` values must exist in DB — report invalid ones with row number
- All `registration_id` values must have `fee_payment.status = paid` — flag unpaid candidates
- Duplicate roll numbers within the same `advt_no` → reject entire upload with error list
- On success: upsert CallLetter records for each row

---

## Acceptance Criteria

- Eligible candidate (fee Paid + call letter enabled + available_from passed) → PDF downloaded via signed token
- Fee Pending → eligibility check returns failure reason `fee_not_paid`; no download possible
- `call_letter.enabled = false` → failure reason `not_yet_released`
- POST to download endpoint without valid signed token → 401
- POST to download endpoint with expired token → 401
- POST to download endpoint reusing a consumed token → 401 (single-use)
- Reg ID + wrong DOB → same response as "not eligible" (enumeration prevention)
- Roll number CSV with unpaid Reg IDs → upload rejected with list of offending rows
- All endpoints testable via Swagger UI / Postman — no frontend required

---

## Security Checklist

- [ ] All 4 eligibility conditions checked server-side on every download — never cached or client-gated
- [ ] Signed token: HMAC with `CALL_LETTER_TOKEN_SECRET`, 10-min expiry, single-use (consumed on first use)
- [ ] Fee bypass: direct POST to download without Paid status → rejected at eligibility check
- [ ] IDOR: Reg ID + DOB combination validated; cannot download another candidate's letter
- [ ] Enumeration: identical response time + message for Reg ID not found vs ineligible
- [ ] PDF: all candidate fields sanitized before insertion (PDF injection prevention)
- [ ] Download URL is a token-gated endpoint — not a guessable static file path

---

## Frontend Binding — Deferred

Pick up after backend phases 1–7 are complete.

| Work Item | File |
|-----------|------|
| Call letter eligibility lookup form (Reg ID + DOB) | `Web/src/pages/CallLetter/index.jsx` |
| Per-advertisement eligibility result + download button | `Web/src/pages/CallLetter/Result.jsx` |
