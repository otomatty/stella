/**
 * Neon Postgres への Drizzle クライアント生成 (Cloudflare Workers / HTTP ドライバ)。
 *
 * `@neondatabase/serverless` の HTTP ドライバは Workers のリクエストごとに
 * ステートレスに動くため、 リクエストスコープで `getDb(env)` を呼ぶ。
 */

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import type { Env } from "../env.js";
import * as schema from "./schema.js";

export type Db = NeonHttpDatabase<typeof schema>;

export function getDb(env: Env): Db {
  if (!env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL が未設定です。 Neon の接続文字列を wrangler secret put DATABASE_URL で設定してください。",
    );
  }
  const sql = neon(env.DATABASE_URL);
  return drizzle(sql, { schema });
}

export { schema };
