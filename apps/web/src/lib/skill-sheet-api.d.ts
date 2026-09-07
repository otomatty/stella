import type { SkillSheetDraft, SkillSheetV1 } from "@stella/shared/skill-sheet/types";

/** Issue #233 TDD contract — implementation pending in skill-sheet-api.ts */
export declare function parseSkillSheet(file: File): Promise<SkillSheetDraft>;
export declare function saveSkillSheet(
  profileId: string,
  sheet: SkillSheetV1,
  r2Key?: string,
): Promise<{ id: string; rowCount: number }>;
export declare function fetchSkillSheet(
  profileId: string,
): Promise<{ id: string; sections: SkillSheetV1["sections"] }>;
