# Phase 9 — Scale, Monetization & Mobile
**Duration**: Weeks 33–40  
**Status**: 🔲 Planned  
**Goal**: Turn the product into a sustainable, scalable business — paid plans (student pro + institutional per-seat), a hardened installable PWA with push, advanced AI features, scale hardening, and an analytics data platform.

**Depends on**: Phase 7 (student depth) and Phase 8 (institutional layer) complete — both tracks converge here.

> **Stack notes:** Billing via **Stripe** (or **Razorpay** for India) with feature gating; PWA hardening on the existing `public/sw.js`; advanced AI via the existing **anthropic** SDK with streaming + embeddings. See [`tech-stack.md`](./tech-stack.md).

---

## Objectives

Introduce monetization without degrading the free student experience, make the app feel first-class on mobile via an installable PWA (with an evaluated native path), extend the AI layer with streaming and personalization, and prove the platform holds up under load with an event-tracking data platform for cohort benchmark accuracy at volume.

---

## Deliverables

### Billing & Monetization
- [ ] `Plan` catalog (Free, Student Pro, Institutional per-seat)
- [ ] `Subscription` per user or org; `Invoice` history
- [ ] Stripe integration (Razorpay alternative for India) with webhook handling
- [ ] Student **Pro** tier (advanced AI, unlimited practice, priority features)
- [ ] Institutional **per-seat** licensing tied to `Organization` seat counts (from Phase 8)
- [ ] Feature gating middleware/dependency driven by active plan
- [ ] Frontend `/billing`: plan selector, checkout, subscription management, invoices

### Mobile (PWA → Native evaluation)
- [ ] PWA hardening: installable manifest, offline app shell, cache strategy
- [ ] Push notifications via the existing `public/sw.js` (reuse Phase 5 FCM subscriptions)
- [ ] Mobile-optimized layouts for core flows (dashboard, practice, drives)
- [ ] Evaluation spike: React Native / Expo path — reuse the API, share nothing UI-side; documented go/no-go

### Advanced AI
- [ ] Streaming Interview Twin responses (Anthropic streaming API + typing indicator)
- [ ] Resume rewrite suggestions (inline, section-level, powered by ATS V2 context)
- [ ] Personalized study-plan generation from readiness gaps + roadmap progress
- [ ] Embeddings-based question/problem recommendations
- [ ] Cost + rate controls: token budgets, caching, and per-tier gating

### Scale Hardening
- [ ] Postgres connection pooling review + index audit on hot paths
- [ ] ARQ concurrency tuning per queue; backpressure + retry policy review
- [ ] Caching strategy review (Redis TTLs, cache invalidation on writes)
- [ ] Read-replica considerations for analytics-heavy queries
- [ ] k6 load targets defined and met (see Testing Requirements)

### Data Platform
- [ ] Event tracking pipeline (product events → durable store)
- [ ] Analytics warehouse export (batch/stream) for cohort + funnel analysis
- [ ] Cohort benchmark accuracy validated at volume (percentiles stable as N grows)

---

## API Endpoints (Phase 9 Additions)

```
# Billing
GET    /billing/plans                    → Plan catalog
POST   /billing/checkout                 → Create checkout session (Stripe/Razorpay)
POST   /billing/webhook                  → Provider webhook (subscription lifecycle)
GET    /billing/subscription             → Current subscription + entitlements
POST   /billing/subscription/cancel      → Cancel/downgrade
GET    /billing/invoices                 → Invoice history

# Advanced AI
POST   /prepare/interview-twin/stream    → Streaming interview responses (SSE)
POST   /resume/:id/rewrite               → Section-level rewrite suggestions
POST   /prepare/study-plan               → Generate a personalized study plan
GET    /practice/recommendations         → Embeddings-based problem recommendations

# Data Platform
POST   /events                           → Ingest product event (batched client → server)
GET    /admin/analytics/export           → Warehouse export trigger (ADMIN)
```

---

## Data Model changes

New SQLAlchemy models in `backend/app/models/entities.py`:

- **`Plan`** — `id`, `code` (free/student_pro/institutional), `name`, `price`, `currency`, `interval`, `entitlements` (JSON), `is_active`.
- **`Subscription`** — `id`, `user_id` (nullable FK → `users`), `org_id` (nullable FK → `organizations`), `plan_id` (FK → `plans`), `status`, `provider`, `provider_sub_id`, `seats`, `current_period_end`; exactly one of `user_id`/`org_id` set.
- **`Invoice`** — `id`, `subscription_id` (FK → `subscriptions`), `amount`, `currency`, `status`, `provider_invoice_id`, `issued_at`.
- **`Event`** — `id`, `user_id` (nullable), `org_id` (nullable), `name`, `properties` (JSON), `created_at` — the event-tracking spine feeding the warehouse export.

Existing-model changes:

- Add a **`plan`/entitlement** reference resolvable from `Subscription` so the feature-gating dependency can check entitlements per request. Free-tier users have no active `Subscription` and receive the default free entitlements.
- Reuse Phase 5 **`PushSubscription`** for PWA push; no schema change required.
- Optional embedding cache column/table for question/problem vectors used by recommendations.

---

## Testing Requirements

- Checkout → webhook → active `Subscription` lifecycle (integration, mocked provider)
- Feature gating: a free user is blocked from Pro-only endpoints; a Pro user is allowed (authorization)
- Institutional per-seat billing matches org seat usage from Phase 8 (integration)
- Streaming Interview Twin yields incremental tokens and a coherent final transcript (integration, mocked stream)
- Study-plan generation reflects the user's readiness gaps (unit with seeded scores)
- PWA installs and serves an offline shell; push received on a real device (manual QA)
- k6 load targets met: P95 API latency < 500ms at target concurrency, error rate < 1%

---

## Definition of Done

- [ ] Paid plans are live: a student can subscribe to Pro; an org can license seats
- [ ] Feature gating correctly unlocks/locks features by plan
- [ ] Billing webhooks reconcile subscription state; invoices are recorded
- [ ] PWA is installable with a working offline shell and push notifications
- [ ] React Native/Expo evaluation documented with a go/no-go decision
- [ ] Streaming Interview Twin, resume rewrite, and personalized study plans ship
- [ ] k6 load targets met and documented
- [ ] Event tracking flows to the warehouse; cohort benchmarks remain accurate at volume

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Payment webhooks are unreliable / out of order | Idempotent webhook handlers keyed on provider IDs; reconcile via periodic sync; treat provider state as source of truth |
| India payment support gaps with Stripe | Abstract billing behind a provider interface; use Razorpay for INR; select provider by region |
| Feature gating leaks paid features or over-blocks free users | Centralize entitlement checks in one dependency; default to free entitlements when no subscription |
| Advanced AI costs scale faster than revenue | Per-tier token budgets, response caching, and streaming to reduce retries; monitor cost per user |
| PWA push inconsistent across iOS/Android | Reuse the official SW setup; feature-detect; graceful fallback to in-app notifications |
| Load reveals DB/ARQ bottlenecks at volume | Index audit, read replicas for analytics, ARQ concurrency tuning; validate against k6 before launch |
| Native (Expo) path doubles maintenance | Treat as an evaluation spike first; only proceed if PWA gaps justify it; keep the API as the single contract |
