# Phase 6 — Productionization & Launch

**Duration**: Weeks 21–24  
**Status**: 🔲 Planned  
**Goal**: Take the locally feature-complete platform to a public, student-facing production deployment with real third-party integrations, first-login onboarding, full observability, and green CI/CD.

**Depends on**: Phase 5 complete (AI features, analytics, and local hardening done).

> **Stack notes:** Railway (Docker) for the API + ARQ worker, Vercel for the frontend, Neon PostgreSQL, Upstash Redis, Sentry, Resend, Cloudflare R2. See `[tech-stack.md](./tech-stack.md)`.

---

## Objectives

Ship PlacementOS to a real URL that students can sign up for and use end-to-end. Swap all local stand-ins (SQLite, mocked keys) for managed production services, wire real OAuth and AI credentials, add a first-login onboarding flow that seeds the readiness engine, and complete the observability and QA gates required to operate the app with confidence.

---



## Deliverables



### Deployment & Infrastructure

- [ ] Backend API deployed to Railway from `backend/Dockerfile`
- [ ] ARQ worker deployed as a **separate** Railway service sharing the same image + env
- [ ] Frontend deployed to Vercel via `frontend/vercel.json`
- [ ] Managed **Neon PostgreSQL** replaces local SQLite; `DATABASE_URL` points at the pooled (PgBouncer) connection string
- [ ] **Upstash Redis** provisioned; `REDIS_URL`/`REDIS_TOKEN` set for both API and worker
- [ ] `alembic upgrade head` runs automatically on deploy (release command)
- [ ] Per-environment `.env` matrix documented (`local`, `staging`, `production`)



### Real Third-Party Integrations

- [ ] Google + GitHub OAuth **production** apps created; redirect URIs registered for the prod domain
- [ ] Anthropic API key wired for live Interview Twin + ATS V2
- [ ] Cloudflare R2 bucket + credentials for resume/file storage
- [ ] Resend production domain verified (SPF/DKIM) for transactional email
- [ ] Sentry DSNs configured for backend and frontend projects
- [ ] Secrets stored in Railway/Vercel secret managers — never committed



### Onboarding Flow

- [ ] First-login profile setup: university, graduation year, target role, target companies
- [ ] Onboarding writes to the existing `Profile` model and triggers an initial `ReadinessScore` computation
- [ ] Guarded redirect: users without a completed profile are routed to `/onboarding` before the dashboard
- [ ] Frontend `/onboarding` multi-step form with progress + validation



### Observability

- [ ] Sentry performance tracing enabled on API routes (P95 latency alerts)
- [ ] Structured log shipping from Railway (structlog JSON → log drain)
- [ ] Uptime monitoring on `GET /health` (Betterstack or equivalent)
- [ ] ARQ job dashboard / admin endpoint surfacing queue depth + failures
- [ ] Alert: 5xx rate > 1% over a 5-minute window



### QA Gates

- [ ] Expanded pytest coverage on routers and services (target ≥ 70% on critical paths)
- [ ] Playwright E2E happy paths: login → onboarding → dashboard → resume analyze → interview twin
- [ ] Load smoke test (k6) against staging before promotion
- [ ] CI runs migrations + seed + tests + frontend build on every PR
- [ ] Deploy workflow: `main` → staging → production (manual promotion gate)



### Security Completion

- [ ] Verify **slowapi** limits active in prod (global + `/auth/`* + sync routes)
- [ ] Security headers (CSP, HSTS, X-Frame-Options) confirmed on prod responses
- [ ] Cookie flags verified: `httpOnly`, `Secure`, `SameSite=Lax` under HTTPS
- [ ] OWASP Top 10 checklist signed off against the live deployment
- [ ] Dependency audit (`pip-audit` / `npm audit`) with no unresolved high severities



### Data Operations

- [ ] Idempotent production seed (company profiles, question bank, CS topics)
- [ ] Backup/restore runbook for Neon (PITR verified with a test restore)

---



## API Endpoints (Phase 6 Additions)

```
# Onboarding
POST   /users/onboarding            → Save university, grad year, target role/companies; seed readiness
GET    /users/onboarding/status     → { completed: bool, missingFields: [] }

# Operations
GET    /health/ready                → Readiness probe (DB + Redis reachable)
GET    /admin/jobs                  → ARQ queue depth + recent job outcomes (ADMIN)
```

---



## Data Model changes

No new tables. This phase operationalizes existing models:

- `Profile` — onboarding populates `university`, `graduation_year`, `target_role`, and target-company fields; add an `onboarded_at` timestamp column to gate the onboarding redirect.
- `ReadinessScore` — an initial row is computed at the end of onboarding so the dashboard is non-empty on first visit.
- Seed data targets existing `CompanyProfile`, `Question`, and `CSProgress` reference tables via `backend/scripts/seed.py` (idempotent upserts).

---



## Testing Requirements

- Onboarding submission persists to `Profile` and creates an initial `ReadinessScore` (integration)
- Onboarding gate redirects incomplete profiles to `/onboarding` (Playwright)
- Production OAuth round-trip creates a user in Neon (manual QA with prod credentials)
- Interview Twin + ATS V2 succeed against the live Anthropic key (smoke test, staging)
- CI pipeline runs migrations + seed + tests + build green on a clean checkout
- Load smoke test sustains target RPS without 5xx spikes (k6, staging)

---



## Definition of Done

- [ ] Public URL live; frontend login page loads over HTTPS
- [ ] Real Google + GitHub OAuth login creates a user in Neon
- [ ] New users complete onboarding and land on a populated dashboard
- [ ] ATS V2 and Interview Twin work with live Anthropic keys
- [ ] CI/CD green: migrations + tests + build + deploy to production
- [ ] Sentry, uptime monitoring, and 5xx alerting are live and firing test alerts
- [ ] Backup/restore runbook validated with a successful test restore
- [ ] OWASP checklist signed off against production

---



## Risks & Mitigations


| Risk                                                 | Mitigation                                                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| SQLite → Neon migration surfaces dialect issues      | Run the full Alembic chain against Neon in staging before promotion; add Postgres to CI |
| Live third-party keys leak via logs or client bundle | Keep secrets server-side only; scrub tokens from structlog; audit `NEXT_PUBLIC_*` usage |
| ARQ worker as a separate service drifts from API env | Share one Docker image + one env group across both Railway services                     |
| Onboarding friction drops activation                 | Keep it to ≤ 3 short steps; allow "skip for now" with a dashboard reminder              |
| Neon cold starts add latency on first request        | Use the pooled PgBouncer URL; enable a minimum compute or keep-warm ping                |
| Prod OAuth redirect URI misconfig blocks login       | Register all environment callback URLs upfront; verify in staging first                 |


