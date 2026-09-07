/**
 * スキルシート UI 権限・画面モード (Issue #233)。
 */

import type { ProfileRole } from "@stella/shared/cms/types";
import type { Role } from "@/data/types";

export type SkillSheetUiMode = "register" | "proxy-register" | "view-only";

const REGISTER_ROLES: ProfileRole[] = ["student", "sales", "admin", "platform_admin"];
const VIEW_ROLES: ProfileRole[] = [...REGISTER_ROLES, "instructor"];

const PROXY_REGISTER_ROLES: ProfileRole[] = ["sales", "admin", "platform_admin"];

export function canRegisterSkillSheet(role: ProfileRole | undefined): boolean {
  return role !== undefined && REGISTER_ROLES.includes(role);
}

export function canViewSkillSheet(role: ProfileRole | undefined): boolean {
  return role !== undefined && VIEW_ROLES.includes(role);
}

export function resolveSkillSheetUiMode(input: {
  profileRole: ProfileRole | undefined;
  shellRole: Role;
  targetProfileId: string;
  currentUserId: string;
}): SkillSheetUiMode {
  if (input.profileRole === "instructor") {
    return "view-only";
  }

  if (
    input.profileRole !== undefined &&
    PROXY_REGISTER_ROLES.includes(input.profileRole) &&
    input.targetProfileId !== input.currentUserId
  ) {
    return "proxy-register";
  }

  return "register";
}

export function interviewPrepTabIdsForRole(role: Role): string[] {
  if (role === "learner") {
    return ["questions", "skill-sheet"];
  }
  return ["questions"];
}

export function skillSheetSaveSuccessBanner(): string | null {
  return "スキルシートを保存しました。A 必修の個別回答の型を生成キューに登録します。";
}

export function skillSheetParseFailureMessage(error: unknown): string | null {
  if (error instanceof Error && error.message.trim()) {
    return `${error.message} 手入力で登録できます。`;
  }
  if (typeof error === "string" && error.trim()) {
    return `${error} 手入力で登録できます。`;
  }
  return "解析に失敗しました。手入力で登録できます。";
}

export function canManualEntryAfterParseFailure(role: ProfileRole | undefined): boolean {
  return canRegisterSkillSheet(role);
}

export function canReplaceSkillSheetUpload(role: ProfileRole | undefined): boolean {
  return canRegisterSkillSheet(role);
}

export function resolveSkillSheetTargetProfileId(input: {
  profileRole: ProfileRole | undefined;
  currentUserId: string;
  selectedLearnerId: string | null;
}): string | null {
  if (
    input.profileRole !== undefined &&
    PROXY_REGISTER_ROLES.includes(input.profileRole) &&
    input.selectedLearnerId
  ) {
    return input.selectedLearnerId;
  }

  if (input.profileRole === "student") {
    return input.currentUserId;
  }

  return input.selectedLearnerId ?? input.currentUserId;
}

export function monitoringSkillSheetEntryVisible(input: {
  profileRole: ProfileRole | undefined;
  shellRole: Role;
}): boolean {
  if (!canViewSkillSheet(input.profileRole)) {
    return false;
  }

  switch (input.shellRole) {
    case "sales":
    case "admin":
    case "instructor":
      return true;
    case "learner":
      return input.profileRole === "student";
    default:
      return false;
  }
}

export function skillSheetFormSectionKeys(): readonly string[] {
  return ["basic", "skills", "projects", "certifications", "self_pr"] as const;
}
