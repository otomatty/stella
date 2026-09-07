import type { ProfileRole } from "@stella/shared/cms/types";
import type { Role } from "@/data/types";

/** Issue #233 TDD contract — implementation pending in skill-sheet-ui.ts */
export type SkillSheetUiMode = "register" | "proxy-register" | "view-only";

export declare function canRegisterSkillSheet(role: ProfileRole | undefined): boolean;
export declare function canViewSkillSheet(role: ProfileRole | undefined): boolean;
export declare function resolveSkillSheetUiMode(input: {
  profileRole: ProfileRole | undefined;
  shellRole: Role;
  targetProfileId: string;
  currentUserId: string;
}): SkillSheetUiMode;
export declare function interviewPrepTabIdsForRole(role: Role): string[];
export declare function skillSheetSaveSuccessBanner(): string | null;
export declare function skillSheetParseFailureMessage(error: unknown): string | null;
export declare function canManualEntryAfterParseFailure(role: ProfileRole | undefined): boolean;
export declare function canReplaceSkillSheetUpload(role: ProfileRole | undefined): boolean;
export declare function resolveSkillSheetTargetProfileId(input: {
  profileRole: ProfileRole | undefined;
  currentUserId: string;
  selectedLearnerId: string | null;
}): string | null;
export declare function monitoringSkillSheetEntryVisible(input: {
  profileRole: ProfileRole | undefined;
  shellRole: Role;
}): boolean;
export declare function skillSheetFormSectionKeys(): readonly string[];
