# AGENTS.md

## Cursor Cloud specific instructions

### Overview

FALCON INFORMAL is a Learning Management System (LMS) monorepo using **Bun workspaces**. The main packages are:

| Package | Path | Purpose |
|---------|------|---------|
| `@falcon/web` | `apps/web` | Vite + React frontend (port 5173) |
| `@falcon/api` | `apps/api` | Hono API on Cloudflare Workers (port 8787) |
| `@falcon/shared` | `packages/shared` | Types, curriculum, grading logic |
| `@falcon/code-runner` | `packages/code-runner` | QuickJS WASM + sql.js in-browser runners |

### Running services

```bash
bun run dev        # Vite dev server on :5173
bun run dev:api    # Wrangler (Cloudflare Workers) on :8787
```

The web app works **without Supabase or Anthropic credentials** using hardcoded fixture data and a mock login flow. All roles (Learner, Instructor, Admin) are testable with the Tweaks panel (press backtick `` ` `` key).

### Key caveats

- **Vite dev server + browser resource limits**: The app loads many ES modules in dev mode. If the browser shows `ERR_INSUFFICIENT_RESOURCES`, use `bun run build` then serve `apps/web/dist` with a static server (e.g. `npx serve apps/web/dist -l 8080`) as an alternative for manual testing.
- **Env files**: `apps/web/.env.local` and `apps/api/.dev.vars` are gitignored. Copy from their `.example` counterparts. The app works without filling in Supabase/Anthropic values (fixture fallback).
- **Wrangler**: The API dev server uses `wrangler dev`. On first run it may print a telemetry notice; this is not an error.

### Lint / Typecheck / Build

```bash
bun run typecheck  # tsc --noEmit across all workspaces
bun run build      # Full production build (web uses Vite)
```

There is no separate ESLint config at the repo level. TypeScript strict mode (`tsc --noEmit`) serves as the primary static analysis.

### Testing

No automated test framework (Jest/Vitest) is configured in this repo. Validation is done via typecheck + manual testing of the running app.
