# Phase 5 — Intelligence Layer, Analytics & Production Hardening
**Duration**: Weeks 14–20  
**Status**: ✅ Implemented (local)  
**Goal**: AI-powered features (Interview Twin, smart ATS V2), advanced analytics, company-wise readiness, peer benchmarking, Google Calendar sync, and production-grade hardening.

**Depends on**: Phase 4 complete (platform feature-complete and stable).

> **Stack notes:** Claude via **anthropic** Python SDK; rate limiting via **slowapi**; security headers via Starlette middleware. See [`tech-stack.md`](./tech-stack.md).

---

## Objectives

Differentiate PlacementOS from generic prep tools through AI-powered personalization, deep analytics, and ecosystem integrations. Simultaneously, harden the platform for 10,000+ concurrent users.

---

## Deliverables

### Interview Twin (AI Mock Interviews)
The flagship V2 feature. Uses Claude API (Anthropic) to conduct personalized mock interviews.

**Backend:**
- `POST /prepare/interview-twin/start` — creates a session:
  - Fetches user's resume JSON + featured projects
  - Generates a system prompt: "You are a technical interviewer at {company}. The candidate's resume: {resumeJson}. Projects: {projects}. Ask 5 relevant questions."
  - Returns `sessionId` + first question
- `POST /prepare/interview-twin/respond` — sends user answer to Claude, receives feedback + next question
- `POST /prepare/interview-twin/end` — ends session, requests Claude to provide overall feedback (strengths, weaknesses, score 1–10)
- Stores full session transcript in `InterviewSession.notes` as JSON
- Logs session in `interview_sessions` table; updates `InterviewScorer`

**Frontend:**
- `/prepare/interview-twin/page.tsx`:
  - Company + role selector (drives interview persona)
  - Chat-style interface: interviewer question → user types/speaks answer → AI feedback
  - Progress indicator (Question 1/5)
  - End session → feedback summary card
  - Session saved automatically
  - Option to review past sessions

**Claude API Integration:**
```python
import anthropic

client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1000,
    system=f"""You are a senior interviewer at {company}.
           Candidate resume: {resume_json}.
           Ask technical questions relevant to their experience.
           After each answer, give brief feedback (2-3 sentences) then ask the next question.""",
    messages=conversation_history,
)
```

### ATS Analyzer V2
Enhanced ATS with JD-specific keyword matching.

**Backend:**
- `POST /resume/:id/analyze-v2` — accepts optional `jobDescriptionText` in body
- Enhanced scoring:
  - All V1 criteria retained
  - **JD Keyword Match** (0–30 pts): extracts key skills from JD, checks against resume
  - **Action Verb Quality** (0–15 pts): scores verbs (led, built, reduced > helped, worked)
  - **Quantification Depth** (0–15 pts): checks percentages, dollar amounts, user counts
  - **ATS Format Compliance** (0–10 pts): no tables, no text boxes, standard section headers
- Returns `atsV2Score`, `matchedKeywords[]`, `missingKeywords[]`, `suggestions[]`

**Frontend:**
- Enhanced ATS card in `/resume/page.tsx`:
  - JD paste box (optional)
  - Keyword match visualization (matched green / missing red chips)
  - Actionable suggestions list (prioritized by impact)
  - V1 vs V2 score comparison if JD is provided

### Company-wise Readiness
- `GET /readiness/by-company/:companyName` — returns readiness breakdown weighted for that company's known focus areas:
  - Google: DSA weight 40%, projects 25%, CS 20%, other 15%
  - Meta: DSA 45%, projects 30%, CS 15%, other 10%
  - Startup (generic): projects 35%, resume 25%, DSA 20%, other 20%
- Company profiles stored in DB (admin-seeded): company name, focus weights, known round structure
- Frontend: company readiness cards on dashboard (for user's target companies from Profile)
- `GET /prepare/questions?company=Google` — filter question bank by company (already built in Phase 3; now surfaced in UI more prominently)

### Peer Benchmarking
Anonymized comparison within same graduation year cohort.

**Backend:**
- Aggregate query: for each score category, compute P25/P50/P75 for users with same `graduationYear`
- `GET /readiness/benchmarks` — returns:
  ```json
  {
    "cohort": { "year": 2025, "size": 342 },
    "percentile": { "overall": 68, "dsa": 72, "cs": 55 },
    "benchmarks": {
      "dsa": { "p25": 45, "p50": 62, "p75": 78 },
      "overall": { "p25": 50, "p50": 65, "p75": 80 }
    }
  }
  ```
- Privacy: no individual user data exposed; minimum cohort size 10 users required to show benchmarks
- Computed nightly via ARQ cron job, stored in a materialized cache per `graduation_year`

**Frontend:**
- Benchmark section on `/dashboard` (below Readiness Gauge):
  - Percentile bar showing user vs cohort
  - "You're in the top 32% of your batch" callout
  - Category-level percentiles

### Google Calendar Sync
- `POST /auth/google/calendar` — extend Google OAuth scope to include `https://www.googleapis.com/auth/calendar.events`
- `POST /opportunities/:id/calendar-sync` — creates a Google Calendar event for deadline + OA date + interview dates
- `DELETE /opportunities/:id/calendar-sync` — removes synced events
- Uses stored Google OAuth access token; refreshes via refresh token if expired
- UI: calendar icon on each opportunity card; click to sync/unsync

### Push Notifications (FCM)
- Service Worker registered in Next.js (`public/sw.js`)
- `POST /notifications/subscribe` — stores FCM token per user
- `DELETE /notifications/subscribe` — unsubscribes device
- Push triggers (sent via FCM Admin SDK):
  - Deadline in 24h
  - Sync complete
  - Streak about to break (8 PM if no activity)
  - Score milestone hit (+10 points)
- Permission prompt shown after first login (non-blocking)

### Advanced Analytics
New `/track` route (analytics hub):

**Backend:**
- `GET /track/dsa-heatmap` — daily DSA activity for 52-week heatmap (LeetCode submissionCalendar enriched with local topic completions)
- `GET /track/score-history` — readiness score history time-series (from `readiness_scores` table, versioned)
- `GET /track/topic-breakdown` — per-topic mastery radar chart data
- `GET /track/weekly-report` — week-over-week delta for all categories

**Frontend:**
- `/track/page.tsx`:
  - 52-week activity heatmap (GitHub-style)
  - Score trend line chart (Recharts `LineChart`)
  - Category radar chart (Recharts `RadarChart`)
  - Weekly goal completion history (bar chart)
  - Time-to-placement estimate (based on score trajectory extrapolation)

### Production Hardening
**Performance:**
- Neon connection pooling via PgBouncer (enabled in Neon dashboard; update `DATABASE_URL` to pooled URL)
- All N+1 query patterns eliminated (SQLAlchemy `joinedload` / `selectinload` audit)
- Redis pipeline batching for ARQ bulk operations
- Next.js ISR for static content pages (question bank, CS topics)
- Bundle analysis: `@next/bundle-analyzer`; target < 250kB first load JS

**Security:**
- Security headers middleware on FastAPI (CSP, HSTS, X-Frame-Options)
- Rate limiting: **slowapi** — 100 req/min global, 5 req/min on `/auth/*`, 2 req/min on `/leetcode/sync`
- Input validation: Pydantic schemas on all request bodies
- SQL injection: SQLAlchemy parameterized queries (audit for raw SQL usage)
- OWASP Top 10 audit checklist completed

**Monitoring:**
- Structured logging on all ARQ job lifecycle events
- Sentry performance tracing on API routes (P95 latency alerting)
- Uptime monitoring via Betterstack (Railway backend + Vercel frontend)
- Custom Sentry alert: any 5xx rate > 1% over 5-minute window

**Scalability:**
- ARQ concurrency: `leetcode_sync` — 5 workers; `github_sync` — 3 workers
- Redis connection pooling with retry config
- Database indexes reviewed: add composite index on `readiness_scores(user_id, updated_at DESC)`

---

## API Endpoints (Phase 5 Additions)

```
# Interview Twin
POST   /prepare/interview-twin/start
POST   /prepare/interview-twin/respond
POST   /prepare/interview-twin/end

# ATS V2
POST   /resume/:id/analyze-v2

# Company Readiness
GET    /readiness/by-company/:companyName

# Benchmarking
GET    /readiness/benchmarks

# Calendar
POST   /auth/google/calendar
POST   /opportunities/:id/calendar-sync
DELETE /opportunities/:id/calendar-sync

# Push Notifications
POST   /notifications/subscribe
DELETE /notifications/subscribe

# Analytics
GET    /track/dsa-heatmap
GET    /track/score-history
GET    /track/topic-breakdown
GET    /track/weekly-report
```

---

## Interview Twin: Conversation Flow

```
1. User selects company: "Google" + role: "SWE Intern"
2. POST /prepare/interview-twin/start
   → System prompt built with user's resume + project context
   → Claude returns first question: "Walk me through a project where you solved a complex algorithmic problem"
3. User types/speaks answer
4. POST /prepare/interview-twin/respond { answer: "..." }
   → Claude returns: feedback (2-3 lines) + next question
5. Repeat for 5 questions
6. POST /prepare/interview-twin/end
   → Claude returns: overall feedback + score + 3 improvement areas
7. Session saved; InterviewScorer updates
```

---

## Testing Requirements

- Interview Twin conversation flow produces coherent 5-question session (integration, mocked Claude API)
- ATS V2 keyword matching against fixture JD + resume (unit)
- Peer benchmarking query returns correct percentile (unit test with seeded data)
- FCM push notification sent on deadline trigger (integration, mocked FCM)
- P95 API latency < 500ms under 100 concurrent users (load test with k6)
- No N+1 queries on dashboard load (SQLAlchemy query log analysis)

---

## Definition of Done

- [ ] Interview Twin conducts a 5-question session and returns actionable feedback
- [ ] ATS V2 shows keyword match against pasted JD
- [ ] User's percentile shown on dashboard (once cohort size ≥ 10)
- [ ] Google Calendar event created when opportunity deadline is synced
- [ ] FCM push notification received on iOS + Android (PWA)
- [ ] `/track` page shows 52-week heatmap + score trend
- [ ] P95 API latency < 500ms (k6 load test passes)
- [ ] Zero critical Sentry errors in 48h staging soak test
- [ ] OWASP Top 10 audit checklist signed off

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Claude API latency (Interview Twin feels slow) | Stream responses via Anthropic streaming API; show typing indicator |
| Cohort too small for benchmarking (early growth) | Show "Not enough data yet" placeholder; threshold = 10 users same year |
| Google Calendar scope expansion breaks existing OAuth | Use incremental authorization; request calendar scope separately on user opt-in |
| FCM Service Worker conflicts with Next.js router | Use official `next-pwa` package; scope SW to `/sw.js` with `scope: "/"` |
| k6 load test revealing DB bottleneck | Neon auto-scaling + connection pooler handles burst; set DB connection limit guard |
