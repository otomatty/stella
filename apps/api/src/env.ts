/**
 * Cloudflare Workers バインディング型。
 */

export interface Env {
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_MODEL?: string;
  /** カンマ区切り。 `*.example.com` でサブドメインを許可。 */
  ALLOWED_ORIGINS: string;
  ISOLATE_MEMORY_LIMIT?: string;

  // ---------------------------------------------------------------
  // Cloudflare D1 + 自前認証 (Google OAuth / JWT)
  // ---------------------------------------------------------------
  /** D1 データベースバインディング (`wrangler.toml` の `[[d1_databases]]`)。 */
  DB: D1Database;

  /**
   * JWT 署名用シークレット (HS256)。 機密。
   * `wrangler secret put AUTH_JWT_SECRET` で設定する。
   */
  AUTH_JWT_SECRET?: string;

  /** Google OAuth クライアント ID (公開可)。 */
  GOOGLE_CLIENT_ID?: string;

  /** Google OAuth クライアントシークレット。 `wrangler secret put GOOGLE_CLIENT_SECRET` */
  GOOGLE_CLIENT_SECRET?: string;

  /**
   * Cloudflare R2 — 教材アップロード用バケット。
   * `wrangler.toml` の `[[r2_buckets]]` で `MATERIALS_BUCKET` としてバインドする。
   */
  MATERIALS_BUCKET?: R2Bucket;

  /** 招待メールのリンク先 (受諾後に開くアプリ URL)。 未設定なら ALLOWED_ORIGINS の先頭。 */
  INVITE_REDIRECT_URL?: string;

  /**
   * AI エンドポイント (chat / review-draft) の Rate Limiting バインディング。
   * wrangler.toml の `unsafe.bindings` で設定する。 未設定なら制限なしで動作する。
   */
  AI_RATE_LIMITER?: RateLimit;

  /**
   * サポート問い合わせ (公開フォーム) の Rate Limiting バインディング。
   * wrangler.toml の `unsafe.bindings` で設定する。 未設定なら制限なしで動作する。
   */
  SUPPORT_RATE_LIMITER?: RateLimit;
}
