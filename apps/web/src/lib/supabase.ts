/**
 * [互換シム] 旧 `@/lib/supabase` の公開 API を Cloudflare 構成へ橋渡しする。
 *
 * `isSupabaseConfigured` は「バックエンド (Workers API + 認証) が設定済みか」の意味。
 * 教材 URL は Cloudflare R2 公開 URL へ委譲する。
 */

import { isAuthConfigured } from "./auth-client";
import { isApiConfigured } from "./api-client";

/** バックエンド (Hono API + Google OAuth 認証) が設定済みか。 */
export function isSupabaseConfigured(): boolean {
  return isAuthConfigured() && isApiConfigured();
}

export { getMaterialUrl, isStorageConfigured } from "./storage";
