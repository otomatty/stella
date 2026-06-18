/**
 * Cloudflare D1 への Drizzle クライアント生成。
 *
 * Workers では `env.DB` バインディング経由でアクセスする (接続文字列不要)。
 */

import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";

import type { Env } from "../env.js";
import * as schema from "./schema.js";

export type Db = DrizzleD1Database<typeof schema>;

export function getDb(env: Env): Db {
  if (!env.DB) {
    throw new Error(
      "D1 バインディング DB が未設定です。 wrangler.toml の [[d1_databases]] を確認してください。",
    );
  }
  return drizzle(env.DB, { schema });
}

export { schema };
