# Phase 8 — Institutional Layer (Colleges / TPOs)
**Duration**: Weeks 25–32 *(parallel track with Phase 7)*  
**Status**: 🔲 Planned  
**Goal**: Add a multi-tenant institutional layer so colleges and Training & Placement Officers (TPOs) can onboard cohorts, run campus drives, and view aggregate readiness/placement analytics — while students see org-scoped drives.

**Depends on**: Phase 6 complete (launched, multi-user production). Runs in parallel with Phase 7; shares the same production platform.

> **Stack notes:** Shared-schema multi-tenancy (`org_id` scoping) on the existing SQLAlchemy models; extends the existing `UserRole` enum and `require_roles` guard in `backend/app/deps.py`. New frontend `(admin)` route group under Next.js 14. See [`tech-stack.md`](./tech-stack.md).

---

## Objectives

Introduce organizations as a first-class tenant so an institution can manage its students, run placement drives, and measure outcomes. Reuse and extend existing constructs — `UserRole`, `require_roles`, `Opportunity`, and `Application` — rather than forking a separate system. Isolation is enforced by `org_id` scoping on all tenant-owned data, with the trade-offs documented.

---

## Deliverables

### Multi-Tenancy Foundation
- [ ] `Organization` tenant entity (college/company account)
- [ ] `Membership` linking users to orgs with an org-scoped role
- [ ] Extend the existing **`UserRole`** enum with `TPO` and `ORG_ADMIN` (alongside `USER`/`ADMIN`)
- [ ] Extend **`require_roles`** (in `backend/app/deps.py`) to also resolve the caller's membership + org role
- [ ] Tenant isolation: **shared schema + `org_id`** on all tenant-owned rows; a dependency injects the active `org_id` and every query is filtered by it
- [ ] Documented trade-offs: shared-schema (simple ops, must never miss a filter) vs schema-per-tenant (stronger isolation, heavier ops) — shared-schema chosen for launch

### Institution Onboarding
- [ ] College signup + org creation (creates the first `ORG_ADMIN` membership)
- [ ] Bulk student invite/import via CSV (email, branch, graduation year)
- [ ] Domain-based auto-join (verified email domain → auto-membership as STUDENT)
- [ ] Seat management: seat count, seats used, invite expiry

### TPO / Admin Dashboards
- [ ] Cohort readiness analytics (aggregate over org members, reusing `ReadinessScore`)
- [ ] At-risk student flags (low/declining readiness, inactivity)
- [ ] Placement funnel: applied → shortlisted → interviewed → offered
- [ ] Drive outcomes overview per company/role
- [ ] Frontend `(admin)` route group: `/org/overview`, `/org/students`, `/org/drives`, `/org/reports`

### Drive Management
- [ ] `Drive` (campus visit) with eligibility rules (branch, min CGPA, graduation year)
- [ ] `DriveRound` (OA, technical, HR) with scheduling
- [ ] `DriveApplication` linking eligible students into the pipeline
- [ ] Drives link to existing **`Opportunity`**; student applications reuse existing **`Application`** semantics
- [ ] Students see only their org's drives, filtered by eligibility

### Reporting & Exports
- [ ] Placement statistics (offers, median package, placement %) per org
- [ ] Per-branch / per-year breakdown reports
- [ ] CSV and PDF export of cohort + drive reports

---

## API Endpoints (Phase 8 Additions)

```
# Organizations & Membership
POST   /org                              → Create organization (founder becomes ORG_ADMIN)
GET    /org/:id                          → Org profile + seat usage
POST   /org/:id/members/invite           → Bulk CSV invite (TPO/ORG_ADMIN)
POST   /org/:id/members/import           → CSV import of students
GET    /org/:id/members                  → List members (org-scoped)
DELETE /org/:id/members/:userId          → Remove membership

# Cohort Analytics (TPO/ORG_ADMIN)
GET    /org/:id/analytics/readiness      → Aggregate cohort readiness + distribution
GET    /org/:id/analytics/at-risk        → At-risk student flags
GET    /org/:id/analytics/funnel         → Placement funnel counts

# Drives
POST   /org/:id/drives                   → Create a drive (links to Opportunity)
GET    /org/:id/drives                   → List org drives
POST   /org/:id/drives/:driveId/rounds   → Add a round
GET    /drives                           → Student view: eligible org drives
POST   /drives/:driveId/apply            → Student applies (creates DriveApplication)

# Reporting
GET    /org/:id/reports/placement        → Placement stats (branch/year filters)
GET    /org/:id/reports/export           → CSV/PDF export
```

---

## Data Model changes

New SQLAlchemy models in `backend/app/models/entities.py`:

- **`Organization`** — `id`, `name`, `slug`, `type` (college/company), `verified_domains` (JSON), `seat_limit`, `created_at`.
- **`Membership`** — `id`, `org_id` (FK → `organizations`), `user_id` (FK → `users`), `org_role` (STUDENT / TPO / ORG_ADMIN), `branch`, `graduation_year`, `status`; unique on `(org_id, user_id)`.
- **`Drive`** — `id`, `org_id` (FK → `organizations`), `opportunity_id` (FK → existing `opportunities`), `company_name`, `eligibility` (JSON: branches, min CGPA, grad year), `visit_date`, `status`.
- **`DriveRound`** — `id`, `drive_id` (FK → `drives`), `name`, `round_type` (OA/technical/HR), `scheduled_at`, `order`.
- **`DriveApplication`** — `id`, `drive_id` (FK → `drives`), `user_id` (FK → `users`), `application_id` (FK → existing `applications`), `current_round`, `status`; unique on `(drive_id, user_id)`.

Existing-model changes:

- Add a nullable **`org_id`** column to tenant-owned tables so org-scoped analytics can filter (e.g. surface `ReadinessScore` per cohort). Personal, non-institutional users have `org_id = NULL` and are unaffected.
- Extend the **`UserRole`** enum with `TPO` and `ORG_ADMIN`; global `ADMIN` retains platform-wide access. Org-scoped authorization is resolved from `Membership.org_role`, not the global role.

---

## Testing Requirements

- Org creation makes the founder an `ORG_ADMIN` member (integration)
- CSV bulk invite creates pending memberships and respects the seat limit (integration)
- Domain-based auto-join attaches a matching-email user as STUDENT (integration)
- Query scoping: a TPO in org A cannot read org B's members or analytics (authorization test)
- Drive eligibility filters students correctly by branch/CGPA/year (unit)
- Student drive application creates a `DriveApplication` + links an `Application` (integration)
- Placement report aggregates match seeded fixtures; CSV/PDF export produces valid files (integration)

---

## Definition of Done

- [ ] A TPO can create an org and onboard a cohort (invite/import/auto-join)
- [ ] Seat limits are enforced on invites
- [ ] A TPO can create a drive with eligibility rules and rounds
- [ ] Eligible students see the drive and can apply; ineligible students cannot
- [ ] TPO dashboards show cohort readiness, at-risk flags, and the placement funnel
- [ ] Cross-org data access is provably blocked by scoping tests
- [ ] Placement reports export to CSV and PDF
- [ ] Personal (non-org) users are unaffected by tenancy changes

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| A missing `org_id` filter leaks cross-tenant data | Central org-scope dependency + a shared query helper; authorization tests for every org route; default-deny |
| Extending `UserRole` breaks existing role checks | Keep `USER`/`ADMIN` semantics unchanged; resolve org roles from `Membership`, not the global enum, so existing guards still pass |
| Bulk CSV import with dirty data | Validate + dry-run preview; report per-row errors; idempotent upsert on `(org_id, email)` |
| Shared-schema isolation is weaker than schema-per-tenant | Document the trade-off; enforce scoping in one place; revisit schema-per-tenant if a tenant demands hard isolation |
| Drive ↔ Opportunity/Application coupling causes double-counting | Reuse existing `Application` rows and link via `DriveApplication`; single source of truth for status |
| TPO analytics expose individual students unfairly | Aggregate views by default; gate individual drill-down to the student's own org and role |
