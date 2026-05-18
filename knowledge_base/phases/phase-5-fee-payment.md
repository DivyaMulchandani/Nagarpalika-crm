# Phase 5: Fee Payment Module (M4)

| Field | Value |
|-------|-------|
| **Phase** | 5 of 9 |
| **Status** | Not Started |
| **Depends On** | Phase 4 (Application Ref No must exist before payment) |
| **Blocks** | Phase 6 (Call Letter eligibility requires fee = Paid) |
| **PRD Sections** | §5 M4 Fee Payment · §9.9 Payment Security |
| **Open Questions** | #2 (online only vs DD/challan), #7 (payment gateway choice) |

---

## Goal

Allow citizens to pay application fees online via payment gateway (UPI / Net Banking / Debit+Credit card). Fee status updated only after verified gateway webhook. PDF receipt generated on success.

> ⚠️ **Open Question #7**: Payment gateway not yet selected (Razorpay / PayGov / Paytm / state portal). Implement gateway adapter pattern so provider can be swapped by config.
> ⚠️ **Open Question #2**: Offline DD/challan payment TBD — scaffold manual verification endpoint but leave gated behind feature flag.

---

## Deliverables

### Fee Payment Page (`/fee`)

- [ ] Entry: Aadhaar number **or** Registration ID (no login required for lookup; show masked data)
- [ ] Display list of applied posts with payment status per post:
  - Post name · Advt No · Fee amount · Status (Paid / Pending)
- [ ] Checkbox selection of pending posts → "Pay Fee" button
- [ ] On "Pay Fee": server initiates gateway session → redirect to gateway payment page
- [ ] **Fee amount read from DB by Advt No** — never from client-submitted field

### Gateway Integration
- [ ] Adapter pattern: `PaymentGateway` interface with provider-specific implementation
- [ ] Gateway redirect: server creates payment order → returns signed redirect URL → client redirects
- [ ] Success/failure pages: `/fee/success` and `/fee/failure` (display only; do NOT update DB from these)
- [ ] **DB update triggered only by webhook** — not by return URL (prevents bypass)

### Webhook Handler (`POST /api/v1/webhooks/payment`)
- [ ] Verify gateway HMAC signature on every webhook call — reject if invalid
- [ ] Idempotency: check if `payment_id` already processed; skip if yes (prevent double-credit)
- [ ] Validate: `amount` in webhook matches `advt.fee` in DB for that Application Ref No
- [ ] Validate: `application_ref_no` in webhook exists in DB for correct tenant
- [ ] On valid payment: set `fee_payment.status = Paid`, record `gateway_txn_id`, generate receipt PDF
- [ ] Receipt PDF stored in tenant file storage; path saved in `fee_payment.receipt_path`

### Fee Receipt
- [ ] Downloadable PDF receipt at `/fee/receipt/:payment_id`
- [ ] Requires authenticated session matching the Registration ID of that payment
- [ ] Receipt contains: candidate name · Registration ID · Advt No · post name · amount · payment date · gateway transaction ID

### Offline Payment (Feature-Flagged)
- [ ] Manual fee verification endpoint for admin (Phase 7 Admin Panel)
- [ ] Gated behind `enable_offline_payment` config flag per tenant
- [ ] Off by default until open question #2 resolved

### API Endpoints (Backend)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/fee/status` | POST | None | Lookup pending payments by Aadhaar or Reg ID |
| `/api/v1/fee/initiate` | POST | Session | Create gateway order, return redirect URL |
| `/api/v1/webhooks/payment` | POST | HMAC | Receive gateway payment notification |
| `/api/v1/fee/receipt/:payment_id` | GET | Session | Download fee receipt PDF |

---

## Acceptance Criteria

- Fee amount displayed and sent to gateway is always from DB — modifying it in browser dev tools has no effect
- Webhook without valid HMAC signature → 400 rejected, not processed
- Same payment webhook delivered twice → processed once only (idempotency)
- Citizen cannot download another citizen's receipt (auth check on receipt endpoint)
- Failed payment: application record intact; user can retry payment
- Successful payment: status changes to Paid within 10 seconds of webhook receipt

---

## Security Checklist (Pentest Targets for This Phase)

- [ ] Fee bypass: direct call to call letter endpoint without Paid status → rejected (Phase 6 enforces this)
- [ ] Fee amount tampering: client-modified amount in gateway redirect payload → gateway rejects (amount set server-side)
- [ ] Webhook HMAC: missing or invalid signature → webhook rejected with 401
- [ ] Webhook replay: same `payment_id` submitted twice → second ignored (idempotency key in DB)
- [ ] Receipt IDOR: receipt endpoint verifies `registration_id` matches authenticated session
- [ ] Payment initiation without valid Application Ref No → 404
- [ ] No card data stored anywhere on application server (PCI-DSS scope: redirect model only)
- [ ] CSRF token on fee initiation form
