/**
 * 認証 (Better Auth のセッション) と認可 (ロール) のアプリ層ヘルパ。
 *
 *   - `verifyToken` … セッション (Cookie / VS Code の Bearer) から利用者を決める
 *   - `getCaller`   … 利用者 + profiles から caller の role を解決
 *   - `requireAdmin` … caller が staff (admin) であることを保証
 */

import { and, asc, eq, inArray } from "drizzle-orm";
import type { Context } from "hono";

import type { ProfileRole } from "@stella/shared/cms/types";

import type { Db } from "../db/client.js";
import { getDb } from "../db/client.js";
import { profiles } from "../db/schema.js";
import type { Env } from "../env.js";
import { verifyAccessToken } from "./auth-jwt.js";
import { getAuth } from "./better-auth.js";

export type { ProfileRole };

export class ApiError extends Error {
  // 410 は「あった機能を廃止した」ぶんだけ (Phase 3b の割当 API)。404 だと呼び出し側が
  // 綴り違いを疑って探し回るので、退役したことが伝わる番号を使う。
  status: 400 | 401 | 403 | 404 | 409 | 410 | 426 | 429 | 500 | 502 | 503;
  constructor(message: string, status: ApiError["status"]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** `.returning()` が空だったときに 500 にする。呼び出し側の `rows[0]!` を避ける。 */
export function requireReturning<T>(rows: readonly T[], what: string): T {
  const row = rows[0];
  if (row === undefined) {
    throw new ApiError(`${what} が行を返しませんでした`, 500);
  }
  return row;
}

export interface Caller {
  id: string;
  role: ProfileRole;
  name: string;
  email: string | null;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Who is calling. `sub` is the user id (= profiles.id).
 *
 *   1. The Better Auth session cookie (the web, through its own origin).
 *   2. `Authorization: Bearer <session token>` (the VS Code extension; see the link exchange).
 *   3. Local development and tests only: a self-signed HS256 token (`AUTH_JWT_SECRET`), accepted
 *      just for requests to localhost, so no production request can use it.
 */
export async function verifyToken(c: Context<{ Bindings: Env }>): Promise<{ sub: string }> {
  const auth = getAuth(c.env);
  if (auth) {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (session) return { sub: session.user.id };
  }
  const token = (c.req.header("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    if (!auth && !c.env.AUTH_JWT_SECRET) throw new ApiError("認証が未設定です", 503);
    throw new ApiError("ログインが必要です", 401);
  }
  if (c.env.AUTH_JWT_SECRET && LOCAL_HOSTS.has(new URL(c.req.url).hostname)) {
    try {
      return { sub: (await verifyAccessToken(c.env.AUTH_JWT_SECRET, token)).sub as string };
    } catch {
      // Not a dev token; it may still be a session token below.
    }
  }
  if (auth) {
    const found = await (await auth.$context).internalAdapter.findSession(token);
    if (found && found.session.expiresAt.getTime() > Date.now()) return { sub: found.user.id };
  }
  throw new ApiError("トークンが無効です", 401);
}

/**
 * JWT を検証し、 profiles から caller のロールを解決する。
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
      role: profile.role as ProfileRole,
      name: profile.displayName,
      email: profile.email,
    },
  };
}

/** staff のロール。通知の宛先なども、この一覧だけを使う。 */
export const STAFF_ROLES = ["admin"] as const satisfies readonly ProfileRole[];

export function isStaffRole(role: ProfileRole): boolean {
  return (STAFF_ROLES as readonly ProfileRole[]).includes(role);
}

/** 無効でない staff の id。id 順。0 人なら空。 */
export async function loadActiveStaffIds(db: Db): Promise<string[]> {
  const rows = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.disabled, false), inArray(profiles.role, [...STAFF_ROLES])))
    .orderBy(asc(profiles.id));
  return rows.map((row) => row.id);
}

/** 専用ステージ (`audience = granted`) の割当。管理者のみ。 */
export function requireCanManageStageGrants(caller: Caller): void {
  requireAdmin(caller);
}

/** 自己開始と発見教材に取り組めるロール。 */
export const SELF_STUDY_ROLES: ProfileRole[] = ["student", "admin"];

export function canStudyAsLearner(role: ProfileRole): boolean {
  return SELF_STUDY_ROLES.includes(role);
}

/** 発見教材 API の入口ガード。 */
export function requireCanTakeDiscovery(caller: Caller): void {
  if (!canStudyAsLearner(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
}

/** ステージの自己開始 (`POST /api/stages/:id/start`) の入口ガード。 */
export function requireCanStartStage(caller: Caller): void {
  if (!canStudyAsLearner(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
}

/** staff (`STAFF_ROLES`) でなければ 403。管理者の仕事はここを通る。 */
export function requireAdmin(caller: Caller): void {
  if (!isStaffRole(caller.role)) {
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
