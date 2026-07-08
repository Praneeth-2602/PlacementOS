# Phase 3 — Learn, Prepare & Opportunities Modules
**Duration**: Weeks 7–9  
**Status**: ✅ Implemented (local)  
**Goal**: The three core study/tracking modules — Learn (CS + Aptitude), Prepare (question bank + mock sessions), and Opportunities (job tracker) — are fully functional end-to-end.

**Depends on**: Phase 2 complete (LeetCode + GitHub sync stable).

> **Stack notes:** Seed scripts run via `python -m scripts.seed` (replaces `npx prisma db seed`). See [`tech-stack.md`](./tech-stack.md).

---

## Objectives

Turn PlacementOS from a "stats dashboard" into a full study companion. Students can track CS fundamentals, practice questions, log mock sessions, and manage their company application pipeline. The Readiness Engine gains 4 new scoring dimensions.

---

## Deliverables

### Learn Module (Backend)
- `CSProgress` CRUD:
  - `GET /learn/cs/:subject` — returns all topics for a subject (OS, DBMS, CN, OOP) with user's progress
  - `PUT /learn/cs/:subject/:topic` — update topic status (NOT_STARTED → IN_PROGRESS → COMPLETED → NEEDS_REVISION) and confidence score
  - `GET /learn/cs/summary` — aggregate completion per subject
- `AptitudeProgress` CRUD:
  - `GET /learn/aptitude/:section` — topics + progress for QUANT, LOGICAL, VERBAL
  - `PUT /learn/aptitude/:section/:topic` — update attempted/correct count
- `Notes` CRUD:
  - `GET /notes`, `POST /notes`, `GET /notes/:id`, `PUT /notes/:id`, `DELETE /notes/:id`
  - Optional filter: `?subject=OS`
- Seeded topic lists for all 4 CS subjects (static JSON seed file → DB on first deploy)
- Redis cache: `learn:cs:summary:{userId}` with 15-min TTL, invalidated on any progress update

### Prepare Module (Backend)
- Question Bank (seeded content, 200+ questions):
  - `GET /prepare/questions` — filterable by `?type=TECHNICAL|HR&company=Google&difficulty=MEDIUM&topic=DP`
  - `GET /prepare/questions/:id`
  - Admin-only: `POST /prepare/questions`, `PUT /prepare/questions/:id`
- STAR Templates:
  - `GET /prepare/star-templates` — curated list of STAR-format HR answers
  - `POST /prepare/star-templates` — user can save custom STAR answers
- Mock Sessions:
  - `POST /prepare/sessions` — log a completed mock session (type, duration, questions answered, self-score, notes)
  - `GET /prepare/sessions` — session history
  - `GET /prepare/sessions/stats` — aggregate stats (total sessions, avg score, trend)
- HR Questions: curated list of 50+ classic HR questions (seeded), returned via `GET /prepare/questions?type=HR`

### Opportunities Module (Backend)
- Full CRUD:
  - `GET /opportunities` — list; filterable by `?status=TRACKING&type=PLACEMENT`
  - `POST /opportunities` — add company/role opportunity
  - `PUT /opportunities/:id` — update any field
  - `DELETE /opportunities/:id`
  - `PUT /opportunities/:id/status` — status state machine transition
- Status state machine: TRACKING → APPLIED → OA_SCHEDULED → INTERVIEW_SCHEDULED → OFFERED | REJECTED | ACCEPTED | DECLINED
- `GET /opportunities/deadlines` — upcoming deadlines (next 30 days), sorted ascending
- `GET /opportunities/calendar` — all opportunities with dates, structured for calendar view
- Deadline reminder job: ARQ cron job runs nightly, queues notifications for deadlines in 24 hours
- When status transitions to APPLIED: auto-create `Application` record

### Readiness Engine (Phase 3 — Full)
All 6 scorers now implemented:

**CSFundamentalsScorer**
```
csScore = (completedTopics / totalTopics) * 70 
        + (avgConfidence / 100) * 30
```

**InterviewScorer**
```
interviewScore = min(100, sessionsLast30Days * 15)  → 15pts per session, max 100
               + (avgSelfScore / 10) * 40           → weighted by quality
               + (hasHRSessions ? 20 : 0)
```

**ResumeScorer** (Phase 3 stub using upload-only ATS)
```
resumeScore = hasDefaultResume ? atsScore : 0
```

**OpportunityScorer**
```
opportunityScore = min(100, appliedCount * 20)   → 20pts per application, max 100
```

Full weighted composite:
```
overall = dsa(30%) + cs(20%) + projects(20%) + interview(15%) + resume(10%) + opportunities(5%)
```

`GET /readiness/recommendations` — top 3 action items based on lowest-scoring category gaps.

### Dashboard Enhancements
- `GET /dashboard/today` — now returns real "Today's Plan":
  - 3 LeetCode problems to solve (based on weak topics from topic progress)
  - 2 CS topics to review (least recently revised)
  - 1 upcoming deadline CTA if any within 7 days
- `GET /dashboard/recent-activity` — last 10 events (sync completions, progress updates, new opportunities)
- Streak tracking: `Streak` record updated on any meaningful activity (LeetCode problem marked, CS topic completed, mock session logged)
- Weekly goals: `WeeklyGoal` record auto-created each Monday; updated as user completes tasks

### Frontend — Learn Module
- `/learn/page.tsx` — tabs: DSA | CS Fundamentals | Aptitude
- DSA tab: LeetCode stats + topic grid (from Phase 2, now properly routed here)
- CS Fundamentals tab:
  - Subject selector (OS | DBMS | CN | OOP)
  - `TopicProgressGrid` — each topic: status badge + confidence slider + notes icon
  - Subject completion bar per subject
  - `RevisionChecklist` — topics flagged as NEEDS_REVISION
- Aptitude tab:
  - Section selector (QUANT | LOGICAL | VERBAL)
  - Per-topic accuracy display
  - Practice CTA linking to embedded question bank filtered by section
- `/learn/cs-fundamentals/[subject]/page.tsx` — deep-dive per subject
- Notes modal accessible from any topic row

### Frontend — Prepare Module
- `/prepare/page.tsx` — tabs: Technical | HR | Mock Sessions
- Technical tab:
  - `QuestionCard` grid — filterable by company, difficulty, topic
  - Each card: question text, difficulty badge, company tags, expand for answer
  - Search bar with debounce
- HR tab:
  - HR questions list with company context
  - STAR template editor (save custom answers)
  - `StarTemplate` component — structured S/T/A/R input fields
- Mock Sessions tab:
  - `POST /prepare/sessions` form — log a session
  - Session history table with score trend chart (Recharts)
  - Stats summary: total sessions, avg score, this-week count

### Frontend — Opportunities Module
- `/opportunities/page.tsx` — Kanban-style board + table toggle
- Kanban: columns for each status stage; drag cards to update status (optimistic update)
- Table view: sortable by deadline, filterable by type/status
- Add opportunity dialog: company, role, type, CTC, deadline, OA date, JD URL
- `DeadlineCard` — highlighted if deadline < 7 days (yellow) or < 24h (red)
- `GET /opportunities/calendar` drives a monthly calendar view
- Upcoming deadlines strip shown in dashboard sidebar

### Frontend — Dashboard (Full)
- `TodaysPlan` now populated from real `GET /dashboard/today`
- `UpcomingDeadlines` populated from opportunities
- Streak counter shown in Topbar with 🔥 emoji
- Weekly goal progress bars (DSA target, CS topics target)

---

## Seeded Data

Phase 3 includes seed scripts in `backend/scripts/`:
- **CS Topics** — ~120 topics across OS, DBMS, CN, OOP (`seeds/cs_topics.json`)
- **Technical Questions** — 150 questions (DSA/system design) with difficulty and company tags
- **HR Questions** — 50 classic HR questions with STAR guidance
- **Aptitude Topics** — 30 topics across QUANT, LOGICAL, VERBAL

```bash
cd backend && python -m scripts.seed
```

---

## API Endpoints (Phase 3 Additions)

```
# Learn
GET    /learn/cs/:subject
PUT    /learn/cs/:subject/:topic
GET    /learn/cs/summary
GET    /learn/aptitude/:section
PUT    /learn/aptitude/:section/:topic

# Notes
GET    /notes
POST   /notes
GET    /notes/:id
PUT    /notes/:id
DELETE /notes/:id

# Prepare
GET    /prepare/questions
GET    /prepare/questions/:id
POST   /prepare/sessions
GET    /prepare/sessions
GET    /prepare/sessions/stats
GET    /prepare/star-templates
POST   /prepare/star-templates

# Opportunities
GET    /opportunities
POST   /opportunities
PUT    /opportunities/:id
DELETE /opportunities/:id
PUT    /opportunities/:id/status
GET    /opportunities/deadlines
GET    /opportunities/calendar

# Readiness (enhanced)
GET    /readiness/recommendations

# Dashboard (enhanced)
GET    /dashboard/today
GET    /dashboard/recent-activity
```

---

## Testing Requirements

- `CSFundamentalsScorer.compute()` — unit test with known inputs
- `InterviewScorer.compute()` — unit test
- Opportunity status state machine — unit test all valid/invalid transitions
- `GET /prepare/questions` filterable results — integration test
- `POST /prepare/sessions` updates InterviewScore in Readiness — integration test
- Kanban drag-to-update opportunity status — E2E test

---

## Definition of Done

- [ ] User can mark 10 CS topics complete and see readiness CS score update
- [ ] User can log a mock session and see interview score increase
- [ ] User can add 3 opportunities and track them through TRACKING → OFFERED
- [ ] Deadline notifications appear in-app 24h before deadline
- [ ] Today's plan shows real personalized suggestions
- [ ] Streak updates after any daily activity
- [ ] All seed data present after `python -m scripts.seed`
- [ ] Readiness overall score uses all 6 categories with correct weights

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Seed data too large causing slow migrations | Use `insertMany` batching + run seed only on first deploy via env flag |
| Drag-and-drop Kanban conflicting with mobile | Use click-based status update as fallback on touch devices |
| Today's plan algorithm giving poor suggestions | A/B test 2 algorithms; default to "weakest topic first" |
| Interview scorer rewarding quantity over quality | Weight self-score (quality) at 40% of scorer; cap session count at 7/month |
