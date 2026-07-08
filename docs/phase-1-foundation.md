# Phase 1 — Foundation & Infrastructure
**Duration**: Weeks 1–3  
**Status**: ✅ Implemented  
**Goal**: Zero-feature, fully-wired skeleton that deploys, authenticates, and proves the full-stack pipeline works.

> **Stack:** FastAPI + SQLAlchemy (backend) · Next.js 14 (frontend)  
> See [`tech-stack.md`](./tech-stack.md) for architecture details.

---

## Objectives

Stand up the full-stack skeleton — repo structure, database, auth, CI/CD — so every subsequent phase builds on a stable, tested base. No feature code ships until this phase is green in production.

---

## Deliverables

### Repository & Tooling
- [x] `backend/` + `frontend/` folder structure (replaces Turborepo monorepo)
- [x] ESLint on frontend; pytest on backend
- [x] TypeScript strict mode on frontend
- [x] Git repository with GitHub Actions CI on `main`
- [ ] GitHub Flow branch protection on `main` (configure in repo settings)

### Backend (FastAPI — `backend/`)
- [x] FastAPI app with modular routers (`app/routers/`)
- [x] SQLAlchemy models — **all tables** committed (User, Profile, OAuthAccount, LeetCodeIntegration, LeetCodeStats, LeetCodeTopicProgress, LeetCodeContest, GitHubIntegration, GitHubRepo, GitHubActivityStats, ReadinessScore, Opportunity, Application, Resume, Project, CSProgress, AptitudeProgress, Note, InterviewSession, Streak, WeeklyGoal, Notification)
- [x] Alembic initial migration (`alembic upgrade head`)
- [x] PostgreSQL-ready via `DATABASE_URL` (SQLite default for local dev)
- [x] Redis client wired (`app/redis_client.py`) — active use in Phase 2+
- [x] RFC 7807 problem+json exception handler
- [x] Standard `ApiResponse` envelope on success routes
- [x] Structured JSON logging via structlog
- [x] Health check `GET /health`
- [x] Sentry integration (activates when `SENTRY_DSN` is set)
- [x] Dockerfile (Railway-compatible)

### Authentication
- [x] Google OAuth via Authlib (`GET /auth/google`, `/auth/google/callback`)
- [x] GitHub OAuth via Authlib (`GET /auth/github`, `/auth/github/callback`)
- [x] JWT issued as `httpOnly`, `Secure`, `SameSite=Lax` cookies on successful OAuth
- [x] Sliding-window refresh token (`POST /auth/refresh`)
- [x] `GET /auth/me` returns user + profile + integration statuses
- [x] `POST /auth/logout` clears cookies, redirects to `/login`
- [x] `get_current_user` dependency + `require_roles()` guard — tested via `/admin/ping`

### Frontend (Next.js — `frontend/`)
- [x] Next.js 14 App Router
- [x] Tailwind CSS + shadcn-style UI; design tokens in `globals.css`
- [x] API-managed OAuth (login buttons redirect to backend — no NextAuth)
- [x] `middleware.ts` protects dashboard routes — unauthenticated → `/login`
- [x] Login page (`/login`) with Google + GitHub buttons
- [x] `QueryClientProvider` + `ThemeProvider` + Sonner toasts in root layout
- [x] Zustand stores: `ui.store.ts`, `user.store.ts`, `sync.store.ts`
- [x] Dashboard shell with sidebar, nav links, stub pages for all modules
- [x] Playwright E2E config (`e2e/auth.spec.ts`)

### Infrastructure
- [x] `Dockerfile` for FastAPI API
- [x] `vercel.json` for Next.js frontend
- [x] GitHub Actions CI: backend pytest + frontend lint/build
- [ ] Auto-deploy `main` → Vercel + Railway (add deploy workflow when accounts are configured)
- [x] Sentry DSN hooks in both apps
- [x] `.env.example` for both apps

---

## API Endpoints (Phase 1)

```
GET  /health                   → { success, data: { status: "ok", version: "0.1.0" } }
GET  /auth/google              → Redirect to Google OAuth
GET  /auth/google/callback     → JWT cookies + redirect to /dashboard
GET  /auth/github              → Redirect to GitHub OAuth
GET  /auth/github/callback     → JWT cookies + redirect to /dashboard
POST /auth/logout              → Clear cookies, redirect to /login
POST /auth/refresh             → Rotate JWT cookies
GET  /auth/me                  → Current user + profile + integration statuses
GET  /admin/ping               → Admin-only health (role guard test endpoint)
```

---

## Database (Full Schema Migration)

All SQLAlchemy models are migrated in Phase 1 even if not all are used yet. This avoids migration conflicts in later phases.

```bash
cd backend
alembic upgrade head
```

**Tables:** `users`, `oauth_accounts`, `profiles`, `leetcode_integrations`, `leetcode_stats`, `leetcode_topic_progress`, `leetcode_contests`, `github_integrations`, `github_repos`, `github_activity_stats`, `cs_progress`, `aptitude_progress`, `notes`, `resumes`, `projects`, `interview_sessions`, `readiness_scores`, `opportunities`, `applications`, `streaks`, `weekly_goals`, `notifications`

---

## Testing Requirements

| Test | Status |
|------|--------|
| `GET /health` → 200 (pytest) | ✅ |
| Unauthenticated `GET /auth/me` → 401 (pytest) | ✅ |
| Role guard: USER → 403, ADMIN → 200 on `/admin/ping` (pytest) | ✅ |
| Google OAuth creates user + sets cookie (manual QA) | ⏳ Requires OAuth credentials |
| GitHub OAuth creates user + stores token (manual QA) | ⏳ Requires OAuth credentials |
| Middleware redirects `/dashboard` → `/login` (Playwright) | ✅ Configured |

---

## Definition of Done

- [x] Backend tests pass in CI
- [x] Frontend lint + build pass in CI
- [ ] API deployed to Railway; `GET /health` returns 200
- [ ] Frontend deployed to Vercel; login page loads
- [ ] Google OAuth login creates a user in Neon DB
- [ ] GitHub OAuth login creates a user and stores access token
- [x] JWT cookie settings implemented (`httpOnly`, `Secure`, `SameSite=Lax`)
- [x] Protected `/dashboard` redirects unauthenticated users to `/login`
- [ ] Sentry captures test error in both apps (requires DSN)
- [x] All environment variables documented in `.env.example`

---

## Environment Variables (Phase 1)

```bash
# backend/.env
DATABASE_URL=            # Neon PostgreSQL or sqlite:///./placementos.db
REDIS_URL=               # Upstash Redis URL (Phase 2+)
REDIS_TOKEN=             # Upstash token
JWT_SECRET=              # 256-bit random secret
JWT_REFRESH_SECRET=      # Separate secret for refresh tokens
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:8000
SENTRY_DSN=
COOKIE_SECURE=false      # true in production
COOKIE_SAMESITE=lax

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
INTERNAL_API_URL=http://localhost:8000
NEXT_PUBLIC_SENTRY_DSN=
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Neon DB cold starts causing high latency | Enable connection pooling via Neon's PgBouncer |
| GitHub OAuth token scope too narrow | Request `user:email, read:user, repo` upfront |
| Separate apps slower to develop than monorepo | Shared API contract documented in `frontend/src/lib/api.ts`; OpenAPI at `/docs` in dev |
| Cookie SameSite issues in dev | Cookies on `localhost` are shared across ports; use `COOKIE_SECURE=true` + HTTPS in production |
| Python 3.14 incompatibility | Pin to **Python 3.13** (see `backend/.python-version`) |
