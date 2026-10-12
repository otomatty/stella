/**
 * 認証まわりの API。ログインそのものは Clerk が行い、アプリは自前の認証を持たない。
 *
 *   POST /api/auth/vscode-link            … ログイン済みの受講者に VS Code 用のワンタイム接続コードを出す
 *   POST /api/auth/vscode-link/exchange   … 接続コードを VS Code 用のキーに交換する (ログインなしで呼ぶ経路)
 *   GET  /api/auth/google, /callback      … 退役 (410)。ログインは Clerk へ移った
 *
 * VS Code の拡張は Clerk の画面の SDK を持たない (セッショントークンは約 60 秒で切れる) ので、交換のときに
 * その利用者の Clerk の API キー (30 日で期限切れ・取り消し可・アプリのスコープ付き) を作って一度だけ渡す。
 * 講師・管理者・営業のアカウントには出さない (講師・管理者は Access で守った入口からだけ使う)。
 * Clerk の無いローカル開発では、交換時に開発用のトークンを作る。
 */

import { Hono } from "hono";
import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "../db/client.js";
import type { Db } from "../db/client.js";
import { authVscodeLinks, profiles } from "../db/schema.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import {
  errorResponse,
  ApiError,
  getCaller,
  isLocalRequest,
  STAFF_HOST_ROLES,
} from "../lib/authz.js";
import { clerkConfig, createVscodeApiKey } from "../lib/clerk-auth.js";
import { enforceAuthLinkRateLimit } from "../lib/rate-limit.js";
import {
  createVscodeLinkCode,
  hashVscodeLinkCode,
  redeemVscodeLink,
  VSCODE_LINK_TTL_MS,
} from "../lib/vscode-link.js";
import type { Env } from "../env.js";

export const authRoute = new Hono<{ Bindings: Env }>();

const STAFF_VSCODE_ERROR = "講師・管理者のアカウントは VS Code の接続では使えません";

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
      metadata: { provider: "clerk", channel: "vscode-link" },
    },
  );
}

const retiredGoogleLogin = (c: Parameters<typeof errorResponse>[0]) =>
  errorResponse(
    c,
    new ApiError(
      "Google ログインの旧経路は廃止しました。ログイン画面からログインしてください",
      410,
    ),
  );
authRoute.get("/api/auth/google", retiredGoogleLogin);
authRoute.get("/api/auth/google/callback", retiredGoogleLogin);

authRoute.post("/api/auth/vscode-link", async (c) => {
  try {
    const { caller, db, identity } = await getCaller(c);
    if (identity.kind !== "dev" && STAFF_HOST_ROLES.has(caller.role)) {
      throw new ApiError(STAFF_VSCODE_ERROR, 403);
    }
    const code = createVscodeLinkCode();
    const expiresAt = new Date(Date.now() + VSCODE_LINK_TTL_MS);
    await db.insert(authVscodeLinks).values({
      userId: caller.id,
      codeHash: await hashVscodeLinkCode(code),
      expiresAt,
      clerkUserId: identity.kind === "dev" ? null : identity.clerkUserId,
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
    const clerk = clerkConfig(c.env);
    if (!clerk && !(devSecret && isLocalRequest(c))) {
      throw new ApiError("認証が未設定です (CLERK_SECRET_KEY)", 503);
    }

    const exchanged = await redeemVscodeLink({
      row,
      now,
      loadProfile: async (userId) =>
        (
          await db
            .select({ email: profiles.email, disabled: profiles.disabled, role: profiles.role })
            .from(profiles)
            .where(eq(profiles.id, userId))
            .limit(1)
        )[0] ?? null,
      // Clerk では、Clerk の利用者が分かっていて講師・管理者でないときだけ渡す。
      canIssue: (link, profile) =>
        !clerk || (Boolean(link.clerkUserId) && !STAFF_HOST_ROLES.has(profile.role)),
      consume: async (id) => {
        const consumed = (
          await db
            .update(authVscodeLinks)
            .set({ usedAt: now })
            .where(and(eq(authVscodeLinks.id, id), isNull(authVscodeLinks.usedAt)))
            .returning({ id: authVscodeLinks.id })
        )[0];
        return Boolean(consumed);
      },
      issueToken: async (link, email) => {
        if (clerk) {
          return createVscodeApiKey(clerk, {
            clerkUserId: link.clerkUserId ?? "",
            email,
            profileId: link.userId,
          });
        }
        if (!devSecret) throw new Error("開発用の鍵がありません");
        return signAccessToken(devSecret, link.userId, email);
      },
    });
    await recordVscodeLogin(c, db, exchanged.userId);
    return c.json({ access_token: exchanged.access_token });
  } catch (err) {
    return errorResponse(c, err);
  }
});
