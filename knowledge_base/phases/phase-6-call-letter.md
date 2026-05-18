# Phase 6: Call Letter / Admit Card Module (M5)

| Field | Value |
|-------|-------|
| **Phase** | 6 of 9 |
| **Status** | Not Started |
| **Depends On** | Phase 5 (fee = Paid required for eligibility) · Phase 7 (admin must publish call letter before download is live) |
| **Blocks** | Nothing (leaf module) |
| **PRD Sections** | §5 M5 Call Letter · §9.3 Authorization · §9.13 Business Logic |

---

## Goal

Allow eligible citizens to download their call letter (admit card) PDF. Eligibility is triple-gated server-side: fee paid + application submitted + admin has enabled call letter for that advertisement. No client-side eligibility check is sufficient.

---

## Deliverables

### Call Letter Page (`/callletter`)

**Replaces** current static `CallLetter.jsx` (exam list + centre info).

- [ ] Entry form: Registration ID + Date of Birth (no login required)
- [ ] Server checks eligibility for every advertisement the citizen applied to:
  1. Application exists for `(registration_id, advt_no)` — server lookup
  2. Fee payment status = Paid for that application — DB check
  3. Admin has set `call_letter.enabled = true` for that `advt_no` — DB check
  4. Current timestamp ≥ `call_letter.available_from` — DB check
- [ ] If all 4 conditions met: show download button per eligible advt
- [ ] If any condition fails: show specific reason (e.g. "Fee not paid" / "Call letter not yet released")
- [ ] Download: serve call letter PDF from secure endpoint (not public URL)

### Call Letter PDF Contents
- Candidate name
- Registration ID
- Roll number (assigned by admin via CSV upload)
- Advertisement number
- Post name
- Exam date · time · venue
- Reporting instructions
- Municipality branding

### API Endpoints (Backend)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/callletter/check` | POST | None | Check eligibility by Reg ID + DOB |
| `/api/v1/callletter/:advt_no/download` | POST | Signed token | Serve call letter PDF |

**Signed token flow**: eligibility check returns a short-lived signed download token (10-minute expiry) per `(registration_id, advt_no)` — download endpoint validates token, not session.

---

## Acceptance Criteria

- Citizen with fee Paid + call letter published → PDF downloads successfully
- Citizen with fee Pending → download button not shown; clear error displayed
- Call letter not yet published by admin → download button not shown; clear error displayed
- Direct API call to download endpoint without valid signed token → 401
- Registration ID + wrong DOB → no eligibility data returned (same response as "not eligible")
- Roll number shows correctly from admin CSV upload (Phase 7 admin module)

---

## Security Checklist (Pentest Targets for This Phase)

- [ ] Eligibility check server-side on every download — not cached or client-gated
- [ ] Signed download token: short-lived (10 min), single-use, HMAC-signed with server secret
- [ ] Fee bypass: direct POST to download endpoint without Paid fee status → rejected
- [ ] IDOR: citizen cannot download another citizen's call letter by guessing Registration ID
- [ ] Registration ID + wrong DOB: identical response time and message as "not found" (enumeration prevention)
- [ ] Call letter PDF: if HTML-to-PDF, venue/name fields sanitized to prevent PDF injection
- [ ] Download endpoint: not a public URL — requires valid token; file not accessible via direct file path
