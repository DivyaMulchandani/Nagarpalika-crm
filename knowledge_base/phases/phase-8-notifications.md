# Phase 8: Email Notification System

| Field | Value |
|-------|-------|
| **Phase** | 8 of 9 |
| **Status** | 🔴 Not Started |
| **Depends On** | Phase 1 (EmailSetup, EmailTemplate models) · Phase 3 (OTP + registration events) · Phase 5 (payment events) |
| **Blocks** | Phase 9 (notifications tested in security audit) |
| **PRD Sections** | §7 Notification System · §9.2 OTP Security |

> **Scope:** Email notifications only. SMS is used for OTP delivery (wired in Phase 3 via SMS gateway). No WhatsApp integration.

> **Backend-first:** This phase builds the email service and wires it to all recruitment lifecycle events. No frontend work.

> **Definition of Done** is defined in Phase 1. Apply those criteria here.

---

## Remaining Work

### 1. Email Service (`Server/services/email.service.js`)

Create a generic email sending service backed by Nodemailer (already installed):

```javascript
// Functions to implement:
sendEmail({ to, subject, html, attachments })
  // Reads SMTP config from EmailSetup model (DB-driven config)
  // Falls back to .env SMTP config if no DB record found

sendTemplatedEmail(templateKey, to, variables)
  // Loads EmailTemplate by key, substitutes {{variable}} placeholders, calls sendEmail
```

Config loading order:
1. Read active `EmailSetup` record from DB
2. If none, use `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` from `.env`

---

### 2. OTP Email Delivery

**File:** `Server/controllers/v1/otp.controller.js`

When OTP target is `email`:
- Call `email.service.sendEmail()` with OTP code and expiry
- OTP value must never appear in any server log or email subject line
- Template: plain text only (no HTML) to maximize deliverability

---

### 3. Recruitment Lifecycle Email Triggers

Wire `email.service.sendTemplatedEmail()` at each recruitment event:

| Event | Trigger Location | Recipient | Template Key | Attachment |
|-------|-----------------|-----------|--------------|-----------|
| Registration ID issued | `candidates.controller.js` → submit | Candidate email | `registration_id_issued` | None |
| Application submitted | `applications.controller.js` → POST | Candidate email | `application_submitted` | None |
| Fee payment received | `webhooks/razorpay` handler | Candidate email | `fee_receipt` | Receipt PDF |
| Call letter published | `callLetters.controller.js` → PATCH enable | Candidate email | `call_letter_published` | None |
| Bulk ZIP export ready | `advertisements.controller.js` → ZIP done | Admin email | `bulk_export_ready` | None (link in body) |

Email body for each event must include the portal URL so candidates can take the next action.

---

### 4. Email Templates Seed

Add default templates to `Server/scripts/seedMasters.js` or a dedicated `seedEmailTemplates.js`:

| Key | Subject | Notes |
|-----|---------|-------|
| `registration_id_issued` | Your Registration ID | Include Reg ID, login instructions |
| `application_submitted` | Application Submitted | Include Application Ref No, post title |
| `fee_receipt` | Fee Payment Confirmation | Include amount, receipt no, advt no |
| `call_letter_published` | Your Call Letter is Ready | Include advt no, download instructions |
| `bulk_export_ready` | Bulk Export Ready | Include HMAC-signed download link |
| `otp` | Your OTP Code | OTP + expiry time; plain text preferred |

---

### 5. OTP Security Hardening (enforce in controller)

These rules must be verified/implemented in `Server/controllers/v1/otp.controller.js`:

- [ ] Max 3 OTP requests per phone/email per hour (rate-limited at controller, not just model)
- [ ] Max 3 failed verification attempts before OTP record deleted/invalidated
- [ ] OTP value never logged (audit the controller — no `console.log`, no error message containing OTP)
- [ ] Constant-time string comparison for OTP verification (use `crypto.timingSafeEqual`)

---

## Notification Events Reference

| Event | SMS | Email | Attachment |
|-------|-----|-------|-----------|
| Aadhaar / Phone OTP | Primary (SMS gateway) | Fallback if mobile unavailable | — |
| Email OTP | — | Primary | — |
| Registration ID issued | — | ✓ | — |
| Application submitted | — | ✓ | — |
| Fee payment receipt | — | ✓ | Receipt PDF |
| Call letter published | — | ✓ | — |
| Bulk export ready (admin) | — | ✓ | — |

---

## Acceptance Criteria

- `POST /api/v1/candidates/register/submit` → candidate receives email with Registration ID
- `POST /api/v1/applications` → candidate receives application confirmation email
- Razorpay webhook `payment.captured` → candidate receives fee receipt email with PDF attachment
- `PATCH /api/v1/call-letters/:advt_no` with `enabled: true` → candidate receives call letter notification email
- OTP email delivered within 30 seconds under normal SMTP conditions
- OTP expires after 10 minutes — verification after expiry returns 400
- 4th OTP verification attempt (same OTP) → OTP invalidated, returns 400
- 4th OTP request within 1 hour → rate limit error, no OTP sent
- OTP value never appears in any server log line

---

## Security Checklist

- [ ] OTP: never logged, never in error messages, constant-time comparison
- [ ] OTP rate limiting: 3 requests/hour per phone/email enforced in controller
- [ ] OTP max attempts: 3 failed verifications → OTP record deleted
- [ ] Email templates: no user-controlled content rendered as HTML (XSS via email)
- [ ] Receipt PDF: generated server-side with sanitized inputs only
- [ ] Bulk export email: HMAC-signed download link in body; link expires in 7 days
- [ ] SMTP credentials: stored in DB (EmailSetup) or `.env` — never hardcoded
