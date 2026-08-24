/**
 * スキルシート API の認可 (Issue #203)。
 *
 * 教材アップロード (instructor+) とは逆 — parse/save は instructor 不可、
 * GET は instructor も閲覧可。
 */

import type { Caller, ProfileRole } from "./authz.js";
import { ApiError } from "./authz.js";

const PARSE_SAVE_ROLES: ProfileRole[] = ["student", "sales", "admin", "platform_admin"];

export function canParseSkillSheet(role: ProfileRole): boolean {
  return PARSE_SAVE_ROLES.includes(role);
}

export function canSaveSkillSheet(role: ProfileRole): boolean {
  return PARSE_SAVE_ROLES.includes(role);
}

export function requireCanParseSkillSheet(caller: Caller): void {
  if (!canParseSkillSheet(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
}

export function requireCanSaveSkillSheet(caller: Caller): void {
  if (!canSaveSkillSheet(caller.role)) {
    throw new ApiError("権限がありません", 403);
  }
}

export function canViewSkillSheet(
  caller: Caller,
  targetProfileId: string,
  targetTenantId: string,
): boolean {
  if (caller.tenantId !== targetTenantId) return false;
  if (caller.role === "student") return caller.id === targetProfileId;
  return (
    caller.role === "sales" ||
    caller.role === "admin" ||
    caller.role === "platform_admin" ||
    caller.role === "instructor"
  );
}

export function requireCanViewSkillSheet(
  caller: Caller,
  targetProfileId: string,
  targetTenantId: string,
): void {
  if (!canViewSkillSheet(caller, targetProfileId, targetTenantId)) {
    throw new ApiError("権限がありません", 403);
  }
}

/** save 対象 profileId が caller の権限内か検証する。 */
export function requireCanSaveForProfile(caller: Caller, targetProfileId: string): void {
  requireCanSaveSkillSheet(caller);
  if (caller.role === "student" && caller.id !== targetProfileId) {
    throw new ApiError("権限がありません", 403);
  }
}
