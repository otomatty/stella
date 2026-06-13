/**
 * 認証 (Neon Auth JWT 検証) と認可 (テナント / ロール) のアプリ層ヘルパ。
 *
 * 旧 Supabase は PostgREST + RLS でブラウザから直接 DB を叩いていたが、
 * Neon 移行後は全アクセスが Hono を経由するため、 認可をここに集約する。
 *
 *   - `verifyToken` … Authorization: Bearer の Neon Auth JWT を JWKS で検証
 *   - `getCaller`   … JWT 検証 + profiles から caller の tenant / role を解決
 *   - `requireRole` … caller が指定ロールのいずれかであることを保証
 *
 * 旧 RLS の述語 (`user_id = auth.uid() and tenant_id = current_tenant_id()`) は、
 * 各ルートが caller.id / caller.tenantId と突き合わせることで再現する。
 */

import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

import type { Db } from "../db/client.js";
import { getDb } from "../db/client.js";
import { profiles } from "../db/schema.js";
import type { Env } from "../env.js";

export class ApiError extends Error {
  status: 400 | 401 | 403 | 404 | 409 | 429 | 500 | 502 | 503;
  constructor(message: string, status: ApiError["status"]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type ProfileRole = "student" | "instructor" | "admin";

export interface Caller {
  id: string;
  tenantId: string;
  role: ProfileRole;
  name: string;
  email: string | null;
}

/** JWKS は env (URL) ごとにキャッシュする。 リクエスト間で再利用できる。 */
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(url: string): ReturnType<typeof createRemoteJWKSet> {
  let jwks = jwksCache.get(url);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(url));
    jwksCache.set(url, jwks);
  }
  return jwks;
}

/**
 * Authorization: Bearer の Neon Auth JWT を検証し、 ペイロードを返す。
 * `sub` がユーザー ID (= profiles.id)。
 */
export async function verifyToken(c: Context<{ Bindings: Env }>): Promise<JWTPayload> {
  if (!c.env.NEON_AUTH_JWKS_URL) {
    throw new ApiError("認証が未設定です (NEON_AUTH_JWKS_URL)", 503);
  }
  const header = c.req.header("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new ApiError("Authorization ヘッダが必要です", 401);

  try {
    const { payload } = await jwtVerify(token, getJwks(c.env.NEON_AUTH_JWKS_URL), {
      ...(c.env.NEON_AUTH_ISSUER ? { issuer: c.env.NEON_AUTH_ISSUER } : {}),
      ...(c.env.NEON_AUTH_AUDIENCE ? { audience: c.env.NEON_AUTH_AUDIENCE } : {}),
    });
    if (!payload.sub) throw new ApiError("トークンに sub がありません", 401);
    return payload;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("トークンが無効です", 401);
  }
}

/**
 * JWT を検証し、 profiles から caller のテナント / ロールを解決する。
 * 無効化済みアカウントは未失効 JWT を持っていても拒否する。
 */
export async function getCaller(c: Context<{ Bindings: Env }>): Promise<{
  caller: Caller;
  db: Db;
}> {
  const payload = await verifyToken(c);
  const userId = payload.sub as string;
  const db = getDb(c.env);

  const rows = await db
    .select({
      id: profiles.id,
      tenantId: profiles.tenantId,
      role: profiles.role,
      displayName: profiles.displayName,
      email: profiles.email,
      disabled: profiles.disabled,
    })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  const profile = rows[0];
  if (!profile) throw new ApiError("プロフィールが見つかりません", 403);
  if (profile.disabled) throw new ApiError("このアカウントは無効化されています", 403);

  return {
    db,
    caller: {
      id: profile.id,
      tenantId: profile.tenantId,
      role: profile.role as ProfileRole,
      name: profile.displayName,
      email: profile.email,
    },
  };
}

/** caller が指定ロールのいずれかでなければ 403 を投げる。 */
export function requireRole(caller: Caller, ...roles: ProfileRole[]): void {
  if (!roles.includes(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
}

/** ApiError を Hono レスポンスへ。 想定外エラーは 500 に丸める。 */
export function errorResponse(c: Context, err: unknown): Response {
  if (err instanceof ApiError) {
    return c.json({ error: err.message }, err.status);
  }
  console.error("[api] unexpected error", err);
  return c.json({ error: "内部エラーが発生しました" }, 500);
}
