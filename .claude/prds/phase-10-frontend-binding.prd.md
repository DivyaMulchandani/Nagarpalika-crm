# Phase 10: Frontend Binding & Admin Recruitment Pages

## Problem
All 9 backend phases deferred their frontend work. The project has working APIs but no UI
to operate them. Administrative staff cannot manage recruitment data, and citizens cannot
register, apply, pay fees, or download call letters. The system cannot go live without this layer.

## Evidence
- Phases 2–9 each contain a "Frontend Binding — Deferred" section explicitly listing the work
- Admin panel has structural scaffolding (routes, layout, menu) but zero recruitment pages
- Web portal has 7 static pages; zero API calls; all forms are non-functional

## Users

**Primary — Admin staff:**
  Role: Municipality recruitment officers and department admins
  Trigger: Daily task — publishing advertisements, reviewing applications, managing call letters
  Pain: Cannot perform any recruitment workflow without functional admin UI

**Primary — Candidates (citizens):**
  Role: Job applicants seeking government positions
  Trigger: Seeing a published advertisement and wanting to apply
  Pain: Cannot register, apply, pay, or download call letters without functional Web UI

**Not for:** Super Admin infrastructure tasks (handled in existing Setup/Master pages)

## Hypothesis
We believe building the Admin recruitment pages and wiring the public Web frontend to the
backend APIs will enable staff to manage the full recruitment lifecycle and candidates to
complete the application process end-to-end.
We'll know we're right when a complete recruitment cycle — publish advertisement → candidate
registers → applies → pays fee → downloads call letter — can be executed without any
direct database access.

## Success Metrics

| Metric | Target | How measured |
|--------|--------|-------------|
| Admin pages functional | 6 recruitment modules working | Manual QA on each CRUD route |
| Web forms validated | Zero unvalidated submit possible | Formik + Yup schema coverage |
| Form field accessibility | All fields keyboard-navigable | Tab through every form, no focus traps |
| API binding complete | Zero hardcoded data in components | Code grep for static arrays in new pages |

## Scope

**MVP:**
- Admin: 6 recruitment module pages (Advertisements, Candidates, Applications, Fee Payments, Call Letters, Notices)
- Web: API-connect existing pages (Careers, Notices) + build new flows (Registration, Application, Fee, Call Letter)
- Form standards applied consistently across both apps
- Any missing backend endpoints discovered during form building created in the same PR

**Out of scope**
- Mobile responsive deep-optimization (basic Bootstrap responsiveness is sufficient)
- Dark mode
- Offline/PWA support
- Print stylesheets
- Admin panel WhatsApp pages (removed in Phase 1 rewrite)

## Delivery Milestones

| # | Milestone | Outcome | Status | Plan |
|---|-----------|---------|--------|------|
| 1 | Admin: Advertisements CRUD | Staff can publish/edit/archive advertisements | pending | — |
| 2 | Admin: Candidates + Applications | Staff can search candidates and view applications | pending | — |
| 3 | Admin: Fee Payments + Call Letters | Staff can reconcile payments and publish call letters | pending | — |
| 4 | Admin: Notices + Dashboard wired | Staff can manage notice board; dashboard shows real stats | pending | — |
| 5 | Web: Careers + Notices API-connected | Citizens see live job listings and notices | pending | — |
| 6 | Web: OTR Registration flow | Citizens can complete 10-step registration | pending | — |
| 7 | Web: Application + Fee + Call Letter | Citizens can apply, pay, and download call letter | pending | — |

## Open Questions
- [ ] Which additional API endpoints are needed? (Discovered during form building — tracked per milestone)
- [ ] Should Web frontend add react-select or keep native selects for accessibility/mobile?
- [ ] Is Gujarati (GU) the only second language needed, or also Hindi (HI) for all new Web strings?

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Missing API endpoints for form dropdowns | High | Medium | Build niche endpoints inline; document in phase notes |
| Advertisement form has 16 fields — complex UX | Medium | Medium | Tabbed form splits into 5 logical sections |
| OTR 10-step registration — session state on refresh | High | High | Server-side step state (already designed in Phase 3) |

---
*Status: DRAFT — requirements only. Implementation planning via `knowledge_base/phases/phase-10-frontend-binding.md`.*
