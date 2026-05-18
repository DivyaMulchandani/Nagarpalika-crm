# Phase 8: Notification System

| Field | Value |
|-------|-------|
| **Phase** | 8 of 9 |
| **Status** | 🟡 Partially Complete — infrastructure done, recruitment triggers missing |
| **Depends On** | Phase 1 (recruitment models needed for trigger functions) · Phase 3 (OTP events) |
| **Blocks** | Phase 9 (notifications tested in security audit) |
| **PRD Sections** | §7 Notification System · §9.2 OTP Security |
| **Open Questions** | #9 (WhatsApp BSP registration — municipality must act first) |

---

## Already Built ✅

| Item | Location |
|------|----------|
| WhatsApp Cloud API integration (Meta Graph API v21.0) | `Server/services/whatsapp.service.js` |
| WhatsApp config (DB-driven: phoneNumberId, accessToken, isEnabled, triggers) | `Server/models/WhatsAppConfig.js` |
| WhatsApp message log (delivery status, retry tracking, webhook updates) | `Server/models/WhatsAppMessage.js` |
| WhatsApp send + broadcast + webhook + retry + stats routes | `Server/routes/v1/whatsapp.routes.js` |
| Retry logic (exponential backoff, max 3 retries, nextRetryAt) | `Server/services/whatsapp.service.js` |
| Meta webhook verification (GET) + delivery status updates (POST) | `Server/controllers/v1/whatsapp.controller.js` |
| Bulk broadcast function (generic recipients, rate-limited) | `Server/services/whatsapp.service.js` — `sendBulkBroadcast()` |
| OTP model (TTL-indexed, 10-min auto-expire) | `Server/models/Otp.js` |
| OTP send + verify + password-reset routes | `Server/routes/v1/otp.routes.js` |
| Email setup model + routes (SMTP config in DB) | `Server/models/EmailSetup.js` + routes |
| Email template model + routes | `Server/models/EmailTemplate.js` + routes |
| Email routing (EmailFor) | `Server/models/EmailFor.js` + routes |
| Nodemailer installed | `Server/package.json` |
| WhatsApp trigger enum updated to recruitment events | `Server/models/WhatsAppMessage.js` |

**Trigger types already in WhatsAppMessage schema:**
`otp_aadhaar`, `otp_phone`, `otp_email`, `registration_id_issued`, `application_submitted`, `fee_payment_receipt`, `call_letter_published`, `bulk_export_ready`, `custom`, `bulk_broadcast`

---

## Remaining Work 🔴

### 1. Recruitment Trigger Functions

Add to `Server/services/whatsapp.service.js` (once Phase 1 Candidate model exists):

```javascript
// OTP delivery (WhatsApp primary → SMS 30s fallback → Email)
export const sendOtpWhatsApp(recipientPhone, otp, purpose)

// Post-registration
export const sendRegistrationIdIssued(candidate)
// → "Your Registration ID is {reg_id}. Keep it safe for future applications."

// Application events
export const sendApplicationSubmitted(candidate, applicationRefNo, postTitle)
// → "Application submitted for {post}. Ref No: {ref_no}"

// Fee events
export const sendFeePaymentReceipt(candidate, payment, advtNo)
// → "Fee of ₹{amount} received for {post}. Receipt: {receipt_no}"

// Call letter
export const sendCallLetterPublished(candidate, advtNo, postTitle)
// → "Your call letter for {post} is ready. Download at: {portal_url}"

// Admin notifications
export const sendBulkExportReady(adminEmail, adminPhone, downloadLink, advtNo)
// → "Bulk export for Advt {advt_no} is ready. Download link valid 7 days: {link}"
```

### 2. SMS Fallback Implementation

WhatsApp → SMS (30-second fallback) is NOT wired yet:

- [ ] Integrate SMS gateway API (credentials from municipality via `Server/.env`: `SMS_API_URL`, `SMS_API_KEY`, `SMS_SENDER_ID`)
- [ ] After WhatsApp send: check delivery status after 30s
- [ ] If `deliveryStatus !== 'delivered'` → trigger SMS fallback
- [ ] Log SMS delivery separately or as a new WhatsAppMessage entry with `channel: 'sms'`

### 3. UIDAI Aadhaar OTP

OTP system exists but is NOT wired to UIDAI:

- [ ] Integrate UIDAI AUA API (credentials: `UIDAI_AUA_CODE`, `UIDAI_ASA_LICENSE_KEY`, `UIDAI_API_URL`)
- [ ] On Aadhaar OTP request: call UIDAI API → UIDAI sends OTP to Aadhaar-registered mobile
- [ ] On verify: call UIDAI verification endpoint (OTP validated by UIDAI, not stored in our DB)
- [ ] Fallback: if UIDAI OTP undelivered, use own OTP to Aadhaar-registered number (if obtained from UIDAI data)

Note: UIDAI AUA empanelment must be arranged by municipality before this can be built.

### 4. Email Sending Service

Nodemailer is installed but no email sending service is wired:

- [ ] Create `Server/services/email.service.js`
- [ ] Read SMTP config from EmailSetup model (already exists)
- [ ] `sendEmail({ to, subject, html, attachments })` — generic send function
- [ ] Trigger emails on same events as WhatsApp (registration, fee receipt with PDF, call letter)

### 5. WhatsApp Admin UI (already exists — verify it works)

`Admin/src/pages/WhatsApp/WhatsAppMessages.jsx` exists. Verify:
- [ ] Config page connects to `PUT /api/v1/whatsapp/config`
- [ ] Test connection button works
- [ ] Message log shows recruitment trigger types (not HMS types)
- [ ] Send + broadcast work with `recipientPhone`/`recipients` (updated in cleanup)

---

## OTP Security Requirements (already partially built)

Current OTP model has:
- ✅ TTL index (10-min auto-expire)
- ✅ `attempts` field (track failed attempts)

Still needed:
- [ ] Rate limiting: max 3 OTP requests per phone/email per hour (enforce in controller, not just model)
- [ ] Max 3 verification attempts before OTP invalidated (check `attempts` field in verify controller)
- [ ] OTP value never logged (verify `Server/controllers/v1/otp.controller.js` doesn't log OTP)
- [ ] Constant-time comparison for OTP verification (prevent timing attacks)

---

## Notification Events Reference

| Event | WhatsApp | SMS (fallback) | Email | Attachment |
|-------|----------|----------------|-------|-----------|
| Aadhaar OTP | Primary | 30s fallback | — | — |
| Phone OTP | Primary | 30s fallback | — | — |
| Email OTP | — | — | Primary | — |
| Registration ID issued | ✓ | fallback | ✓ | — |
| Application submitted | ✓ | fallback | — | — |
| Fee payment receipt | ✓ | fallback | ✓ | Receipt PDF |
| Call letter published | ✓ | fallback | — | — |
| Bulk export ready (admin) | ✓ | — | ✓ | — |

---

## Acceptance Criteria

- OTP delivered via WhatsApp within 10 seconds under normal conditions
- SMS fallback triggers after 30s if no WhatsApp delivery receipt
- OTP expires after 5 minutes — verification after expiry rejected
- 4th OTP attempt (same OTP) → OTP invalidated
- 4th OTP request within 1 hour → rate limit error, no OTP sent
- OTP value never appears in any server log
- Fee receipt PDF attached to WhatsApp/email notification on payment success
- Bulk export notification contains HMAC-signed download link
