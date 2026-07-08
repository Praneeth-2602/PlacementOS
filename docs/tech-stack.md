# PlacementOS — Tech Stack & Architecture

This document is the source of truth for the **revised stack** (Python backend + Next.js frontend). Phase docs reference this instead of the original NestJS/Turborepo plan.

---

## Repository Layout

```
PlacementOS/
├── backend/                 # FastAPI API (Python 3.13)
│   ├── app/
│   │   ├── main.py          # App factory, middleware, routers
│   │   ├── config.py        # Pydantic Settings
│   │   ├── database.py      # SQLAlchemy engine + session
│   │   ├── deps.py          # Auth dependencies + role guards
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── routers/         # Route handlers (health, auth, …)
│   │   ├── services/        # Business logic
│   │   └── middleware/      # Logging, error formatting
│   ├── alembic/             # Database migrations
│   ├── tests/               # pytest integration tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                # Next.js 14 App Router (TypeScript)
│   ├── src/
│   │   ├── app/             # Pages + layouts
│   │   ├── components/      # UI + layout components
│   │   ├── lib/             # API client, utils
│   │   ├── stores/          # Zustand stores
│   │   └── middleware.ts    # Route protection
│   ├── e2e/                 # Playwright tests
│   └── vercel.json
├── docs/                    # Phase specifications
└── .github/workflows/       # CI
```

---

## Stack Mapping (Original → Current)

| Concern | Original plan | Current implementation |
|---------|---------------|----------------------|
| Monorepo | Turborepo + pnpm | **`backend/` + `frontend/`** (independent apps) |
| API framework | NestJS (`apps/api/`) | **FastAPI** (`backend/`) |
| ORM / migrations | Prisma | **SQLAlchemy 2.0 + Alembic** |
| Validation | Zod (`packages/zod-schemas`) | **Pydantic** (backend), **TypeScript types** (frontend `lib/api.ts`) |
| OAuth | Passport.js | **Authlib** (Google + GitHub) |
| Session / auth (web) | NextAuth.js v5 | **API-managed OAuth** → JWT httpOnly cookies |
| Background jobs | BullMQ (Node) | **ARQ** (planned, Phase 2+) — async Redis workers for FastAPI |
| Job dashboard | Bull Board | **ARQ dashboard** or custom admin endpoint |
| Cache | Upstash Redis | **redis-py** client (Upstash-compatible) |
| Email | Resend + React Email | **Resend** + **Jinja2/HTML templates** (Phase 4) |
| File storage | Cloudflare R2 via AWS SDK | **boto3** with R2 endpoint (Phase 4) |
| PDF parsing | pdf-parse (Node) | **pypdf** or **pdfplumber** (Phase 4) |
| PDF export | Puppeteer | **WeasyPrint** or **Playwright** (Phase 4) |
| AI | Anthropic SDK (TS) | **anthropic** Python SDK (Phase 5) |
| Rate limiting | @nestjs/throttler | **slowapi** (Phase 5) |
| Security headers | Helmet.js | **Starlette middleware** / custom headers (Phase 5) |
| Frontend | Next.js 14 (`apps/web/`) | **Next.js 14** (`frontend/`) |
| Styling | Tailwind + shadcn/ui | Tailwind + shadcn-style components |
| State | Zustand | Zustand |
| Data fetching | TanStack Query | TanStack Query |
| E2E tests | Playwright | Playwright |
| API tests | Jest/supertest | **pytest + httpx TestClient** |
| CI | pnpm lint/build | **GitHub Actions** — backend pytest + frontend lint/build |
| API deploy | Railway (Docker) | Railway / Docker (`backend/Dockerfile`) |
| Web deploy | Vercel | Vercel (`frontend/vercel.json`) |

---

## Authentication Flow

```
1. User clicks "Continue with Google/GitHub" on /login
2. Browser redirects to {API_URL}/auth/{provider}
3. OAuth provider authenticates → callback hits {API_URL}/auth/{provider}/callback
4. Backend creates/updates User + OAuthAccount, sets access_token + refresh_token cookies
5. Backend redirects to {FRONTEND_URL}/dashboard
6. Frontend middleware forwards cookies to GET /auth/me for protected routes
7. TanStack Query hydrates user store from /auth/me on dashboard load
```

**Cookie settings:** `httpOnly`, `Secure` (production), `SameSite=Lax`, scoped to `localhost` in dev (shared across ports).

---

## API Conventions

### Success envelope
```json
{ "success": true, "data": { ... }, "message": null }
```

### Error format (RFC 7807)
```json
{
  "type": "about:blank",
  "title": "HTTP Error",
  "status": 401,
  "detail": "Not authenticated",
  "instance": "/auth/me"
}
```

### Auth guards
- `get_current_user` — JWT from `access_token` cookie (FastAPI dependency)
- `require_roles(UserRole.ADMIN)` — role-based guard (replaces NestJS `RolesGuard`)

---

## Database

- **Production:** Neon PostgreSQL (`DATABASE_URL` + `psycopg[binary]`)
- **Local dev:** SQLite (`sqlite:///./placementos.db`)
- **Migrations:** `alembic upgrade head`
- **Seeding (Phase 3+):** Python script in `backend/scripts/seed.py`

All 22 tables are defined in Phase 1 (`backend/app/models/entities.py`).

---

## Environment Variables

| Variable | App | Purpose |
|----------|-----|---------|
| `DATABASE_URL` | backend | PostgreSQL or SQLite connection |
| `REDIS_URL` / `REDIS_TOKEN` | backend | Upstash Redis |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | backend | Token signing |
| `GOOGLE_CLIENT_ID` / `SECRET` | backend | Google OAuth |
| `GITHUB_CLIENT_ID` / `SECRET` | backend | GitHub OAuth |
| `FRONTEND_URL` | backend | Post-OAuth redirect target |
| `API_URL` | backend | OAuth callback base URL |
| `SENTRY_DSN` | backend | Error reporting |
| `NEXT_PUBLIC_API_URL` | frontend | API base for client fetches |
| `INTERNAL_API_URL` | frontend | API base for middleware (server-side) |
| `NEXT_PUBLIC_SENTRY_DSN` | frontend | Client error reporting |

---

## Commands Cheat Sheet

```bash
# Backend
cd backend && source .venv/bin/activate
alembic upgrade head          # run migrations
uvicorn app.main:app --reload --port 8000
pytest -q                     # run tests

# Frontend
cd frontend
npm run dev                   # http://localhost:3000
npm run build
npm run test:e2e              # Playwright (requires running servers)
```
