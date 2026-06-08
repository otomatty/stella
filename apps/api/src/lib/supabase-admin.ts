/**
 * service-role Supabase クライアントと管理者認可ヘルパ。
 *
 * ユーザー管理 API (招待 / ロール変更 / 無効化) はすべて service-role 権限を必要とするため、
 * 呼び出し元の Bearer トークンを検証し、 `profiles.role = 'admin'` であることを確認したうえで
 * 操作対象が「呼び出し元と同じテナント」 に閉じていることをハンドラ側でチェックする。
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Context } from "hono";
import type { ProfileRole } from "@falcon/shared/admin/types";

import type { Env } from "../env.js";

export class AdminApiError extends Error {
  status: 400 | 401 | 403 | 404 | 500 | 503;
  constructor(message: string, status: AdminApiError["status"]) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

/** service-role 鍵で Supabase クライアントを生成する。 セッションは保持しない。 */
export function getServiceClient(env: Env): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new AdminApiError(
      "Supabase service role が未設定です (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
      503,
    );
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface CallerProfile {
  id: string;
  tenantId: string;
  role: ProfileRole;
}

/**
 * Authorization: Bearer トークンを検証し、 呼び出し元が admin であることを確認する。
 * admin でなければ 401/403 を表す AdminApiError を throw する。
 */
export async function authenticateAdmin(
  c: Context<{ Bindings: Env }>,
  supabase: SupabaseClient,
): Promise<CallerProfile> {
  const header = c.req.header("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    throw new AdminApiError("Authorization ヘッダが必要です", 401);
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    throw new AdminApiError("トークンが無効です", 401);
  }

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, tenant_id, role, disabled")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (pErr) {
    console.error("[admin-users] caller profile lookup failed", pErr);
    throw new AdminApiError("プロフィール取得に失敗しました", 500);
  }
  if (!profile) throw new AdminApiError("プロフィールが見つかりません", 403);
  // 無効化済みの管理者は、 未失効の JWT を持っていても特権操作を拒否する。
  if (profile.disabled) {
    throw new AdminApiError("このアカウントは無効化されています", 403);
  }
  if (profile.role !== "admin") {
    throw new AdminApiError("管理者権限が必要です", 403);
  }
  return {
    id: profile.id as string,
    tenantId: profile.tenant_id as string,
    role: profile.role as ProfileRole,
  };
}

/**
 * 操作対象のプロフィールを取得し、 呼び出し元と同じテナントであることを確認する。
 * 自己を対象にする操作は呼び出し側で別途禁止する (自己昇格防止)。
 */
export async function requireSameTenantTarget(
  supabase: SupabaseClient,
  caller: CallerProfile,
  targetUserId: string,
): Promise<{ id: string; tenantId: string; role: ProfileRole }> {
  const { data: target, error } = await supabase
    .from("profiles")
    .select("id, tenant_id, role")
    .eq("id", targetUserId)
    .maybeSingle();
  if (error) {
    console.error("[admin-users] target profile lookup failed", error);
    throw new AdminApiError("対象ユーザーの取得に失敗しました", 500);
  }
  if (!target) throw new AdminApiError("対象ユーザーが見つかりません", 404);
  if (target.tenant_id !== caller.tenantId) {
    // 他テナントのユーザーには干渉できない。
    throw new AdminApiError("他テナントのユーザーは操作できません", 403);
  }
  return {
    id: target.id as string,
    tenantId: target.tenant_id as string,
    role: target.role as ProfileRole,
  };
}

/** 表示名からイニシャル (先頭 2 文字、 大文字) を作る。 */
export function initialsFrom(displayName: string): string {
  return displayName.slice(0, 2).toUpperCase();
}

/** ALLOWED_ORIGINS の先頭、 または INVITE_REDIRECT_URL を招待リンク先に使う。 */
export function resolveInviteRedirect(env: Env): string | undefined {
  if (env.INVITE_REDIRECT_URL) return env.INVITE_REDIRECT_URL;
  const first = env.ALLOWED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter((s) => s && !s.includes("*"))[0];
  return first || undefined;
}
