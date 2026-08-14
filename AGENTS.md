# AGENTS.md

## Cursor Cloud-specific instructions

### Overview

FALCON INFORMAL is a Learning Management System (LMS) monorepo using **Bun workspaces**. The main packages are:

| Package | Path | Purpose |
|---------|------|---------|
| `@falcon/web` | `apps/web` | Vite + React frontend → Cloudflare Workers (Static Assets, `falcon-web`; port 5173 dev). Login / video / docs / quiz / CMS — not learner code exercises |
| `@falcon/api` | `apps/api` | Hono API on Cloudflare Workers (port 8787) |
| `informal` (`falcon.informal`) | `apps/vscode` | VS Code extension for learner code exercises. F5 Extension Development Host; settings `falcon.serverUrl` / `falcon.webUrl` |
| `@falcon/shared` | `packages/shared` | Types, curriculum, grading logic |
| `@falcon/code-runner` | `packages/code-runner` | QuickJS WASM + sql.js runners (extension grader WebView + admin AssignmentEditor) |
| `@falcon/content` | `packages/content` | 研修教材の正本（スライド / ドキュメント / 演習）。執筆ルールは `packages/content/CLAUDE.md` |

### Running services (default: real data)

```bash
bun run dev:api    # Wrangler (Cloudflare Workers) on :8787 — start this first
bun run dev        # Vite on :5173 — requires apps/web/.env.local with VITE_SERVER_URL
```

**Learner code exercises:** After `dev:api` and `dev`, open `apps/vscode` in VS Code and press F5 (`extensionHost` in `apps/vscode/.vscode/launch.json`, `--extensionDevelopmentPath` = `apps/vscode`). Opening the monorepo root does not F5 the extension unless you add the same `extensionHost` config with `--extensionDevelopmentPath` pointing at `apps/vscode`. Connect from Web `/connect-vscode` or a lesson's 「VS Code で開く」. JWT is stored in SecretStorage `falcon.accessToken` — do not paste a token into settings. Local install: `cd apps/vscode && bun run package` then Install from VSIX. Marketplace recipe (do not run): `cd apps/vscode && bunx @vscode/vsce publish --no-dependencies` as publisher `falcon`; no CI. See `apps/vscode/README.md`.

**Default local loop:** copy env from examples → `bun run db:migrate && bun run db:seed && bun run smoke:d1` → `dev:api` + `dev` → Google login → D1-backed UI. See `README.md` setup section for role promotion (`admin` / `instructor`) and the manual verification checklist.

**Demo-only (not for day-to-day work):** If `VITE_SERVER_URL` is unset, the web app uses fixture data and a mock login flow. Tweaks panel (backtick `` ` ``) can switch Learner / Instructor / Admin without D1. Treat this as a prototype demo path only.

**Stack:** Cloudflare D1 (DB) + Google OAuth + R2 (materials) + Workers Static Assets (frontend, migrated from Pages). See `docs/cloudflare-stack.md`.

**Deploy:** GitHub Actions only — no manual `wrangler` deploys for the normal flow. `.github/workflows/ci.yml` gates PRs (lint/typecheck/test/build); `.github/workflows/deploy.yml` runs on push to `main` (gate → D1 migrate remote → D1 seed remote → deploy:api → deploy:web). Requires repo Secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` and Variables `VITE_SERVER_URL` / `VITE_MATERIALS_BASE_URL`. See `docs/ci-cd.md`.

**DB setup (local):** `bun run db:migrate && bun run db:seed && bun run smoke:d1`

**Instructor review (Issue #8 / P3):** With the API running, submissions go through `/api/submissions` (D1). `POST /api/review-draft` generates AI review drafts (heuristic fallback without `ANTHROPIC_API_KEY`). localStorage `lms_submissions_v1` remains a demo/offline remnant — not the default path.

### Key caveats

- **Bun toolchain**: Bun is the package manager/runtime but is NOT preinstalled on a bare VM. The startup update script installs it to `~/.bun/bin` (and appends it to `~/.bashrc`). If `bun` is not found in a shell, run `export PATH="$HOME/.bun/bin:$PATH"`.
- **Vite dev server + browser resource limits**: The app loads many ES modules in dev mode. If the browser shows `ERR_INSUFFICIENT_RESOURCES`, use `bun run build` then `bun run preview` as an alternative for manual testing.
- **Dev mode crashes on AssignmentEditor / admin preview**: Learner code exercises run in the VS Code extension (`falcon.informal`), not in the web PracticeWorkspace. Admin `AssignmentEditor` (CMS preview / in-browser editor + linter) still loads that chunk. The in-browser ESLint linter pulls in `@babel/traverse`, which references `process` and throws `Uncaught ReferenceError: process is not defined` in `vite dev` (5173) — it blanks the whole app, but ONLY on routes that load that chunk (admin assignment editor / preview). The dashboard/course list and learner lesson pages render fine in dev. To manually test AssignmentEditor preview grading, use the production build instead: `bun run build` then `bun run preview` (served on :4173). Learner exercise grading is tested in the Extension Development Host, not in the web preview.
- **Preview build CORS**: When testing via `bun run preview` (:4173), the API rejects it unless the preview origin is allowed. Add `http://localhost:4173,http://127.0.0.1:4173` to `ALLOWED_ORIGINS` in `apps/api/.dev.vars` and restart `dev:api`. (`.dev.vars` is gitignored/local.)
- **Google OAuth (real login)**: The example `.dev.vars` ships empty `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (so `/api/healthz` reports `googleOAuthConfigured:false`). Cloud agents have `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` available as environment secrets — copy those env values into `apps/api/.dev.vars` and restart `dev:api` to get `googleOAuthConfigured:true`. The registered callback is `http://127.0.0.1:8787/api/auth/google/callback`, so use the API on `127.0.0.1:8787` (not `localhost`) for the OAuth redirect to match. Real login still needs interactive Google credentials.
- **Local login without Google OAuth**: To test authenticated flows without doing interactive Google sign-in, mint a JWT yourself (HS256, `iss=falcon-api`, `aud=falcon-web`, `sub=<profile id>`, signed with `AUTH_JWT_SECRET` from `.dev.vars`) and set it in the browser `localStorage` key `falcon_auth_token_v1` (this is exactly what the OAuth callback stores). Seeded profile ids: `seed-learner` (student), `seed-instructor`, `seed-admin` — all tenant `ses`; `seed-learner` is enrolled in the `web-fundamentals` course.
- **Env files**: `apps/web/.env.local` and `apps/api/.dev.vars` are gitignored. Copy from `.example`. For the default real-data path set `VITE_SERVER_URL=http://127.0.0.1:8787` in `.env.local`, and `AUTH_JWT_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` in `.dev.vars`.
- **Wrangler**: The API dev server uses `wrangler dev`. On first run it may print a telemetry notice; this is not an error.

### Lint / Typecheck / Build

```bash
bun run lint       # biome lint . (the CI lint gate)
bun run typecheck  # tsc --noEmit across all workspaces
bun run build      # Full production build (web uses Vite)
```

Linting is **Biome** (`biome.json`), not ESLint. `biome.json` enables the formatter but disables recommended lint rules (`linter.rules.recommended: false`), so `bun run lint` is intentionally permissive; TypeScript strict mode (`tsc --noEmit`) is the primary static analysis.

### Testing

Automated tests run with **Vitest** (`bun run test`; config `vitest.config.ts`; specs matched by `packages/**/*.test.ts`). Unit coverage is minimal (a few tests in `@falcon/shared`).

End-to-end coverage is a **core-loop HTTP smoke** (`bun run smoke:core`, `apps/api/scripts/core-loop-smoke.ts`): with the API running it walks course create → publish → enroll → progress → submit → review → notification → certificate → audit-log assertions → cleanup. No browser; auth is a self-minted JWT from `AUTH_JWT_SECRET`, so it needs `db:migrate` + `db:seed` and `dev:api` first. See README「コア学習ループの自動スモーク」.

CI (`.github/workflows/ci.yml`) has two jobs: `verify` (lint → typecheck → test → build) and `core-loop` (migrate + seed local D1 → `wrangler dev` → `smoke:core`). Beyond these, still validate UI-level changes by hand in the running app.
