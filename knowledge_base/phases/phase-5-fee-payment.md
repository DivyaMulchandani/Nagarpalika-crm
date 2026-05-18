# Phase 5: Fee Payment Module (M4)

| Field | Value |
|-------|-------|
| **Phase** | 5 of 9 |
| **Status** | 🔴 Not Started |
| **Depends On** | Phase 4 (Application Ref No must exist before payment) · Phase 1 (FeePayment model) |
| **Blocks** | Phase 6 (Call Letter eligibility requires fee = Paid) |
| **PRD Sections** | §5 M4 Fee Payment · §9.9 Payment Security |
| **Open Questions** | #2 (online only vs DD/challan), #7 (payment gateway choice) |

---

## Already Built ✅

| Item | Location |
|------|----------|
| Payment model stub (Invoice/Patient refs stripped, ready for rebuild) | `Server/models/Payment.js` |
| express-session (for payment initiation auth) | `Server/server.js` |
| WhatsApp send (for fee receipt notification) | `Server/services/whatsapp.service.js` |
| Nodemailer (for fee receipt email with PDF) | Installed in `Server/package.json` |
| Secure file storage (for receipt PDFs) | `Server/middlewares/secureUpload.js` — storage pattern |

> ⚠️ **Open Question #7**: Payment gateway not selected (Razorpay / PayGov / Paytm / state portal). Build with gateway adapter pattern — provider swappable by config. Open Question #2 (offline DD/challan) — scaffold manual verification endpoint behind feature flag.

---

## Remaining Work 🔴

### Rebuild `Server/models/FeePayment.js`

Rename/replace `Payment.js` stub with full FeePayment model (see Phase 1 schema).

### Backend (`Server/routes/v1/feePayments.routes.js`)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/fee-payments/status` | POST | None | Lookup pending fees by Aadhaar or Reg ID |
| `/api/v1/fee-payments/initiate` | POST | Candidate session | Create gateway order → return redirect URL |
| `/api/v1/webhooks/payment` | POST | HMAC signature | Receive gateway payment notification |
| `/api/v1/fee-payments/receipt/:payment_id` | GET | Candidate session | Download fee receipt PDF |

#### Gateway Adapter Pattern
```javascript
// Server/services/paymentGateway.service.js
export const createOrder(applicationRefNo, amount, currency = 'INR')
export const verifyWebhookSignature(payload, signature, secret)
export const getPaymentStatus(gatewayTxnId)
```
Config selects provider: `PAYMENT_GATEWAY_PROVIDER=razorpay|paygov|paytm` in `.env`.

#### Webhook Handler (critical security)
- Verify HMAC signature **before** any processing — reject if invalid (401)
- Idempotency: check `gateway_txn_id` already processed → skip if yes
- Validate `amount` in webhook matches `advt.application_fee` in DB
- Validate `application_ref_no` in webhook exists in DB for correct tenant
- On valid: set `fee_payment.status = paid`, generate receipt PDF, trigger WhatsApp + email notification
- Never update DB from success/failure return URL — only from webhook

### Frontend (`Web/src/pages/Fee/`)

- Entry: Aadhaar **or** Registration ID (no login required for lookup)
- Display: list of applied posts with payment status (Paid / Pending) per post
- Select pending posts → "Pay Fee" button
- Server creates gateway order → client redirects to gateway
- `/fee/success` and `/fee/failure` pages: display only, no DB update
- Fee receipt download button on Paid entries

---

## Acceptance Criteria

- Fee amount sent to gateway read from DB by Advt No — client-modified amount has no effect
- Webhook without valid HMAC → 401 rejected, not processed
- Same webhook delivered twice → processed once (idempotency)
- Candidate cannot download another candidate's receipt (session + ownership check)
- Failed payment: application record intact; user can retry
- Successful payment: status changes to Paid within 10s of webhook receipt

---

## Security Checklist

- [ ] Fee amount: always from `advt.application_fee` in DB — never from client form field
- [ ] Webhook HMAC: missing or invalid signature → 401
- [ ] Webhook replay: `gateway_txn_id` idempotency key in DB
- [ ] Receipt IDOR: endpoint verifies `registration_id` matches session
- [ ] Payment initiation: requires valid Application Ref No in DB
- [ ] No card data stored on server (PCI-DSS scope: redirect model only)
- [ ] CSRF token on fee initiation form
