/**
 * Cloudflare Workers バインディング型。
 */

export interface Env {
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_MODEL?: string;
  /** カンマ区切り。 `*.example.com` でサブドメインを許可。 */
  ALLOWED_ORIGINS: string;
  ISOLATE_MEMORY_LIMIT?: string;
  /** Supabase プロジェクト URL (ユーザー管理 API 用)。 */
  SUPABASE_URL?: string;
  /**
   * Supabase service-role / secret key (ユーザー管理 API 用)。
   * 招待 (auth admin) と profiles の特権 write に使う。 必ず secret として設定する。
   */
  SUPABASE_SERVICE_ROLE_KEY?: string;
  /** 招待メールのリンク先 (受諾後に開くアプリ URL)。 未設定なら ALLOWED_ORIGINS の先頭。 */
  INVITE_REDIRECT_URL?: string;
}
