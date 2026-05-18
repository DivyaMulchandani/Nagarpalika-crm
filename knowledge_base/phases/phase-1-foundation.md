# Phase 1: Foundation & Infrastructure

| Field | Value |
|-------|-------|
| **Phase** | 1 of 9 |
| **Status** | Not Started |
| **Depends On** | None |
| **Blocks** | All other phases |
| **PRD Sections** | §4 Deployment Architecture · §6 Data Model · §9.14 Infrastructure Security |

---

## Goal

Establish the base architecture: multi-tenant server, isolated DB schemas per municipality, REST API skeleton, auth middleware, and CI/CD pipeline. Nothing citizen-facing ships in this phase — it is purely infrastructure and plumbing.

---

## Deliverables

### Server & Networking
- [ ] Linux server provisioned (municipality IT)
- [ ] Two subdomains configured: `patan.domain.gov.in` · `palanpur.domain.gov.in`
- [ ] SSL certificates installed (TLS 1.2+ minimum; TLS 1.0/1.1 disabled)
- [ ] Firewall rules: only ports 80 and 443 exposed publicly
- [ ] SSH: key-based auth only, password SSH disabled

### Multi-Tenant Architecture
- [ ] Single codebase, tenant resolved from `Host` header at request time
- [ ] `tenant_id` injected into every request context by middleware — never from user input
- [ ] DB schema created for `patan_db` and `palanpur_db` (isolated, no cross-schema queries)
- [ ] Per-tenant file storage directories (photos, signatures, PDFs) outside webroot
- [ ] Config system: per-tenant values (subdomain, branding, DB connection, notification credentials)

### Database
- [ ] All 7 entities created with correct schema (see PRD §6)
- [ ] Every table includes `tenant_id` column with NOT NULL constraint
- [ ] Indexes on: `aadhaar_hash + tenant_id` (unique), `registration_id`, `advt_no`, `application_ref_no`
- [ ] `aadhaar_hash + tenant_id` unique constraint — prevents duplicate registration
- [ ] `(registration_id, advt_no)` unique constraint on Application table
- [ ] Migrations system set up (versioned, reversible)

### REST API Skeleton
- [ ] API base structure with versioning (`/api/v1/`)
- [ ] `tenant_id` middleware: every request validated against known tenants; unknown `Host` rejected
- [ ] Auth middleware: JWT or session token validation on all protected endpoints
- [ ] Global error handler: generic messages to client, detailed errors logged server-side only
- [ ] No stack traces, DB schema, or internal paths in API error responses
- [ ] Request logging: timestamp, method, path, status, duration (no PII in access logs)

### Security Baseline
- [ ] All secrets (DB passwords, API keys) in environment variables — not in source code
- [ ] `.env` in `.gitignore`; no secrets ever committed
- [ ] Dependency lockfiles committed; no High/Critical CVE packages at launch
- [ ] Debug mode off in production config
- [ ] Security headers middleware installed: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

### Audit Logging
- [ ] Append-only audit log table (separate from application logs)
- [ ] No admin can DELETE from audit log table (DB-level permission)
- [ ] Log retention policy: 1 year minimum

---

## Acceptance Criteria

- `patan.domain.gov.in` and `palanpur.domain.gov.in` both respond with 200 on HTTPS
- API call with unknown `Host` header returns 400/404
- API call with `tenant_id` from Patan cannot read Palanpur DB rows (integration test)
- SSL Labs grade: A or above
- No secrets found in git history

---

## Security Checklist (Pentest Targets for This Phase)

- [ ] Host header injection: unknown Host returns error, not default tenant data
- [ ] Cross-tenant DB query: impossible via any API endpoint
- [ ] Firewall: DB port not reachable from public internet
- [ ] TLS: 1.0/1.1 disabled; weak ciphers disabled
- [ ] No `.env` or config files accessible via HTTP
