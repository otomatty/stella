/**
 * ユーザー管理 (招待 / ロール変更 / 無効化) の共有型。
 *
 * apps/web (呼び出し側) と apps/api (service-role 経由のハンドラ) の双方が
 * 同じ shape を参照できるよう @falcon/shared に置く。
 */

import type { ProfileRole } from "../cms/types.js";

export type { ProfileRole };

export const PROFILE_ROLES: readonly ProfileRole[] = [
  "student",
  "instructor",
  "admin",
];

/** 招待 1 件分の入力。 tenant は呼び出し元 (admin) の所属から server 側で決まる。 */
export interface InviteUserInput {
  email: string;
  displayName: string;
  role: ProfileRole;
}

/** `POST /api/admin/users/invite` のリクエスト body。 */
export interface InviteUsersRequest {
  invites: InviteUserInput[];
}

/** 招待 1 件の結果。 CSV 一括時は行ごとに ok/error を返す。 */
export interface InviteResult {
  email: string;
  ok: boolean;
  userId?: string;
  error?: string;
}

export interface InviteUsersResponse {
  results: InviteResult[];
}

/** `POST /api/admin/users/role` のリクエスト body。 */
export interface SetRoleRequest {
  userId: string;
  role: ProfileRole;
}

/** `POST /api/admin/users/disable` のリクエスト body。 */
export interface SetDisabledRequest {
  userId: string;
  disabled: boolean;
}

/** 1 度に招待できる最大件数 (CSV 一括のスパム / タイムアウト対策)。 */
export const MAX_INVITES_PER_REQUEST = 200;

/** ざっくりしたメール形式チェック。 厳密な RFC 準拠ではなく明らかな誤入力を弾く用途。 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

export function isProfileRole(value: unknown): value is ProfileRole {
  return value === "student" || value === "instructor" || value === "admin";
}

type ValidateResult =
  | { ok: true; invites: InviteUserInput[] }
  | { ok: false; status: 400; message: string };

/**
 * 招待リクエストを検証して正規化する。 API ハンドラと UI の双方で再利用する。
 */
export function validateInviteUsersRequest(raw: unknown): ValidateResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, status: 400, message: "Request body must be an object" };
  }
  const invites = (raw as Record<string, unknown>).invites;
  if (!Array.isArray(invites) || invites.length === 0) {
    return { ok: false, status: 400, message: "invites must be a non-empty array" };
  }
  if (invites.length > MAX_INVITES_PER_REQUEST) {
    return {
      ok: false,
      status: 400,
      message: `invites exceeds maximum (${MAX_INVITES_PER_REQUEST})`,
    };
  }
  const normalized: InviteUserInput[] = [];
  for (let i = 0; i < invites.length; i++) {
    const item = invites[i] as Record<string, unknown> | null;
    if (!item || typeof item !== "object") {
      return { ok: false, status: 400, message: `invites[${i}] must be an object` };
    }
    const email = typeof item.email === "string" ? item.email.trim().toLowerCase() : "";
    if (!isValidEmail(email)) {
      return { ok: false, status: 400, message: `invites[${i}].email is invalid` };
    }
    if (!isProfileRole(item.role)) {
      return { ok: false, status: 400, message: `invites[${i}].role is invalid` };
    }
    const displayNameRaw =
      typeof item.displayName === "string" ? item.displayName.trim() : "";
    const displayName = displayNameRaw || email.split("@")[0] || email;
    normalized.push({ email, displayName, role: item.role });
  }
  return { ok: true, invites: normalized };
}
