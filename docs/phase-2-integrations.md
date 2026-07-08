# Phase 2 — Dashboard, LeetCode & GitHub Sync
**Duration**: Weeks 4–6  
**Status**: ✅ Implemented (local)  
**Goal**: Core data integrations live. Users can connect LeetCode + GitHub, trigger syncs, and see real data on their dashboard.

**Depends on**: Phase 1 complete and deployed.

> **Stack notes:** Background jobs use **ARQ** (async Redis workers) instead of BullMQ. Backend routes live in `backend/app/routers/`. See [`tech-stack.md`](./tech-stack.md).

---

## Objectives

The dashboard becomes meaningful. The two primary data sources — LeetCode (DSA progress) and GitHub (build/project activity) — are synced into the DB via **ARQ** background workers. The Readiness Engine computes its first score from real data.

---

## Deliverables

### ARQ Job Infrastructure (replaces BullMQ)
- ARQ initialized with Upstash Redis as broker
- `leetcode_sync` worker registered
- `github_sync` worker registered
- `score_recalc` worker registered (triggered after each sync)
- Admin job status endpoint at `GET /admin/queues` (admin-only) or ARQ dashboard
- Retry logic: 3 attempts with exponential backoff on failure
- Failed jobs logged to dead-letter table or Redis list

### LeetCode Module (Backend — `backend/app/routers/leetcode.py`)
- `POST /leetcode/sync` — validates username, enqueues ARQ job, returns `job_id`
- `leetcode_sync` worker:
  - Calls LeetCode unofficial GraphQL: `https://leetcode.com/graphql`
  - Fetches: `totalSolved`, `easySolved`, `mediumSolved`, `hardSolved`, `ranking`, `currentStreak`, `submissionCalendar`, `tagProblemCounts`
  - Upserts `LeetCodeStats` + `LeetCodeTopicProgress` records
  - On success: triggers `score_recalc` for that user_id
  - On failure: marks integration as stale, emits SSE failure event
- `GET /leetcode/stats` — returns current stored stats (no live call)
- `GET /leetcode/topics` — topic breakdown with revision flags
- `PUT /leetcode/topics/:topic/revision` — toggle revision flag
- `GET /leetcode/sync/status` — SSE stream; client subscribes and receives `{ status: "syncing" | "complete" | "failed", progress: number }`
- Redis cache: `leetcode:stats:{userId}` with 30-min TTL

### GitHub Module (Backend — `backend/app/routers/github.py`)
- `POST /github/sync` — enqueues ARQ job using stored OAuth access token
- `github_sync` worker:
  - Calls GitHub REST API v3 + GraphQL v4
  - Fetches: repos list, stars, forks, languages, topics, pushedAt
  - Fetches: contribution calendar (GraphQL `contributionsCollection`)
  - Upserts `GitHubRepo[]` + `GitHubActivityStats`
  - Triggers `score_recalc`
- `GET /github/repos` — all synced repos
- `GET /github/repos/featured` — isFeatured=true repos only
- `PUT /github/repos/:repoId/feature` — toggle isFeatured
- `GET /github/activity` — contribution stats + calendar heatmap
- `GET /github/sync/status` — SSE stream (same pattern as LeetCode)
- Access token stored AES-256 encrypted in `github_integrations.access_token`

### Readiness Engine (Phase 2 Partial — `backend/app/services/readiness/`)
- `ReadinessEngine` service created
- `DSAScorer` — maps LeetCode stats to 0–100 score (formula in §10 of arch doc)
- `ProjectsScorer` — maps GitHub repo count, stars, last push recency to 0–100
- Remaining scorers (CS, Interview, Resume, Opportunities) return placeholder 50 until Phase 3+
- `ReadinessScore` record upserted after every sync
- `GET /readiness` — returns current score + category breakdown
- `POST /readiness/recalculate` — force full recalculation

### Dashboard Module (Backend)
- `GET /dashboard` — aggregates: readiness score, streak, weekly goal progress, upcoming deadlines (empty in Phase 2), progress snapshot (LeetCode + GitHub stats)
- `GET /dashboard/today` — today's plan stub (returns empty array, filled in Phase 3)
- Redis cache: `dashboard:summary:{userId}` with 5-min TTL, invalidated after sync

### Frontend — Dashboard Shell (`frontend/src/app/(dashboard)/`)
- `(dashboard)/layout.tsx` — Sidebar + Topbar layout
  - Sidebar: Logo, nav links (all 7 sections), mini ReadinessBar, user avatar
  - Topbar: page title (dynamic), SyncStatus button, notifications bell (empty)
  - Sidebar collapse/expand via Zustand `ui.store`
- `(dashboard)/dashboard/page.tsx` — Dashboard overview page:
  - `ReadinessGauge` — radial gauge showing overall score
  - `ProgressSnapshot` — LeetCode solved count, GitHub repos count
  - `UpcomingDeadlines` — empty state with CTA in Phase 2
  - `TodaysPlan` — empty state in Phase 2
  - `MotivationCard` — daily quote (hardcoded pool of 20 quotes)
- LeetCode connect flow: input username → `POST /leetcode/sync` → SSE progress → stats appear
- GitHub connect flow: OAuth button → `GET /auth/github` → on return, auto-trigger sync
- `SyncButton` component — shows syncing spinner, subscribes to SSE, auto-refreshes data on `complete`
- `LeetCodeStats` component — Easy/Medium/Hard donuts + streak calendar heatmap
- `CommitGraph` component — GitHub contribution calendar (52-week grid)

### Frontend — Learn Page (Stub)
- `/learn/page.tsx` — LeetCode stats embedded here as the DSA section
- Topic progress grid (`TopicProgressGrid`) — lists topics with solved/total + revision toggle
- Connects to `GET /leetcode/topics`

### Hooks
- `useLeetCodeStats()` — TanStack Query wrapping `GET /leetcode/stats`
- `useGitHubRepos()` — TanStack Query wrapping `GET /github/repos`
- `useReadiness()` — TanStack Query wrapping `GET /readiness`
- `useSyncStatus(type)` — SSE subscription hook returning `{ status, progress }`
- `useUser()` — current user from `/auth/me` (TanStack Query + Zustand)

---

## API Endpoints (Phase 2 Additions)

```
# LeetCode
POST   /leetcode/sync
GET    /leetcode/stats
GET    /leetcode/topics
PUT    /leetcode/topics/:topic/revision
GET    /leetcode/sync/status          (SSE)

# GitHub
POST   /github/sync
GET    /github/repos
GET    /github/repos/featured
PUT    /github/repos/:repoId/feature
GET    /github/activity
GET    /github/sync/status            (SSE)

# Readiness
GET    /readiness
POST   /readiness/recalculate

# Dashboard
GET    /dashboard
GET    /dashboard/today
```

---

## DSA Scorer Formula

```python
# Score range: 0–100
DSA_TARGETS = {
    "easy": 100, "medium": 200, "hard": 50, "total": 500,
    "streak": 30, "ranking": 50000,
}

dsa_score = weighted average of:
  - (total_solved / 500) * 40   → max 40 pts
  - (medium_solved / 200) * 25  → max 25 pts
  - (hard_solved / 50) * 15     → max 15 pts
  - (current_streak / 30) * 10  → max 10 pts (capped at 30-day streak)
  - (ranking <= 50000 ? 1 : 50000/ranking) * 10 → max 10 pts
```

---

## Project Score Formula

```python
project_score = weighted average of:
  - (len(featured_repos) / 3) * 40      → max 40 pts (3 featured = full marks)
  - (len(deployed_repos) / 2) * 30    → max 30 pts (2 deployed = full marks)
  - (total_commits_this_month / 20) * 20 → max 20 pts
  - (total_stars / 10) * 10           → max 10 pts
```

---

## Testing Requirements

- `leetcode_sync` worker processes a mock GraphQL response correctly (unit)
- `github_sync` worker processes mock API response correctly (unit)
- `DSAScorer.compute()` returns correct score for known inputs (unit)
- `POST /leetcode/sync` enqueues an ARQ job (integration)
- SSE endpoint delivers `complete` event after job finishes (integration)
- Dashboard page renders with real data after sync (E2E)

---

## Definition of Done

- [ ] User can enter LeetCode username → trigger sync → see real stats in < 30s
- [ ] GitHub OAuth → auto-sync → repos displayed
- [ ] Readiness gauge shows non-zero score computed from real data
- [ ] SSE progress indicator works (syncing → complete animation)
- [ ] Sync jobs retry correctly on failure (tested with mock failure)
- [ ] Redis cache reduces DB hits by ≥ 80% (verified via Redis metrics)
- [ ] Admin queue view shows job history at `GET /admin/queues`

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| LeetCode GraphQL rate-limiting our server IP | Cache aggressively (30-min Redis TTL); add per-user sync cooldown (min 15 min between syncs) |
| GitHub API 5,000/hr quota exhaustion | Track request count per token in Redis; warn user when approaching limit |
| SSE connections not closing cleanly | Implement disconnect cleanup in FastAPI `StreamingResponse` |
| ARQ job stuck in active state | Set job timeout + stalled job checker via ARQ `max_tries` / `job_timeout` |
