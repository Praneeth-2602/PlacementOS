# Phase 4 — Resume Module, Build Module & Full Platform Polish
**Duration**: Weeks 10–13  
**Status**: ✅ Implemented (local)  
**Goal**: Resume upload + ATS scoring, Build module (project CRUD + GitHub linkage), dark mode, mobile responsiveness, notifications, and Storybook. The platform is feature-complete.

**Depends on**: Phase 3 complete (all core modules live).

> **Stack notes:** PDF parsing via **pypdf**; R2 uploads via **boto3**; PDF export via **WeasyPrint**; emails via **Resend** + Jinja2 templates. Storybook in `frontend/`. See [`tech-stack.md`](./tech-stack.md).

---

## Objectives

Complete the remaining two feature modules (Resume and Build) and bring the platform to production-quality polish — notifications, dark mode, mobile layout, component docs, and performance optimizations.

---

## Deliverables

### Resume Module (Backend)
- Resume Upload:
  - `POST /resume/upload` — multipart form-data → Cloudflare R2 signed upload URL → store `fileUrl` in `Resume` record
  - File validation: PDF only, max 5MB
  - Cloudflare R2 via **boto3** (S3-compatible client with custom endpoint)
- Resume CRUD:
  - `GET /resume` — list all resume versions for user
  - `GET /resume/:id` — get resume with `atsAnalysis` breakdown
  - `POST /resume` — create resume record (JSON builder mode — no file)
  - `PUT /resume/:id` — update `jsonData`, `targetRole`, `versionName`
  - `DELETE /resume/:id` — deletes record + R2 object
  - `PUT /resume/:id/default` — mark as default (unmarks previous default)
- ATS Analysis (`POST /resume/:id/analyze`):
  - Extracts text from uploaded PDF (via **pypdf** or **pdfplumber**)
  - Runs rule-based ATS scoring against a fixed rubric:
    - Contact info present (10 pts)
    - Education section present with CGPA (10 pts)
    - Work experience / projects section (20 pts)
    - Skills section with recognized keywords (20 pts)
    - Action verbs used in bullet points (15 pts)
    - Quantified achievements (numbers in bullets) (15 pts)
    - Resume length ≤ 2 pages (10 pts)
  - Stores `atsScore` (0–100) + `atsAnalysis` JSON breakdown in `Resume` record
  - Triggers `ReadinessEngine.recalculate()` so ResumeScorer picks up new score
- `POST /resume/:id/export` — generate PDF from `json_data` (using **WeasyPrint** or Playwright headless render); returns signed R2 URL for download

### Build Module (Backend)
- Projects CRUD:
  - `GET /build/projects` — user's projects list
  - `POST /build/projects` — create project (name, description, techStack, githubUrl, deploymentUrl, status)
  - `PUT /build/projects/:id` — update project
  - `DELETE /build/projects/:id`
  - `PUT /build/projects/:id/feature` — toggle `isFeatured`
- GitHub Repo Linkage:
  - `PUT /build/projects/:id/link-repo` — links a project to a `GitHubRepo` by `repoId`
  - When linked, project inherits repo's stars, last pushed date, language
- Portfolio View:
  - `GET /build/portfolio` — returns featured projects + featured GitHub repos as a combined portfolio object
  - Designed to be shareable (public URL `/u/:username/portfolio` in V2)

### Notifications Module (Backend)
- In-app notifications:
  - `GET /notifications` — list (unread first), paginated
  - `PUT /notifications/:id/read` — mark single as read
  - `PUT /notifications/read-all` — mark all as read
  - `GET /notifications/unread-count` — for badge in topbar
- ARQ notification jobs:
  - `SYNC_COMPLETE` — emitted by LeetCode/GitHub processors on success
  - `DEADLINE_REMINDER` — nightly scheduler checks opportunities with deadline ≤ 24h
  - `STREAK_ALERT` — daily scheduler at 8 PM if no activity logged today
  - `GOAL_ACHIEVED` — triggered when weekly goal DSA/CS target is hit
  - `SCORE_UPDATE` — emitted by ReadinessEngine when score improves by ≥ 5 points
- Email notifications via Resend:
  - Jinja2/HTML templates: `deadline-reminder`, `welcome`, `weekly-digest`
  - `weekly-digest` sent Sundays (ARQ cron job)
- Email preferences: `PUT /users/settings` includes `emailDeadlineReminders: boolean`, `emailWeeklyDigest: boolean`

### Frontend — Resume Module
- `/resume/page.tsx`:
  - List of resume versions with version name, ATS score badge, default indicator
  - Upload button → drag-and-drop PDF uploader
  - Post-upload: auto-trigger ATS analysis, show progress spinner
  - `ATSScore` component — circular score dial + category breakdown accordion
  - "Analyze" button to re-run analysis
  - Download button for uploaded PDF or exported PDF
  - Set as Default button
- `/resume/builder/page.tsx` (JSON Builder):
  - `ResumeEditor` — sectioned editor: Personal Info, Education, Experience, Projects, Skills, Certifications
  - Live preview pane (right side) showing formatted resume template
  - Export to PDF button
  - Auto-save to `PUT /resume/:id` on blur (debounced 2s)
  - `SectionBlock` component — collapsible, reorderable section (drag-handle)

### Frontend — Build Module
- `/build/page.tsx` — tabs: Projects | GitHub Repos | Portfolio Preview
- Projects tab:
  - `ProjectCard` grid — name, tech stack chips, status badge, GitHub/deployment links
  - Add project dialog — full form with tech stack multi-select
  - Edit/delete actions
  - Featured toggle (gold star)
  - Link to GitHub repo dropdown (shows synced repos)
- GitHub Repos tab:
  - `RepoCard` grid — repo name, language, stars, last push date, description
  - Feature toggle (marks for portfolio)
  - Opens GitHub in new tab
  - `CommitGraph` — 52-week contribution calendar (from Phase 2)
- Portfolio Preview tab:
  - Combined view of featured projects + featured repos
  - Preview of the public portfolio page (future sharable link)

### Dark Mode & Theming
- `ThemeProvider` using `next-themes`
- Toggle in sidebar footer: Light / Dark / System
- All shadcn/ui components respect `dark:` variants automatically
- CSS variables for theme tokens in `globals.css`:
  - `--background`, `--foreground`, `--primary`, `--muted`, `--accent`, `--border`
- Saved to `localStorage` and to user settings in DB (`PUT /users/settings`)

### Mobile Responsiveness
- Sidebar converts to bottom nav bar on mobile (< 768px)
- `MobileNav` component — icon-only tab bar at bottom
- All pages tested on 375px and 390px viewport widths
- Kanban columns collapse to vertical stack on mobile
- Tables convert to card list on mobile
- Topbar simplifies to logo + hamburger on mobile

### Performance Optimizations
- `next/image` for all images with proper `sizes` prop
- Dynamic imports for heavy components (ResumeEditor, CommitGraph)
- TanStack Query prefetching on hover for nav links
- `React.memo` on `QuestionCard`, `RepoCard`, `ProjectCard` (static after load)
- Route-level code splitting via Next.js App Router (default behavior)

### Storybook Setup
- Storybook initialized in `frontend/`
- Stories for all shared components:
  - `StatCard.stories.tsx`
  - `ReadinessBar.stories.tsx`
  - `EmptyState.stories.tsx`
  - `LoadingSkeleton.stories.tsx`
  - `SyncButton.stories.tsx`
  - `ATSScore.stories.tsx`
  - `ReadinessGauge.stories.tsx`

---

## Cloudflare R2 Integration

```python
# R2 client config (boto3)
import boto3
from botocore.config import Config

r2_client = boto3.client(
    "s3",
    endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    config=Config(signature_version="s3v4"),
)

# Generate presigned upload URL (5-min TTL)
upload_url = r2_client.generate_presigned_url(
    "put_object",
    Params={"Bucket": "placementos-resumes", "Key": f"{user_id}/{resume_id}.pdf", "ContentType": "application/pdf"},
    ExpiresIn=300,
)
```

---

## API Endpoints (Phase 4 Additions)

```
# Resume
GET    /resume
GET    /resume/:id
POST   /resume
PUT    /resume/:id
DELETE /resume/:id
PUT    /resume/:id/default
POST   /resume/upload
POST   /resume/:id/analyze
POST   /resume/:id/export

# Build
GET    /build/projects
POST   /build/projects
PUT    /build/projects/:id
DELETE /build/projects/:id
PUT    /build/projects/:id/feature
PUT    /build/projects/:id/link-repo
GET    /build/portfolio

# Notifications
GET    /notifications
PUT    /notifications/:id/read
PUT    /notifications/read-all
GET    /notifications/unread-count

# User Settings
PUT    /users/settings
GET    /users/profile
PUT    /users/profile
```

---

## Testing Requirements

- ATS scorer returns expected score for known resume PDF (unit test with fixture PDF)
- R2 upload URL generation returns valid signed URL (integration, mocked R2)
- Resume export generates downloadable PDF (integration — WeasyPrint in CI)
- Notification badge count matches unread count in DB (integration)
- Dark mode toggle persists across page reload (E2E)
- Resume page fully usable on 375px mobile viewport (Playwright)

---

## Definition of Done

- [ ] User can upload a PDF resume and see ATS score < 10s
- [ ] User can create a project and link it to a GitHub repo
- [ ] In-app notification bell shows unread count; marks as read
- [ ] Welcome email sent to new user (verified via Resend dashboard)
- [ ] Dark mode works on all pages without flash on load
- [ ] All pages render correctly on iPhone SE (375px)
- [ ] Storybook builds without errors (`npm run storybook` in `frontend/`)
- [ ] Resume PDF export downloads a formatted PDF from `jsonData`

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Puppeteer/WeasyPrint in CI slow/flaky | Run PDF export in production worker container; use presigned URL with 1hr TTL for async generation |
| R2 CORS issues for direct browser upload | Configure R2 bucket CORS to allow frontend origin; validate content-type server-side |
| ATS scorer too simplistic → low user trust | Show score breakdown (not just number) so users understand the criteria |
| Mobile Kanban UX poor | Provide table view as primary on mobile; Kanban as desktop-only |
