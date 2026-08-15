/**
 * ユーザー管理のデータアクセス層 (Issue #22 — Neon / Hono API)。
 *
 * 一覧 / 招待 / ロール変更 / 無効化 をすべて `/api/admin/users/*` (admin 認可) 経由で行う。
 */

import type { ProfileRole, ProfileRow } from "@falcon/shared/cms/types";
import type { InviteUserInput, InviteUsersResponse } from "@falcon/shared/admin/types";

import { apiFetch } from "./api-client";

export type AdminProfileRow = ProfileRow & { disabled: boolean };

export async function listProfiles(_tenantId: string): Promise<AdminProfileRow[]> {
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
