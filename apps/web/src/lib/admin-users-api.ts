/**
 * ユーザー管理のデータアクセス層 (Issue #22)。
 *
 * - 一覧 (read): RLS (`profiles_select_self`) 配下で Supabase から直接読む。
 * - 招待 / ロール変更 / 無効化 (write): service-role 権限が要るため apps/api の
 *   `/api/admin/users/*` を Bearer トークン付きで呼ぶ。
 */

import type { ProfileRole, ProfileRow } from "@falcon/shared/cms/types";
import type {
  InviteUserInput,
  InviteUsersResponse,
} from "@falcon/shared/admin/types";

import { getSession } from "./auth";
import { getSupabase } from "./supabase";

export type AdminProfileRow = ProfileRow & { disabled: boolean };

export async function listProfiles(tenantId: string): Promise<AdminProfileRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data as ProfileRow[] | null) ?? []).map((row) => ({
    ...row,
    disabled: row.disabled ?? false,
  }));
}

function serverUrl(): string {
  const url = import.meta.env.VITE_SERVER_URL;
  if (!url) return "";
  return url.replace(/\/$/, "");
}

async function authedPost<T>(path: string, body: unknown): Promise<T> {
  const base = serverUrl();
  if (!base) {
    throw new Error("API サーバ (VITE_SERVER_URL) が未設定です");
  }
  const session = await getSession();
  if (!session) {
    throw new Error("ログインが必要です");
  }
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: unknown };
    throw new Error(
      typeof err.error === "string" ? err.error : `HTTP ${res.status}`,
    );
  }
  return (await res.json()) as T;
}

export async function inviteUsers(
  invites: InviteUserInput[],
): Promise<InviteUsersResponse> {
  return authedPost<InviteUsersResponse>("/api/admin/users/invite", { invites });
}

export async function setUserRole(
  userId: string,
  role: ProfileRole,
): Promise<void> {
  await authedPost("/api/admin/users/role", { userId, role });
}

export async function setUserDisabled(
  userId: string,
  disabled: boolean,
): Promise<void> {
  await authedPost("/api/admin/users/disable", { userId, disabled });
}
