import type { SkillSheetV1 } from "@falcon/shared/skill-sheet/types";
import type { ProfileRole } from "@falcon/shared/cms/types";

/** Issue #233 TDD contract — implementation pending in skill-sheet-registration-flow.ts */
export type SkillSheetRegistrationPhase = "idle" | "parsing" | "draft" | "saved" | "view";

export interface SkillSheetRegistrationState {
  phase: SkillSheetRegistrationPhase;
  draft: SkillSheetV1 | null;
  r2Key: string | null;
  parseError: string | null;
  savedId: string | null;
  showGenerationBanner: boolean;
  canUpload: boolean;
  canSave: boolean;
  canManualEntry: boolean;
}

export type SkillSheetRegistrationAction =
  | { type: "UPLOAD_START" }
  | { type: "PARSE_SUCCESS"; draft: SkillSheetV1; r2Key?: string }
  | { type: "PARSE_FAILURE"; message: string }
  | { type: "EDIT_FIELD"; sheet: SkillSheetV1 }
  | { type: "SAVE_SUCCESS"; id: string }
  | { type: "REUPLOAD" }
  | { type: "LOAD_SAVED"; sheet: SkillSheetV1; id: string }
  | { type: "START_MANUAL_ENTRY" };

export declare function initialSkillSheetRegistrationState(input: {
  profileRole: ProfileRole | undefined;
  hasSavedSheet: boolean;
}): SkillSheetRegistrationState;

export declare function reduceSkillSheetRegistration(
  state: SkillSheetRegistrationState,
  action: SkillSheetRegistrationAction,
): SkillSheetRegistrationState;
