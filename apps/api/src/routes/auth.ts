/**
 * 認証まわりの API。ログインそのものは Cloudflare Access が行い、アプリは自前の認証を持たない。
 *
 *   POST /api/auth/vscode-link            … ログイン済みの利用者に VS Code 用のワンタイム接続コードを出す
 *   POST /api/auth/vscode-link/exchange   … 接続コードをトークンに交換する (Access の対象外にする経路)
 *   GET  /api/auth/google, /callback      … 退役 (410)。ログインは Access へ移った
 *
 * VS Code の拡張は Web と同じ Access のトークンで API を呼ぶ (`cf-access-token` ヘッダ)。
 * 接続コードを出すときに、そのリクエストに付いていた Access のトークンを預かり、交換で一度だけ渡す。
 * トークンの期限は Access のセッションと同じで、切れたら拡張から接続し直す。
 * Access の無いローカル開発では、交換時に開発用のトークンを作る。
 */

import { Hono } from "hono";
import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "../db/client.js";
import type { Db } from "../db/client.js";
import { authVscodeLinks, profiles } from "../db/schema.js";
import { accessConfig } from "../lib/access-auth.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { errorResponse, ApiError, getCaller, isLocalRequest } from "../lib/authz.js";
import { enforceAuthLinkRateLimit } from "../lib/rate-limit.js";
import {
  createVscodeLinkCode,
  hashVscodeLinkCode,
  redeemVscodeLink,
  VSCODE_LINK_TTL_MS,
} from "../lib/vscode-link.js";
import type { Env } from "../env.js";

export const authRoute = new Hono<{ Bindings: Env }>();

/** 拡張に渡すトークンの残りがこれより短ければ、接続コードを出さずに開き直しを促す。 */
const MIN_ACCESS_TOKEN_REMAINING_MS = 10 * 60 * 1000;

/** VS Code の接続を監査ログに残す (どの経路でログインしたかを見分けられるように)。 */
async function recordVscodeLogin(
  c: Parameters<typeof clientIp>[0],
  db: Db,
  userId: string,
): Promise<void> {
  const profile = (
    await db
      .select({
        id: profiles.id,
        tenantId: profiles.tenantId,
        role: profiles.role,
        displayName: profiles.displayName,
      })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1)
  )[0];
  if (!profile) return;
  await recordAudit(
    db,
    { id: profile.id, tenantId: profile.tenantId, role: profile.role, name: profile.displayName },
    {
      action: "login",
      targetType: "user",
      targetId: profile.id,
      ip: clientIp(c),
      metadata: { provider: "cloudflare-access", channel: "vscode-link" },
    },
  );
}

const retiredGoogleLogin = (c: Parameters<typeof errorResponse>[0]) =>
  errorResponse(
    c,
    new ApiError("Google ログインは廃止しました。Cloudflare Access からログインしてください", 410),
  );
authRoute.get("/api/auth/google", retiredGoogleLogin);
authRoute.get("/api/auth/google/callback", retiredGoogleLogin);

authRoute.post("/api/auth/vscode-link", async (c) => {
  try {
    const { caller, db, identity } = await getCaller(c);
    let accessToken: string | null = null;
    if (identity.kind === "access") {
      if (
        identity.expiresAt != null &&
        identity.expiresAt * 1000 - Date.now() < MIN_ACCESS_TOKEN_REMAINING_MS
      ) {
        throw new ApiError(
          "ログインの有効期限が近づいています。ページを開き直してから、もう一度お試しください",
          401,
        );
      }
      accessToken = identity.token;
    }
    const code = createVscodeLinkCode();
    const expiresAt = new Date(Date.now() + VSCODE_LINK_TTL_MS);
    await db.insert(authVscodeLinks).values({
      userId: caller.id,
      codeHash: await hashVscodeLinkCode(code),
      expiresAt,
      accessToken,
    });
    return c.json({ code, expires_at: expiresAt.toISOString() });
  } catch (err) {
    return errorResponse(c, err);
  }
});

authRoute.post("/api/auth/vscode-link/exchange", async (c) => {
  try {
    // コードを引く前に止める (超過したリクエストで有効なコードを消費・確認させない)。
    const limited = await enforceAuthLinkRateLimit(c);
    if (limited) return limited;

    const body = (await c.req.json().catch(() => null)) as { code?: unknown } | null;
    const code = typeof body?.code === "string" ? body.code : "";
    const db = getDb(c.env);
    const now = new Date();
    const row = (
      await db
        .select()
        .from(authVscodeLinks)
        .where(eq(authVscodeLinks.codeHash, await hashVscodeLinkCode(code)))
        .limit(1)
    )[0];

    const devSecret = c.env.DEV_AUTH_JWT_SECRET;
    const accessMode = accessConfig(c.env) !== null;
    if (!accessMode && !(devSecret && isLocalRequest(c))) {
      throw new ApiError("認証が未設定です (ACCESS_TEAM_DOMAIN / ACCESS_AUD)", 503);
    }

    const exchanged = await redeemVscodeLink({
      row,
      now,
      loadProfile: async (userId) =>
        (
          await db
            .select({ email: profiles.email, disabled: profiles.disabled })
            .from(profiles)
            .where(eq(profiles.id, userId))
            .limit(1)
        )[0] ?? null,
      consume: async (id) => {
        const consumed = (
          await db
            .update(authVscodeLinks)
            // 預かった Access のトークンは渡したら残さない。
            .set({ usedAt: now, accessToken: null })
            .where(and(eq(authVscodeLinks.id, id), isNull(authVscodeLinks.usedAt)))
            .returning({ id: authVscodeLinks.id })
        )[0];
        return Boolean(consumed);
      },
      issueToken: async (link, email) => {
        if (accessMode) return link.accessToken ?? null;
        return devSecret ? signAccessToken(devSecret, link.userId, email) : null;
      },
    });
    await recordVscodeLogin(c, db, exchanged.userId);
    return c.json({ access_token: exchanged.access_token });
  } catch (err) {
    return errorResponse(c, err);
  }
});
