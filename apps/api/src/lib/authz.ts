/**
 * 認証 (Better Auth のセッション) と認可 (テナント / ロール) のアプリ層ヘルパ。
 *
 *   - `verifyToken` … セッション (Cookie / VS Code の Bearer) から利用者を決める
 *   - `getCaller`   … 利用者 + profiles から caller の tenant / role を解決
 *   - `requireRole` … caller が指定ロールのいずれかであることを保証
 */

import { eq } from "drizzle-orm";
import type { Context } from "hono";

import type { Db } from "../db/client.js";
import { getDb } from "../db/client.js";
import { profiles, tenants } from "../db/schema.js";
import type { Env } from "../env.js";
import { verifyAccessToken } from "./auth-jwt.js";
import { getAuth } from "./better-auth.js";

export class ApiError extends Error {
  // 410 は「あった機能を廃止した」ぶんだけ (Phase 3b の割当 API)。404 だと呼び出し側が
  // 綴り違いを疑って探し回るので、退役したことが伝わる番号を使う。
  status: 400 | 401 | 403 | 404 | 409 | 410 | 429 | 500 | 502 | 503;
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

export type ProfileRole = "student" | "instructor" | "admin" | "platform_admin";

export interface Caller {
  id: string;
  tenantId: string;
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
      tenantActive: tenants.active,
    })
    .from(profiles)
    .leftJoin(tenants, eq(profiles.tenantId, tenants.id))
    .where(eq(profiles.id, userId))
    .limit(1);

  const profile = rows[0];
  if (!profile) throw new ApiError("プロフィールが見つかりません", 403);
  if (profile.disabled) throw new ApiError("このアカウントは無効化されています", 403);
  assertTenantActive(profile.tenantActive);

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

/** A suspended organization (`tenants.active = 0`) cannot use the API, even with a valid JWT. */
export function assertTenantActive(active: boolean | null): void {
  if (active === false) throw new ApiError("この組織は利用を停止しています", 403);
}

/** caller が指定ロールのいずれかでなければ 403 を投げる。 */
export function requireRole(caller: Caller, ...roles: ProfileRole[]): void {
  if (!roles.includes(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
}

export function isStaffRole(role: ProfileRole): boolean {
  return role === "instructor" || role === "admin" || role === "platform_admin";
}

/** 専用ステージ (`audience = granted`) の割当。講師・管理者のみ。 */
export function requireCanManageStageGrants(caller: Caller): void {
  if (!isStaffRole(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
}

/**
 * 腕試し (SkillCheck / 飛び級) を **受ける** 側になれるロール (Phase 3a)。
 *
 * 管理者は運用の当事者として受講者と同じ腕試しを試せる必要がある (出題や合格ラインの
 * 手触りを確かめる場が他に無い) 一方、講師は対象外 — 飛び級は「自分の星を開ける」
 * 操作で、他人の学習を見る側のロールが自分の `stage_unlocks` を作っても意味が無く、
 * 受験履歴だけが増える。
 */
export const SKILL_CHECK_ROLES: ProfileRole[] = ["student", "admin", "platform_admin"];

export function canTakeSkillCheck(role: ProfileRole): boolean {
  return SKILL_CHECK_ROLES.includes(role);
}

/** 腕試し API (出題・採点の両方) の入口ガード。 */
export function requireCanTakeSkillCheck(caller: Caller): void {
  if (!canTakeSkillCheck(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
}

/**
 * ステージの自己開始 (`POST /api/stages/:id/start`) の入口ガード (Phase 3b)。
 *
 * 顔ぶれは腕試しと同じ (`SKILL_CHECK_ROLES`) — 飛び級で開いた星の自己登録と自己開始は
 * 同じ「自分の学習を自分で始める」操作なので、片方だけ講師に開けると
 * 「受けられないのに始められる」がねじれる。
 */
export function requireCanStartStage(caller: Caller): void {
  if (!canTakeSkillCheck(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
}

export function requireTenantAdmin(caller: Caller): void {
  requireRole(caller, "admin", "platform_admin");
}

export function requirePlatformAdmin(caller: Caller): void {
  requireRole(caller, "platform_admin");
}

/** ApiError を Hono レスポンスへ。 想定外エラーは 500 に丸める。 */
export function errorResponse(c: Context, err: unknown): Response {
  if (err instanceof ApiError) {
    return c.json({ error: err.message }, err.status);
  }
  console.error("[api] unexpected error", err);
  return c.json({ error: "内部エラーが発生しました" }, 500);
}
