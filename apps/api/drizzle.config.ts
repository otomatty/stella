/**
 * Drizzle Kit 設定 — Cloudflare D1 (SQLite)。
 *
 *   bun run db:generate   # schema.ts から SQL を生成 → drizzle/
 *   bun run db:migrate    # wrangler d1 migrations apply (local / remote)
 */

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
});
