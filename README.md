# PlacementOS

A placement preparation platform that unifies DSA progress, GitHub activity, CS fundamentals, mock interviews, resume scoring, and job tracking into a single **readiness score** — so students know exactly where they stand and what to do next.

**Stack:** FastAPI (Python) backend · Next.js 14 frontend · PostgreSQL · Redis

---

## What PlacementOS Does

| Module | Purpose | Phase |
|--------|---------|-------|
| **Dashboard** | Readiness gauge, today's plan, streaks, weekly goals | 2–3 |
| **Learn** | LeetCode stats, CS fundamentals (OS/DBMS/CN/OOP), aptitude, notes | 2–3 |
| **Prepare** | Technical + HR question bank, STAR templates, mock sessions, Interview Twin (AI) | 3, 5 |
| **Opportunities** | Job tracker with Kanban, deadlines, calendar sync | 3, 5 |
| **Resume** | PDF upload, ATS scoring (V1 + JD-aware V2), JSON builder, export | 3–5 |
| **Build** | Project portfolio, GitHub repo linkage, featured projects | 4 |
| **Track** | Analytics hub — heatmaps, score history, peer benchmarks | 5 |

### Readiness Engine

Six weighted dimensions combine into an overall 0–100 score:

```
overall = dsa(30%) + cs(20%) + projects(20%) + interview(15%) + resume(10%) + opportunities(5%)
```

Data flows in from LeetCode sync, GitHub sync, CS topic progress, mock sessions, resume ATS, and application activity.

---

## Implementation Status

All five phases are implemented locally. Production deploy and live third-party credentials are still pending.

### Phase 1 — Foundation ✅

| Area | Status | Notes |
|------|--------|-------|
| Repo structure (`backend/` + `frontend/`) | ✅ | Replaces original Turborepo plan |
| Full database schema + Alembic migrations | ✅ | Migrations `001`, `002` |
| Google + GitHub OAuth | ✅ | Authlib; needs OAuth app credentials |
| JWT httpOnly cookies + refresh | ✅ | |
| Auth guards (JWT + roles) | ✅ | Tested via `/admin/ping` |
| Health endpoint | ✅ | `GET /health` |
| Login page + OAuth buttons | ✅ | |
| Dashboard shell + sidebar nav | ✅ | |
| Route protection middleware | ✅ | Playwright E2E configured |
| Zustand stores + TanStack Query | ✅ | |
| CI (pytest + lint/build) | ✅ | `.github/workflows/ci.yml` |
| Docker + Vercel config | ✅ | |
| Production deploy | ⏳ | Railway + Vercel not yet configured |
| Sentry live errors | ⏳ | Hooks ready; needs DSN |

### Phase 2 — Integrations ✅

| Area | Status |
|------|--------|
| LeetCode sync (GraphQL) + stats/topics API | ✅ |
| GitHub sync (REST + GraphQL) + repos/activity API | ✅ |
| Readiness engine (DSA + Projects scorers) | ✅ |
| Dashboard aggregation API | ✅ |
| SSE sync status streams | ✅ |
| ARQ workers (with inline fallback when no Redis) | ✅ |
| Redis caching (stats + dashboard) | ✅ |
| Frontend: ReadinessGauge, sync controls, charts | ✅ |
| Learn page: topic progress grid | ✅ |

### Phase 3 — Learn, Prepare, Opportunities ✅

| Area | Status |
|------|--------|
| Learn: CS fundamentals + Aptitude progress APIs | ✅ |
| Notes CRUD | ✅ |
| Prepare: question bank, STAR templates, mock sessions | ✅ |
| Opportunities: CRUD, status state machine, deadlines, calendar | ✅ |
| Full 6-category readiness engine + recommendations | ✅ |
| Dashboard today's plan + recent activity + streaks/weekly goals | ✅ |
| Seed script (`python -m scripts.seed`) | ✅ |
| Frontend: Learn tabs, Prepare tabs, Opportunities Kanban/table | ✅ |

### Phase 4 — Resume, Build, Polish ✅

| Area | Status |
|------|--------|
| Resume CRUD, PDF upload, ATS V1 analyze, export | ✅ |
| Build projects CRUD, GitHub repo link, portfolio | ✅ |
| Notifications list / read / unread badge | ✅ |
| User profile + settings (email prefs) | ✅ |
| Dark mode / theme toggle | ✅ |
| Mobile bottom nav | ✅ |
| Storybook scaffold (`npm run storybook`) | ✅ |
| Frontend: resume page + builder, build page, notifications bell | ✅ |

### Phase 5 — Intelligence & Hardening ✅

| Area | Status |
|------|--------|
| Interview Twin (`/prepare/interview-twin`) Claude + mock fallback | ✅ |
| ATS V2 (JD keyword match, suggestions) | ✅ |
| Company readiness + peer benchmarks | ✅ |
| Track analytics (heatmap, score history, radar, weekly report) | ✅ |
| Google Calendar sync endpoints | ✅ |
| Push subscribe/unsubscribe + SW stub | ✅ |
| Security headers + slowapi rate limiting | ✅ |
| Frontend: Interview Twin chat, `/track` charts, benchmark cards | ✅ |

---

## Repository Structure

```
PlacementOS/
├── backend/                 # FastAPI API (Python 3.13)
│   ├── app/
│   │   ├── routers/         # auth, learn, prepare, opportunities, resume, build, track, …
│   │   ├── models/          # SQLAlchemy ORM
│   │   ├── services/        # Sync, readiness, ATS, jobs, notifications
│   │   ├── schemas/         # Pydantic request/response types
│   │   ├── workers/         # ARQ background jobs
│   │   └── middleware/      # Logging, RFC 7807, security headers
│   ├── alembic/             # Migrations (001 init, 002 phase3–5)
│   ├── scripts/             # Seed data (CS, aptitude, questions)
│   ├── tests/               # pytest
│   └── Dockerfile
├── frontend/                # Next.js 14 App Router
│   ├── src/app/             # login, dashboard, learn, prepare, opportunities, resume, build, track
│   ├── src/components/      # UI, sidebar, mobile nav, dashboard widgets
│   ├── src/hooks/           # TanStack Query hooks
│   ├── src/stores/          # Zustand (ui, user, sync)
│   ├── src/lib/api.ts       # Typed API client
│   ├── .storybook/          # Storybook
│   └── e2e/                 # Playwright tests
├── docs/                    # Phase specs + tech-stack.md
└── .github/workflows/ci.yml
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | FastAPI, SQLAlchemy 2.0, Alembic, Pydantic, Authlib, ARQ |
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, shadcn-style UI, Recharts |
| **State / data** | Zustand, TanStack Query |
| **Database** | PostgreSQL (Neon) / SQLite for local dev |
| **Cache / jobs** | Upstash Redis; ARQ workers |
| **Auth** | Google + GitHub OAuth → JWT httpOnly cookies |
| **AI / ATS** | Anthropic Claude (Interview Twin); rule-based ATS V1/V2 |
| **Storage / email** | Local uploads or Cloudflare R2; Resend (optional) |
| **Testing** | pytest (API), Playwright (E2E), Storybook |
| **Deploy** | Railway (API), Vercel (frontend) |

Full stack mapping: [`docs/tech-stack.md`](./docs/tech-stack.md)

---

## Quick Start

### Prerequisites

- **Python 3.13** (3.14 is not yet supported by all dependencies)
- **Node.js 20+**
- Google and/or GitHub OAuth app (for login)

### Backend

```bash
cd backend
python3.13 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # fill in OAuth credentials
alembic upgrade head
python -m scripts.seed           # CS topics, aptitude, 200+ questions
uvicorn app.main:app --reload --port 8000
```

Optional (background jobs when Redis is configured):

```bash
arq app.workers.settings.WorkerSettings
```

API docs (dev): [http://localhost:8000/docs](http://localhost:8000/docs)

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated users are redirected to `/login`.

### OAuth Callback URLs

```
http://localhost:8000/auth/google/callback
http://localhost:8000/auth/github/callback
```

### Run Tests

```bash
# Backend
cd backend && source .venv/bin/activate && pytest -q

# Frontend build
cd frontend && npm run build

# Storybook
cd frontend && npm run storybook

# E2E (both servers must be running)
cd frontend && npm run test:e2e
```

---

## API Surface (by phase)

### Phase 1 — Auth / health
`GET /health` · `GET /auth/{google,github}` · callbacks · `POST /auth/logout` · `POST /auth/refresh` · `GET /auth/me` · `GET /admin/ping`

### Phase 2 — Integrations
`/leetcode/*` · `/github/*` · `/readiness` · `/readiness/recalculate` · `/dashboard` · `/dashboard/today`

### Phase 3 — Study modules
`/learn/*` · `/notes/*` · `/prepare/questions` · `/prepare/sessions` · `/prepare/star-templates` · `/opportunities/*` · `/readiness/recommendations` · `/dashboard/recent-activity`

### Phase 4 — Resume / Build / polish
`/resume/*` · `/build/*` · `/notifications/*` · `/users/profile` · `/users/settings`

### Phase 5 — Intelligence
`/prepare/interview-twin/*` · `/resume/:id/analyze-v2` · `/readiness/by-company/:company` · `/readiness/benchmarks` · `/track/*` · calendar sync · push subscribe

Full endpoint details live in [`docs/`](./docs/).

---

## Environment Variables

| File | Key variables |
|------|---------------|
| `backend/.env` | `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_*`, `GITHUB_CLIENT_*`, `FRONTEND_URL`, `API_URL`, `REDIS_URL` |
| `backend/.env` (optional Phase 4–5) | `ANTHROPIC_API_KEY`, `R2_*`, `RESEND_API_KEY`, `SENTRY_DSN` |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL`, `INTERNAL_API_URL`, `NEXT_PUBLIC_SENTRY_DSN` |

See `.env.example` in each app for the full list.

Without optional keys the app still runs: Interview Twin uses mock responses, resumes store locally under `uploads/`, and emails are logged instead of sent.

---

## Deployment

| App | Platform | Config |
|-----|----------|--------|
| Backend | Railway / Docker | `backend/Dockerfile` |
| Frontend | Vercel | `frontend/vercel.json` |

**Production checklist:**
1. Set `DATABASE_URL` to Neon PostgreSQL and `pip install 'psycopg[binary]'`
2. Set strong `JWT_SECRET` / `JWT_REFRESH_SECRET`
3. Set `COOKIE_SECURE=true`, `FRONTEND_URL` and `API_URL` to production domains
4. Configure OAuth callbacks for production API URL
5. Set `REDIS_URL` and run the ARQ worker
6. Optionally set `ANTHROPIC_API_KEY`, `R2_*`, `RESEND_API_KEY`, `SENTRY_DSN`

---

## Roadmap

| Phase | Weeks | Focus | Status |
|-------|-------|-------|--------|
| **1** | 1–3 | Auth, DB schema, CI/CD, dashboard shell | ✅ Implemented |
| **2** | 4–6 | LeetCode + GitHub sync, readiness scoring | ✅ Implemented |
| **3** | 7–9 | Learn, Prepare, Opportunities modules | ✅ Implemented |
| **4** | 10–13 | Resume, Build, notifications, polish | ✅ Implemented |
| **5** | 14–20 | AI Interview Twin, analytics, hardening | ✅ Implemented |

---

## Development Notes

- Cookies on `localhost` are shared across ports — API on `:8000` and frontend on `:3000` work together in dev.
- The frontend does **not** use NextAuth. OAuth is handled by the FastAPI backend; the frontend redirects to API auth routes and reads session state via `GET /auth/me`.
- Without Redis, sync jobs run **inline** (good for local dev). With `REDIS_URL`, run the ARQ worker for background processing.
- For PostgreSQL in production: install `psycopg[binary]` separately (`pip install 'psycopg[binary]'`).
- Seed after migrate: `python -m scripts.seed`.
