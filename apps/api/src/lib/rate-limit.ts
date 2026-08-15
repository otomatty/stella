/**
 * AI エンドポイント (chat / review-draft) のレート制限。
 *
 * Cloudflare Workers の Rate Limiting バインディング (wrangler.toml の
 * `unsafe.bindings`) を使い、 クライアント IP 単位で呼び出し回数を制限する。
 * Anthropic API のコスト保護と、 認証前エンドポイントの濫用対策が目的。
 *
 * バインディング未設定の環境 (ローカル開発・テスト) では制限せずに通す。
 */

import type { Context } from "hono";

import type { Env } from "../env.js";

/** リバースプロキシ / Cloudflare 越しの実クライアント IP を取り出す。 取れなければ null。 */
function clientIp(c: Context<{ Bindings: Env }>): string | null {
  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

/**
 * 指定リミッタで IP 単位のレート制限を行う。 超過なら 429、 許容内なら null。
 * リミッタ未設定 (ローカル / テスト) や判定失敗時はリクエストを通す (fail-open: 可用性優先)。
 */
async function enforce(
  c: Context<{ Bindings: Env }>,
  limiter: RateLimit | undefined,
): Promise<Response | null> {
  if (!limiter) return null;

  // IP が取れない場合は共有キーに落とす (制限なしにはしない)。
  const key = clientIp(c) ?? "unknown";
  try {
    const { success } = await limiter.limit({ key });
    if (!success) {
      return c.json(
        { error: "リクエストが多すぎます。 しばらく待ってから再試行してください" },
        429,
      );
    }
  } catch (e) {
    console.error("[rate-limit] limiter check failed; allowing request", e);
  }
  return null;
}

/** AI エンドポイント (chat / review-draft) 用のレート制限。 */
export function enforceAiRateLimit(c: Context<{ Bindings: Env }>): Promise<Response | null> {
  return enforce(c, c.env.AI_RATE_LIMITER);
}

/** サポート問い合わせ (公開・認証前) フォーム用のレート制限。 */
export function enforceSupportRateLimit(c: Context<{ Bindings: Env }>): Promise<Response | null> {
  return enforce(c, c.env.SUPPORT_RATE_LIMITER);
}
