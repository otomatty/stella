/**
 * サポート問い合わせ API。
 *
 *   POST /api/support  … 公開フォームからの問い合わせ受付 (ログイン不要)
 *
 * メール送信基盤は本リポジトリに未構成のため、 問い合わせは D1 に永続化する。
 * 公開 (認証前) エンドポイントのため、 専用レートリミッタで濫用を抑止する。
 *
 * 受信箱の閲覧用 GET は意図的に提供しない。 support_inquiries はテナント非依存の
 * グローバル/匿名データで、 テナントスコープの admin に返すと他テナント宛の PII まで
 * 見えてしまうため。 閲覧は運用者が D1 を直接参照する。
 */

import { Hono } from "hono";

import { getDb } from "../db/client.js";
import { supportInquiries } from "../db/schema.js";
import { errorResponse, getCaller, ApiError } from "../lib/authz.js";
import { enforceSupportRateLimit } from "../lib/rate-limit.js";
import type { Env } from "../env.js";

export const supportRoute = new Hono<{ Bindings: Env }>();

const CATEGORIES = ["login", "account", "billing", "bug", "other"] as const;
type Category = (typeof CATEGORIES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_MAX = 4000;
const NAME_MAX = 200;
const EMAIL_MAX = 254; // RFC 5321 のメールアドレス最大長。

interface SupportPayload {
  name?: unknown;
  email?: unknown;
  category?: unknown;
  message?: unknown;
}

function normalizeCategory(value: unknown): Category {
  return CATEGORIES.includes(value as Category) ? (value as Category) : "other";
}

supportRoute.post("/api/support", async (c) => {
  try {
    const limited = await enforceSupportRateLimit(c);
    if (limited) return limited;

    const body = (await c.req.json().catch(() => null)) as SupportPayload | null;
    if (!body) throw new ApiError("リクエスト本文が不正です", 400);

    const email = typeof body.email === "string" ? body.email.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, NAME_MAX) : "";

    if (!EMAIL_RE.test(email) || email.length > EMAIL_MAX) {
      throw new ApiError("有効なメールアドレスを入力してください", 400);
    }
    if (!message) {
      throw new ApiError("お問い合わせ内容を入力してください", 400);
    }
    if (message.length > MESSAGE_MAX) {
      throw new ApiError(`お問い合わせ内容は ${MESSAGE_MAX} 文字以内で入力してください`, 400);
    }

    // ログイン中なら user_id を記録する (任意・ベストエフォート)。
    let userId: string | null = null;
    if (c.req.header("Authorization")) {
      try {
        const { caller } = await getCaller(c);
        userId = caller.id;
      } catch {
        userId = null;
      }
    }

    const db = getDb(c.env);
    const [row] = await db
      .insert(supportInquiries)
      .values({
        name,
        email: email.toLowerCase(),
        category: normalizeCategory(body.category),
        message,
        ...(userId ? { userId } : {}),
      })
      .returning({ id: supportInquiries.id });

    return c.json({ ok: true, id: row?.id ?? null }, 201);
  } catch (err) {
    return errorResponse(c, err);
  }
});
