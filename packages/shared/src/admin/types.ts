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
  "platform_admin",
];

export const ASSIGNABLE_PROFILE_ROLES = ["student", "instructor", "admin"] as const;
export type AssignableProfileRole = (typeof ASSIGNABLE_PROFILE_ROLES)[number];

/** 招待 1 件分の入力。 tenant は呼び出し元 (admin) の所属から server 側で決まる。 */
export interface InviteUserInput {
  email: string;
  displayName: string;
  role: AssignableProfileRole;
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
  role: AssignableProfileRole;
}

/** `POST /api/admin/users/disable` のリクエスト body。 */
export interface SetDisabledRequest {
  userId: string;
  disabled: boolean;
}

/** 1 度に招待できる最大件数 (CSV 一括のスパム / タイムアウト対策)。 */
export const MAX_INVITES_PER_REQUEST = 200;

// ---------------------------------------------------------------
// 組織マスタ (Issue #29)
// ---------------------------------------------------------------

/** 組織 (tenant) 1 件。 契約情報 + 所属ユーザー数 (member_count) を含む。 */
export interface OrganizationRow {
  id: string;
  name: string;
  subtitle: string | null;
  icon: string | null;
  contact_name: string | null;
  contact_email: string | null;
  plan_seats: number | null;
  contract_start: string | null;
  contract_end: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  /** 無効化されていない所属プロフィール数 (API が集計)。 */
  member_count: number;
}

/** `GET /api/admin/orgs` のレスポンス。 */
export interface ListOrganizationsResponse {
  organizations: OrganizationRow[];
}

/**
 * `POST /api/admin/orgs/upsert` のリクエスト body。
 * `id` 新規時は slug を採番、 既存時は更新対象を指す (id 自体は不変)。
 */
export interface UpsertOrganizationInput {
  id: string;
  name: string;
  subtitle?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  planSeats?: number | null;
  contractStart?: string | null;
  contractEnd?: string | null;
  active?: boolean;
  /**
   * true のとき「新規作成」の意図を示す。 同じ id の組織が既に存在する場合、
   * API は upsert で黙って上書きせず 409 を返す (ID 衝突による既存組織の改変防止)。
   */
  expectCreate?: boolean;
}

/** 組織 id (slug) の形式。 英小文字 / 数字 / ハイフン、 2〜32 文字。 */
const ORG_ID_RE = /^[a-z0-9][a-z0-9-]{1,31}$/;

export function isValidOrgId(value: string): boolean {
  return ORG_ID_RE.test(value);
}

type ValidateOrgResult =
  | {
      ok: true;
      value: Required<Pick<UpsertOrganizationInput, "id" | "name">> & UpsertOrganizationInput;
    }
  | { ok: false; status: 400; message: string };

/**
 * 組織 upsert リクエストを検証して正規化する。 API ハンドラと UI の双方で再利用する。
 */
export function validateUpsertOrganization(raw: unknown): ValidateOrgResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, status: 400, message: "リクエストボディが不正です" };
  }
  const body = raw as Record<string, unknown>;

  const id = typeof body.id === "string" ? body.id.trim().toLowerCase() : "";
  if (!isValidOrgId(id)) {
    return {
      ok: false,
      status: 400,
      message: "組織IDは英小文字・数字・ハイフン (2〜32文字) で指定してください",
    };
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return { ok: false, status: 400, message: "組織名は必須です" };
  }

  const contactEmail =
    typeof body.contactEmail === "string" && body.contactEmail.trim()
      ? body.contactEmail.trim().toLowerCase()
      : null;
  if (contactEmail && !isValidEmail(contactEmail)) {
    return { ok: false, status: 400, message: "担当者メールアドレスの形式が不正です" };
  }

  let planSeats: number | null = null;
  if (body.planSeats !== undefined && body.planSeats !== null && body.planSeats !== "") {
    const n = Number(body.planSeats);
    if (!Number.isInteger(n) || n < 0) {
      return { ok: false, status: 400, message: "席数は 0 以上の整数で指定してください" };
    }
    planSeats = n;
  }

  const subtitle =
    typeof body.subtitle === "string" && body.subtitle.trim() ? body.subtitle.trim() : null;
  const contactName =
    typeof body.contactName === "string" && body.contactName.trim()
      ? body.contactName.trim()
      : null;
  const contractStart =
    typeof body.contractStart === "string" && body.contractStart.trim()
      ? body.contractStart.trim()
      : null;
  const contractEnd =
    typeof body.contractEnd === "string" && body.contractEnd.trim()
      ? body.contractEnd.trim()
      : null;
  const active = typeof body.active === "boolean" ? body.active : true;
  const expectCreate = body.expectCreate === true;

  return {
    ok: true,
    value: {
      id,
      name,
      subtitle,
      contactName,
      contactEmail,
      planSeats,
      contractStart,
      contractEnd,
      active,
      expectCreate,
    },
  };
}

/** ざっくりしたメール形式チェック。 厳密な RFC 準拠ではなく明らかな誤入力を弾く用途。 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

export function isProfileRole(value: unknown): value is ProfileRole {
  return (
    value === "student" || value === "instructor" || value === "admin" || value === "platform_admin"
  );
}

export function isAssignableProfileRole(value: unknown): value is AssignableProfileRole {
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
    if (!isAssignableProfileRole(item.role)) {
      return { ok: false, status: 400, message: `invites[${i}].role is invalid` };
    }
    const displayNameRaw = typeof item.displayName === "string" ? item.displayName.trim() : "";
    const displayName = displayNameRaw || email.split("@")[0] || email;
    normalized.push({ email, displayName, role: item.role });
  }
  return { ok: true, invites: normalized };
}
