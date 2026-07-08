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

### Phase 1 — Foundation ✅ (implemented locally)

| Area | Status | Notes |
|------|--------|-------|
| Repo structure (`backend/` + `frontend/`) | ✅ | Replaces original Turborepo plan |
| Full database schema (22 tables) | ✅ | SQLAlchemy + Alembic |
| Google + GitHub OAuth | ✅ | Authlib; needs OAuth app credentials |
| JWT httpOnly cookies + refresh | ✅ | |
| Auth guards (JWT + roles) | ✅ | Tested via `/admin/ping` |
| Health endpoint | ✅ | `GET /health` |
| Login page + OAuth buttons | ✅ | |
| Dashboard shell + sidebar nav | ✅ | Stub pages for all modules |
| Route protection middleware | ✅ | Playwright E2E configured |
| Zustand stores + TanStack Query | ✅ | |
| CI (pytest + lint/build) | ✅ | `.github/workflows/ci.yml` |
| Docker + Vercel config | ✅ | |
| Production deploy | ⏳ | Railway + Vercel not yet configured |
| Sentry live errors | ⏳ | Hooks ready; needs DSN |

### Phase 2 — Integrations ✅ (implemented locally)

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

### Phases 3–5 ✅ (implemented locally)

| Phase | Highlights |
|-------|------------|
| **3** | Learn (CS/Aptitude/Notes), Prepare (question bank, mock sessions, STAR), Opportunities (Kanban + state machine), full readiness engine, dashboard today plan |
| **4** | Resume upload/ATS/export, Build projects + portfolio, notifications, dark mode, mobile nav, theme toggle |
| **5** | Interview Twin (Claude/mock), ATS V2 + JD matching, company readiness, benchmarks, `/track` analytics, rate limiting, security headers |

Run seed data: `cd backend && python -m scripts.seed`

See [`docs/`](./docs/) for full specifications.

---

## Repository Structure

```
PlacementOS/
├── backend/                 # FastAPI API (Python 3.13)
│   ├── app/
│   │   ├── routers/         # health, auth, admin (more in Phase 2+)
│   │   ├── models/          # SQLAlchemy ORM (all 22 tables)
│   │   ├── services/        # Business logic
│   │   ├── schemas/         # Pydantic request/response types
│   │   └── middleware/      # Logging, RFC 7807 errors
│   ├── alembic/             # Database migrations
│   ├── tests/               # pytest
│   └── Dockerfile
├── frontend/                # Next.js 14 App Router
│   ├── src/app/             # Pages (login, dashboard, module stubs)
│   ├── src/components/      # UI + sidebar
│   ├── src/stores/          # Zustand (ui, user, sync)
│   ├── src/lib/api.ts       # API client + TypeScript types
│   └── e2e/                 # Playwright tests
├── docs/
│   ├── tech-stack.md        # Architecture reference (start here)
│   ├── phase-1-foundation.md
│   ├── phase-2-integrations.md
│   ├── phase-3-learn-prepare-opportunities.md
│   ├── phase-4-resume-build-polish.md
│   └── phase-5-intelligence-hardening.md
└── .github/workflows/ci.yml
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | FastAPI, SQLAlchemy 2.0, Alembic, Pydantic, Authlib |
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, shadcn-style UI |
| **State / data** | Zustand, TanStack Query |
| **Database** | PostgreSQL (Neon) / SQLite for local dev |
| **Cache / jobs** | Upstash Redis; ARQ workers (Phase 2+) |
| **Auth** | Google + GitHub OAuth → JWT httpOnly cookies |
| **Testing** | pytest (API), Playwright (E2E) |
| **Deploy** | Railway (API), Vercel (frontend) |

Full stack mapping from the original NestJS plan: [`docs/tech-stack.md`](./docs/tech-stack.md)

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
python -m scripts.seed          # CS topics, aptitude, 200+ questions
uvicorn app.main:app --reload --port 8000
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

Register these in your Google/GitHub OAuth apps:

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

# E2E (both servers must be running)
cd frontend && npm run test:e2e
```

---

## API Endpoints (Phase 1)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/auth/google` | Google OAuth redirect |
| `GET` | `/auth/google/callback` | Google callback → sets cookies |
| `GET` | `/auth/github` | GitHub OAuth redirect |
| `GET` | `/auth/github/callback` | GitHub callback → sets cookies |
| `POST` | `/auth/logout` | Clear cookies |
| `POST` | `/auth/refresh` | Rotate JWT |
| `GET` | `/auth/me` | Current user + integrations |
| `GET` | `/admin/ping` | Admin-only (role guard test) |

Phase 2+ endpoints are documented in the respective phase files under `docs/`.

---

## Environment Variables

| File | Key variables |
|------|---------------|
| `backend/.env` | `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_*`, `GITHUB_CLIENT_*`, `FRONTEND_URL`, `API_URL` |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL`, `INTERNAL_API_URL` |

See `.env.example` in each app for the full list.

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
5. Set `SENTRY_DSN` in both apps

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
- The frontend does **not** use NextAuth. OAuth is handled entirely by the FastAPI backend; the frontend redirects to API auth routes and reads session state via `GET /auth/me`.
- Redis client is wired in Phase 1 but actively used starting Phase 2 (sync jobs, caching).
- For PostgreSQL in production: install `psycopg[binary]` separately (`pip install 'psycopg[binary]'`).
