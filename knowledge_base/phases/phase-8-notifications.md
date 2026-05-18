# Phase 8: Notification System

| Field | Value |
|-------|-------|
| **Phase** | 8 of 9 |
| **Status** | Not Started |
| **Depends On** | Phase 3 (OTP infrastructure), Phase 7 (admin triggers notifications) |
| **Blocks** | Phase 9 (notifications tested as part of security audit) |
| **PRD Sections** | §7 Notification System · §9.2 OTP Security |
| **Open Questions** | #9 (WhatsApp BSP registration — municipality must act first) |

---

## Goal

Implement the full three-channel notification stack: WhatsApp Business API (primary) → SMS (fallback after 30s) → Email (SMTP). Covers OTP delivery, transactional notifications, and admin alerts. Channel priority configurable per tenant.

---

## Notification Events & Channels

| Event | Channels | Recipient |
|-------|----------|-----------|
| Aadhaar OTP | WhatsApp → SMS (30s fallback) | Citizen (UIDAI-registered mobile) |
| Phone OTP | WhatsApp → SMS (30s fallback) | Citizen (mobile being verified) |
| Email OTP | Email | Citizen (email being verified) |
| Registration ID issued | SMS + Email | Citizen |
| Application submitted | WhatsApp → SMS | Citizen |
| Fee payment receipt | WhatsApp → SMS + Email (receipt PDF) | Citizen |
| Call letter published | WhatsApp → SMS | Citizen |
| Bulk ZIP export ready | WhatsApp + Email (download link) | Admin |
| Admin login lockout | Email | Super Admin |
| 3 failed admin login alerts | Email | Super Admin |

---

## Deliverables

### Notification Service Architecture
- [ ] `NotificationService` with channel adapters: `WhatsAppAdapter`, `SMSAdapter`, `EmailAdapter`
- [ ] Channel priority config per tenant (stored in tenant config; overridable)
- [ ] Fallback logic: attempt WhatsApp → if undelivered after 30s → attempt SMS → log both outcomes
- [ ] Async delivery: notifications queued (job queue) — never block API response
- [ ] Retry logic: 3 attempts per channel before marking failed
- [ ] Delivery status logged: channel used, delivered/failed, timestamp (no OTP value in logs)

### WhatsApp Business API
- [ ] Integration with Meta-approved BSP (provider TBD; municipality must register — open question #9)
- [ ] Message templates pre-approved by Meta for each notification type
- [ ] OTP template: approved template format (static text + OTP placeholder)
- [ ] Webhook for delivery receipts: update delivery status in notification log
- [ ] Rate limits: respect BSP-imposed per-second send limits

### SMS Gateway
- [ ] Integration with contracted SMS gateway (API credentials from municipality)
- [ ] Fallback trigger: 30 seconds after WhatsApp delivery attempt with no delivery receipt
- [ ] DLT registration required for promotional SMS in India (municipality to handle)
- [ ] OTP SMS: approved DLT template

### Email (SMTP)
- [ ] SMTP relay integration (credentials from municipality)
- [ ] HTML email templates: bilingual (Gujarati + English)
- [ ] PDF attachment support for fee receipts and ZIP export links
- [ ] SPF + DKIM configured on sending domain

### OTP-Specific Requirements
- [ ] 6-digit OTP generated using cryptographically secure random number generator (`crypto.randomInt` or equivalent)
- [ ] OTP stored as bcrypt hash in DB (not plaintext) — verified on submission
- [ ] OTP expiry: 5 minutes (DB `expires_at` timestamp)
- [ ] Max attempts: 3 per OTP instance → OTP invalidated; new OTP required
- [ ] Rate limit: 3 OTP requests per phone/email per hour (tracked in DB or cache)
- [ ] OTP delivery: never in response body, never in URL, never in server logs

### API Endpoints (Backend)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/notifications/otp` | POST | None | Request OTP (rate-limited) |
| `/api/v1/notifications/otp/verify` | POST | None | Verify OTP (attempt-limited) |
| `/admin/api/notifications/delivery-log` | GET | Super Admin | View notification delivery log |

---

## Acceptance Criteria

- OTP delivered via WhatsApp within 10 seconds under normal conditions
- SMS fallback triggers exactly 30 seconds after WhatsApp attempt if no delivery receipt
- OTP expires after 5 minutes — submission after expiry rejected with clear message
- 4th OTP submission attempt (same OTP) → OTP invalidated; must request new one
- 4th OTP request within 1 hour for same phone → rate limit error; no OTP sent
- OTP value never appears in any server log file
- Fee receipt PDF attached to WhatsApp/email notification on payment success
- Notification delivery log accessible to Super Admin; citizens cannot access log

---

## Security Checklist (Pentest Targets for This Phase)

- [ ] OTP enumeration: same error message and response time for correct and incorrect OTP
- [ ] OTP brute force: max 3 attempts enforced server-side; cannot reset by starting new session
- [ ] OTP rate limit: 3/hour/phone enforced; cannot bypass by changing User-Agent or headers
- [ ] OTP in logs: grep application logs for 6-digit patterns — none should appear in context of OTP delivery
- [ ] OTP replay: used OTP rejected immediately (single-use, invalidated in DB on success)
- [ ] WhatsApp webhook: verify BSP-provided signature on delivery receipt webhooks
- [ ] SMS/WhatsApp phone number: only delivered to OTP-verified phone stored in DB — no client-supplied override
- [ ] Email attachments: receipt PDFs contain no executable content; filenames sanitized
