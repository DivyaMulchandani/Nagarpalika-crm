# Phase 5: Fee Payment Module (M4)

| Field | Value |
|-------|-------|
| **Phase** | 5 of 9 |
| **Status** | 🔴 Not Started |
| **Depends On** | Phase 4 (Application Ref No must exist before payment) · Phase 1 (FeePayment model) |
| **Blocks** | Phase 6 (Call Letter eligibility requires fee = Paid) |
| **PRD Sections** | §5 M4 Fee Payment · §9.9 Payment Security |

> **Gateway: Razorpay.** Online only — no DD, challan, or offline payment.

> **Backend-first:** This phase builds the full Razorpay integration and webhook handler. The payment frontend pages are deferred to **Frontend Binding**.

> **Definition of Done** is defined in Phase 1. Apply those criteria here.

---

## Remaining Work

### 1. FeePayment Model

`Server/models/Payment.js` (the HMS stub) must be replaced with the `FeePayment` model defined in Phase 1. Delete the old file; create `Server/models/FeePayment.js`.

---

### 2. Razorpay Service (`Server/services/razorpay.service.js`)

```javascript
// Functions to implement:
createOrder(applicationRefNo, amount, currency = 'INR')
  // Creates Razorpay order, returns { orderId, amount, currency, key }

verifyWebhookSignature(rawBody, signature, secret)
  // HMAC-SHA256 verify; returns boolean

getPaymentStatus(gatewayTxnId)
  // Fetch status from Razorpay API
```

Config in `Server/.env`:
```
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

---

### 3. Fee Payment Routes (`Server/routes/v1/feePayments.routes.js`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/fee-payments/status` | POST | None | Lookup pending/paid fees by Aadhaar hash or Reg ID |
| `/api/v1/fee-payments/initiate` | POST | Candidate session | Create Razorpay order → return `orderId` + `key` |
| `/api/v1/webhooks/razorpay` | POST | HMAC signature | Receive and process Razorpay payment webhook |
| `/api/v1/fee-payments/receipt/:payment_id` | GET | Candidate session | Download fee receipt PDF |
| `/api/v1/fee-payments` | GET | Admin session | List all payments (filterable by advt, status, date) |
| `/api/v1/fee-payments/reconciliation` | GET | Admin session | Total collected per advertisement + date range report |
| `/api/v1/fee-payments/:id/manual` | PATCH | Super Admin session | Manual verification override (feature-flagged) |

---

### 4. Webhook Handler (critical — implement carefully)

The webhook endpoint at `/api/v1/webhooks/razorpay` must:

1. **Verify HMAC signature first** — reject with 401 if missing or invalid before any processing
2. **Idempotency check** — if `gateway_txn_id` already processed, return 200 and skip
3. **Amount validation** — webhook `amount` must match `advt.application_fee` from DB (in paise)
4. **Application ref validation** — `application_ref_no` in webhook must exist in DB
5. **Status update** — set `fee_payment.status = paid`, record `paid_at`, store `webhook_payload`
6. **Receipt generation** — generate PDF receipt, store path in `receipt_path`
7. **Notify** — trigger email receipt notification (Phase 8 wires the full service; stub the call)

**Critical rule:** Never update payment status from the success/failure redirect URL — only from webhook.

---

### 5. Receipt PDF Service (`Server/services/receiptPdf.service.js`)

PDF contains:
- Receipt number (payment_id), transaction date
- Candidate name, Registration ID
- Advertisement number, post title
- Amount paid, payment mode, gateway transaction ID
- Municipality branding (CompanyMaster logo + name)

---

## Acceptance Criteria

- Fee amount sent to Razorpay is always read from `advt.application_fee` in DB — client-provided amount has zero effect
- Webhook without valid HMAC signature → 401, no processing
- Same webhook delivered twice → processed once (idempotency via `gateway_txn_id`)
- `GET /fee-payments/receipt/:payment_id` for another candidate's receipt → 403
- Failed payment: Application record intact; candidate can retry
- Successful payment: `fee_payment.status = paid` within normal webhook delivery time
- All endpoints testable via Swagger UI / Postman — no frontend required

---

## Security Checklist

- [ ] Fee amount: always from `advt.application_fee` in DB — never from client form or redirect params
- [ ] Webhook HMAC: `verifyWebhookSignature()` called before any DB read or write; missing signature → 401
- [ ] Webhook replay: `gateway_txn_id` idempotency check — second delivery returns 200 and stops
- [ ] Receipt IDOR: endpoint verifies `registration_id` in session matches payment owner
- [ ] Payment initiation: requires valid Application Ref No in DB (no phantom payments)
- [ ] No card data stored on server — redirect model only (PCI-DSS scope: SAQ A)
- [ ] Webhook endpoint bypasses session auth — uses HMAC only; all other routes require session

---

## Frontend Binding — Deferred

Pick up after backend phases 1–7 are complete.

| Work Item | File |
|-----------|------|
| Fee status lookup form (Aadhaar or Reg ID) | `Web/src/pages/Fee/index.jsx` |
| Razorpay checkout redirect flow | `Web/src/pages/Fee/Checkout.jsx` |
| Success and failure landing pages | `Web/src/pages/Fee/Success.jsx`, `Failure.jsx` |
| Receipt download button (on Paid entries) | `Web/src/pages/Fee/Receipt.jsx` |
