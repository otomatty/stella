# AGENTS.md

## Cursor Cloud-specific instructions

### Overview

FALCON INFORMAL is a Learning Management System (LMS) monorepo using **Bun workspaces**. The main packages are:

| Package | Path | Purpose |
|---------|------|---------|
| `@falcon/web` | `apps/web` | Vite + React frontend → Cloudflare Workers (Static Assets, `falcon-web`; port 5173 dev) |
| `@falcon/api` | `apps/api` | Hono API on Cloudflare Workers (port 8787) |
| `@falcon/shared` | `packages/shared` | Types, curriculum, grading logic |
| `@falcon/code-runner` | `packages/code-runner` | QuickJS WASM + sql.js in-browser runners |

### Running services (default: real data)

```bash
bun run dev:api    # Wrangler (Cloudflare Workers) on :8787 — start this first
bun run dev        # Vite on :5173 — requires apps/web/.env.local with VITE_SERVER_URL
```

**Default local loop:** copy env from examples → `bun run db:migrate && bun run db:seed && bun run smoke:d1` → `dev:api` + `dev` → Google login → D1-backed UI. See `README.md` setup section for role promotion (`admin` / `instructor`) and the manual verification checklist.

**Demo-only (not for day-to-day work):** If `VITE_SERVER_URL` is unset, the web app uses fixture data and a mock login flow. Tweaks panel (backtick `` ` ``) can switch Learner / Instructor / Admin without D1. Treat this as a prototype demo path only.

**Stack:** Cloudflare D1 (DB) + Google OAuth + R2 (materials) + Workers Static Assets (frontend, migrated from Pages). See `docs/cloudflare-stack.md`.

**Deploy:** GitHub Actions only — no manual `wrangler` deploys for the normal flow. `.github/workflows/ci.yml` gates PRs (lint/typecheck/test/build); `.github/workflows/deploy.yml` runs on push to `main` (gate → D1 migrate remote → deploy:api → deploy:web). Requires repo Secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` and Variables `VITE_SERVER_URL` / `VITE_MATERIALS_BASE_URL`. See `docs/ci-cd.md`.

**DB setup (local):** `bun run db:migrate && bun run db:seed && bun run smoke:d1`

**Instructor review (Issue #8 / P3):** With the API running, submissions go through `/api/submissions` (D1). `POST /api/review-draft` generates AI review drafts (heuristic fallback without `ANTHROPIC_API_KEY`). localStorage `lms_submissions_v1` remains a demo/offline remnant — not the default path.

### Key caveats

- **Vite dev server + browser resource limits**: The app loads many ES modules in dev mode. If the browser shows `ERR_INSUFFICIENT_RESOURCES`, use `bun run build` then `bun run preview` as an alternative for manual testing.
- **Env files**: `apps/web/.env.local` and `apps/api/.dev.vars` are gitignored. Copy from `.example`. For the default real-data path set `VITE_SERVER_URL=http://127.0.0.1:8787` in `.env.local`, and `AUTH_JWT_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` in `.dev.vars`.
- **Wrangler**: The API dev server uses `wrangler dev`. On first run it may print a telemetry notice; this is not an error.

### Lint / Typecheck / Build

```bash
bun run typecheck  # tsc --noEmit across all workspaces
bun run build      # Full production build (web uses Vite)
```

There is no separate ESLint config at the repo level. TypeScript strict mode (`tsc --noEmit`) serves as the primary static analysis.

### Testing

No automated test framework (Jest/Vitest) is configured in this repo. Validation is done via typecheck + manual testing of the running app.
