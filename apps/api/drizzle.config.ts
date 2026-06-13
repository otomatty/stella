/**
 * Drizzle Kit 設定 — Neon Postgres のマイグレーション生成 / 適用。
 *
 *   bun run --filter=@falcon/api db:generate   # schema.ts から SQL を生成
 *   bun run --filter=@falcon/api db:migrate     # Neon に適用 (DATABASE_URL が必要)
 *
 * DATABASE_URL はローカルでは apps/api/.dev.vars / 環境変数から読む。
 */

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
