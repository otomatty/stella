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
  // Neon (DB / Auth) — Supabase からの移行 (#neon)
  // ---------------------------------------------------------------
  /**
   * Neon Postgres 接続文字列 (pooled connection 推奨)。
   * 例: postgres://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require
   * 機密のため `wrangler secret put DATABASE_URL` で設定する。
   */
  DATABASE_URL?: string;
  /**
   * Neon Auth が発行する JWT を検証するための JWKS エンドポイント。
   * 例: https://api.stack-auth.com/api/v1/projects/<project>/.well-known/jwks.json
   * (Neon Console → Auth → Configuration で確認できる)
   */
  NEON_AUTH_JWKS_URL?: string;
  /** JWT の `iss` クレーム検証値 (任意・設定時のみ検証)。 */
  NEON_AUTH_ISSUER?: string;
  /** JWT の `aud` クレーム検証値 (任意・設定時のみ検証)。 */
  NEON_AUTH_AUDIENCE?: string;
  /**
   * Neon Auth admin API のベース URL (ユーザー招待 / セッション失効用)。
   * 未設定時は招待エンドポイントが 503 を返す (role 変更 / 無効化は DB のみで動作する)。
   */
  NEON_AUTH_ADMIN_URL?: string;
  /** Neon Auth admin API のサーバ秘密鍵 (Authorization に付与)。 機密。 */
  NEON_AUTH_ADMIN_SECRET?: string;

  // --- Neon File Storage (S3 互換) — 教材アップロード ---
  /** S3 互換エンドポイント (例: https://<bucket>.<region>.neon.storage)。 */
  MATERIALS_S3_ENDPOINT?: string;
  /** バケット名。 */
  MATERIALS_S3_BUCKET?: string;
  MATERIALS_S3_ACCESS_KEY_ID?: string;
  MATERIALS_S3_SECRET_ACCESS_KEY?: string;
  /** リージョン (S3 署名用、 既定 auto)。 */
  MATERIALS_S3_REGION?: string;

  /** 招待メールのリンク先 (受諾後に開くアプリ URL)。 未設定なら ALLOWED_ORIGINS の先頭。 */
  INVITE_REDIRECT_URL?: string;
  /**
   * AI エンドポイント (chat / review-draft) の Rate Limiting バインディング。
   * wrangler.toml の `unsafe.bindings` で設定する。 未設定なら制限なしで動作する。
   */
  AI_RATE_LIMITER?: RateLimit;
}
