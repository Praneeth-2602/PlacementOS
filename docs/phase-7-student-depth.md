# Phase 7 — Student Experience Depth
**Duration**: Weeks 25–30  
**Status**: 🔲 Planned  
**Goal**: Deepen the student-facing product with structured learning content, an in-app coding practice judge, a community layer, mentor matching, and gamification — turning PlacementOS from a tracker into a place students spend time preparing.

**Depends on**: Phase 6 complete (platform launched with real integrations and onboarding).

> **Stack notes:** In-app judge via **Judge0** (self-hosted or hosted) or **piston**; content and community reuse FastAPI + SQLAlchemy + ARQ; frontend adds a code editor (Monaco/CodeMirror) under Next.js 14. See [`tech-stack.md`](./tech-stack.md).

---

## Objectives

Give students concrete things to *do* inside the app: follow curated prep roadmaps, solve coding problems against a real judge, discuss with peers, get matched to mentors, and earn gamified progress. Every new surface feeds the existing readiness/analytics engine so effort translates into measurable placement readiness.

---

## Deliverables

### Learning Content & Roadmaps
- [ ] Curated prep roadmaps (DSA, CS fundamentals, system design basics) and topic playlists
- [ ] `Course` → `Lesson` hierarchy with ordered lessons and resource links
- [ ] Per-user `LessonProgress` (not started / in progress / complete)
- [ ] Roadmap completion contributes to the readiness score
- [ ] Frontend `/content` hub: roadmap browser, lesson viewer, progress rings

### Integrated Coding Practice (In-App Judge)
- [ ] Problem sets with statements, constraints, and sample tests (`CodingProblem`)
- [ ] In-browser code editor (multi-language) + run/submit against a judge
- [ ] `Submission` records verdict, runtime, language, and code
- [ ] Judge execution runs async via ARQ; results polled or pushed to the client
- [ ] Solved problems feed DSA/track analytics alongside LeetCode data
- [ ] Frontend `/practice`: problem list with difficulty/topic filters, editor, verdict panel

### Community
- [ ] Discussion threads, Q&A, and interview-experience posts (`DiscussionThread`, `Post`)
- [ ] Upvotes/downvotes via `Vote`; sort by hot/new/top
- [ ] Moderation + report flow; ADMIN can hide/remove content
- [ ] Frontend `/community`: thread list, thread detail, composer, report action

### Mentor Matching
- [ ] Opt-in `MentorProfile` (expertise areas, seniority, availability slots)
- [ ] Mentee request → mentor accept/decline → booking (`MentorRequest`)
- [ ] Searchable directory filtered by expertise and availability
- [ ] Frontend `/mentors`: directory, profile detail, request/booking flow

### Gamification
- [ ] XP awarded for lessons completed, problems solved, and streak activity
- [ ] Badges for milestones (first solve, 7-day streak, roadmap complete)
- [ ] Cohort-scoped leaderboards (privacy-safe; opt-out supported)
- [ ] Extends existing `Streak` and `WeeklyGoal` mechanics rather than replacing them
- [ ] Frontend: XP bar, badge shelf, leaderboard widget on dashboard

---

## API Endpoints (Phase 7 Additions)

```
# Content & Roadmaps
GET    /content/courses                  → List roadmaps/courses
GET    /content/courses/:id              → Course + ordered lessons
GET    /content/lessons/:id              → Lesson detail
POST   /content/lessons/:id/progress     → Update LessonProgress

# Coding Practice
GET    /practice/problems                → List problems (filters: topic, difficulty)
GET    /practice/problems/:id            → Problem statement + samples
POST   /practice/problems/:id/submit     → Enqueue judge run; returns submissionId
GET    /practice/submissions/:id         → Verdict + runtime + output

# Community
GET    /community/threads                → List threads (sort: hot/new/top)
POST   /community/threads                → Create thread
GET    /community/threads/:id            → Thread + posts
POST   /community/threads/:id/posts      → Reply
POST   /community/posts/:id/vote         → Up/down vote
POST   /community/posts/:id/report       → Flag for moderation

# Mentors
GET    /mentors                          → Directory (filters: expertise, availability)
POST   /mentors/profile                  → Create/update opt-in MentorProfile
POST   /mentors/:id/request              → Request a session
POST   /mentors/requests/:id/respond     → Accept/decline (mentor)
```

---

## Data Model changes

New SQLAlchemy models in `backend/app/models/entities.py`:

- **`Course`** — `id`, `title`, `slug`, `description`, `track` (DSA/CS/system-design), `order`, `published`.
- **`Lesson`** — `id`, `course_id` (FK → `courses`), `title`, `body`/`resource_url`, `order`, `estimated_minutes`.
- **`LessonProgress`** — `id`, `user_id` (FK → `users`), `lesson_id` (FK → `lessons`), `status`, `completed_at`; unique on `(user_id, lesson_id)`.
- **`CodingProblem`** — `id`, `title`, `slug`, `difficulty`, `topic`, `statement`, `constraints`, `sample_tests` (JSON), `hidden_tests_ref`.
- **`Submission`** — `id`, `user_id`, `problem_id` (FK → `coding_problems`), `language`, `code`, `verdict`, `runtime_ms`, `created_at`.
- **`DiscussionThread`** — `id`, `author_id` (FK → `users`), `title`, `category`, `created_at`, `is_hidden`.
- **`Post`** — `id`, `thread_id` (FK → `discussion_threads`), `author_id`, `body`, `score`, `created_at`, `is_hidden`.
- **`Vote`** — `id`, `post_id` (FK → `posts`), `user_id`, `value` (+1/-1); unique on `(post_id, user_id)`.
- **`MentorProfile`** — `id`, `user_id` (unique FK → `users`), `expertise` (JSON), `seniority`, `availability` (JSON), `is_active`.
- **`MentorRequest`** — `id`, `mentor_id` (FK → `mentor_profiles`), `mentee_id` (FK → `users`), `status`, `slot`, `created_at`.
- **`Badge`** / **`UserBadge`** — badge catalog + per-user awards; XP tracked via a new `xp` column on `Profile` (or a dedicated `UserXP` row) to avoid disturbing existing scoring.

Gamification reuses existing **`Streak`** and **`WeeklyGoal`** rather than duplicating streak logic.

---

## Testing Requirements

- Lesson progress update persists and contributes to readiness recomputation (integration)
- Coding submission enqueues an ARQ job and stores the returned verdict (integration, mocked judge)
- Judge sandbox rejects disallowed operations / times out cleanly (security/unit)
- Community vote is idempotent per user and updates post score (unit)
- Mentor request lifecycle (request → accept → booked) transitions correctly (integration)
- Leaderboard excludes opted-out users and is cohort-scoped (unit with seeded data)

---

## Definition of Done

- [ ] A student can follow a roadmap and mark lessons complete
- [ ] A student can solve a problem in-app and see a real judge verdict
- [ ] Solved problems appear in the `/track` DSA analytics
- [ ] A student can post, reply, and vote in the community with moderation available
- [ ] A student can find and request a mentor; mentors can accept
- [ ] XP, badges, and a cohort leaderboard render on the dashboard
- [ ] All new endpoints covered by tests and pass in CI

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Untrusted code execution in the judge is a security risk | Use Judge0/piston sandboxing with CPU/memory/time limits; never execute in the API process |
| Judge latency blocks the request thread | Run submissions as ARQ jobs; return `submissionId` and poll/push the verdict |
| Community moderation load grows with users | Report flow + ADMIN hide/remove from day one; rate-limit posting via slowapi |
| Content authoring becomes a bottleneck | Ship a small curated set first; store lessons as data so non-code updates are possible |
| Leaderboards create unhealthy pressure or leak data | Cohort-scoped, opt-out, and anonymized display names; enforce minimum cohort size |
| Mentor no-shows degrade trust | Track request outcomes; simple reputation signal; keep mentoring opt-in on both sides |
