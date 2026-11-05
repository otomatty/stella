/**
 * ユーザー管理のデータアクセス層 (Issue #22 — Neon / Hono API)。
 *
 * 一覧 / 招待 / ロール変更 / 無効化 / 受講者の削除 をすべて `/api/admin/users/*` (admin 認可) 経由で行う。
 */

import type { ProfileRole, ProfileRow } from "@stella/shared/cms/types";
import type { InviteUserInput, InviteUsersResponse } from "@stella/shared/admin/types";

import { apiFetch } from "./api-client";

export type AdminProfileRow = ProfileRow & { disabled: boolean };

export async function listProfiles(): Promise<AdminProfileRow[]> {
  const { rows } = await apiFetch<{ rows: ProfileRow[] }>("/api/admin/users");
  return (rows ?? []).map((row) => ({
    ...row,
    disabled: row.disabled ?? false,
  }));
}

export async function inviteUsers(invites: InviteUserInput[]): Promise<InviteUsersResponse> {
  return apiFetch<InviteUsersResponse>("/api/admin/users/invite", {
    method: "POST",
    body: { invites },
  });
}

export async function setUserRole(userId: string, role: ProfileRole): Promise<void> {
  await apiFetch("/api/admin/users/role", {
    method: "POST",
    body: { userId, role },
  });
}

export async function setUserDisabled(userId: string, disabled: boolean): Promise<void> {
  await apiFetch("/api/admin/users/disable", {
    method: "POST",
    body: { userId, disabled },
  });
}

/** 受講者を削除する。メールの一致はサーバーが確かめる。 */
export async function deleteUser(
  userId: string,
  confirmEmail: string,
): Promise<{ submissions: number; library_books: number }> {
  const { deleted } = await apiFetch<{
    deleted: { submissions: number; library_books: number };
  }>("/api/admin/users/delete", {
    method: "POST",
    body: { userId, confirmEmail },
  });
  return deleted;
}
