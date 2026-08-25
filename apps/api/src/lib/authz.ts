/**
 * 認証 (Workers JWT 検証) と認可 (テナント / ロール) のアプリ層ヘルパ。
 *
 *   - `verifyToken` … Authorization: Bearer の JWT を HS256 で検証
 *   - `getCaller`   … JWT 検証 + profiles から caller の tenant / role を解決
 *   - `requireRole` … caller が指定ロールのいずれかであることを保証
 */

import { eq } from "drizzle-orm";
import type { Context } from "hono";
import type { JWTPayload } from "jose";

import type { Db } from "../db/client.js";
import { getDb } from "../db/client.js";
import { profiles } from "../db/schema.js";
import type { Env } from "../env.js";
import { verifyAccessToken } from "./auth-jwt.js";

export class ApiError extends Error {
  status: 400 | 401 | 403 | 404 | 409 | 429 | 500 | 502 | 503;
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

export type ProfileRole = "student" | "instructor" | "admin" | "platform_admin" | "sales";

export interface Caller {
  id: string;
  tenantId: string;
  role: ProfileRole;
  name: string;
  email: string | null;
}

/**
 * Authorization: Bearer の JWT を検証し、 ペイロードを返す。
 * `sub` がユーザー ID (= profiles.id)。
 */
export async function verifyToken(c: Context<{ Bindings: Env }>): Promise<JWTPayload> {
  if (!c.env.AUTH_JWT_SECRET) {
    throw new ApiError("認証が未設定です (AUTH_JWT_SECRET)", 503);
  }
  const header = c.req.header("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new ApiError("Authorization ヘッダが必要です", 401);

  try {
    return await verifyAccessToken(c.env.AUTH_JWT_SECRET, token);
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

export function isStaffRole(role: ProfileRole): boolean {
  return role === "instructor" || role === "admin" || role === "platform_admin";
}

/** 面談対策の割当・準備状況の閲覧。 staff 機能 (CMS 等) とは別枠 — sales を含む。 */
export function canManageInterviewPrep(role: ProfileRole): boolean {
  return isStaffRole(role) || role === "sales";
}

export function requireCanManageInterviewPrep(caller: Caller): void {
  if (!canManageInterviewPrep(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
}

/**
 * 面談対策を「受ける」側になれるロール (受講者 / 管理者)。 管理者は受講者と同じ
 * 練習 (割当・今日の練習セット・進捗・改善点メモ) ができる。 講師・営業は対象外。
 * UI 側の双子は `@falcon/shared/admin/types` の同名関数。
 */
export const INTERVIEW_PREP_PRACTICE_ROLES: ProfileRole[] = ["student", "admin", "platform_admin"];

export function canPracticeInterviewPrep(role: ProfileRole): boolean {
  return INTERVIEW_PREP_PRACTICE_ROLES.includes(role);
}

/** 面談対策の練習系 API (自分の進捗を書く操作) の入口ガード。 */
export function requireCanPracticeInterviewPrep(caller: Caller): void {
  if (!canPracticeInterviewPrep(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
}

/** 面談予定日・メモの write。 instructor は categories のみ。 */
export function canWriteInterviewSchedule(role: ProfileRole): boolean {
  return role === "sales" || role === "admin" || role === "platform_admin";
}

/**
 * 想定質問そのものの編集 (Issue #237)。 面談に同席して質問の実際の言い回しを
 * 知っているのは営業なので、 admin と同じく編集できる。 instructor は割当と
 * モニタリングのみで、 全受講者に効く質問バンクは触らせない。
 */
export function canEditInterviewQuestions(role: ProfileRole): boolean {
  return role === "sales" || role === "admin" || role === "platform_admin";
}

export function requireCanEditInterviewQuestions(caller: Caller): void {
  if (!canEditInterviewQuestions(caller.role)) {
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
