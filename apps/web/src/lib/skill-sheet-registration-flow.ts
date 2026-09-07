/**
 * スキルシート登録フロー reducer (Issue #233)。
 */

import { emptySkillSheetSections, type SkillSheetV1 } from "@stella/shared/skill-sheet/types";
import type { ProfileRole } from "@stella/shared/cms/types";

import {
  canManualEntryAfterParseFailure,
  canRegisterSkillSheet,
  canViewSkillSheet,
} from "./skill-sheet-ui.js";

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

export function initialSkillSheetRegistrationState(input: {
  profileRole: ProfileRole | undefined;
  hasSavedSheet: boolean;
}): SkillSheetRegistrationState {
  const { profileRole, hasSavedSheet } = input;

  if (profileRole === "instructor" && hasSavedSheet && canViewSkillSheet(profileRole)) {
    return {
      phase: "view",
      draft: null,
      r2Key: null,
      parseError: null,
      savedId: null,
      showGenerationBanner: false,
      canUpload: false,
      canSave: false,
      canManualEntry: false,
    };
  }

  if (hasSavedSheet && canRegisterSkillSheet(profileRole)) {
    return {
      phase: "saved",
      draft: null,
      r2Key: null,
      parseError: null,
      savedId: null,
      showGenerationBanner: false,
      canUpload: canRegisterSkillSheet(profileRole),
      canSave: false,
      canManualEntry: canManualEntryAfterParseFailure(profileRole),
    };
  }

  return {
    phase: "idle",
    draft: null,
    r2Key: null,
    parseError: null,
    savedId: null,
    showGenerationBanner: false,
    canUpload: canRegisterSkillSheet(profileRole),
    canSave: false,
    canManualEntry: canManualEntryAfterParseFailure(profileRole),
  };
}

export function reduceSkillSheetRegistration(
  state: SkillSheetRegistrationState,
  action: SkillSheetRegistrationAction,
): SkillSheetRegistrationState {
  switch (action.type) {
    case "UPLOAD_START":
      return {
        ...state,
        phase: "parsing",
        parseError: null,
      };

    case "PARSE_SUCCESS":
      return {
        ...state,
        phase: "draft",
        draft: action.draft,
        r2Key: action.r2Key ?? null,
        parseError: null,
        savedId: null,
        showGenerationBanner: false,
        canSave: state.canUpload,
      };

    case "PARSE_FAILURE":
      return {
        ...state,
        phase: "draft",
        draft: { sections: emptySkillSheetSections() },
        parseError: action.message,
        r2Key: null,
        savedId: null,
        showGenerationBanner: false,
        canUpload: state.canUpload,
        canSave: state.canUpload,
        canManualEntry: state.canManualEntry,
      };

    case "EDIT_FIELD":
      return {
        ...state,
        draft: action.sheet,
      };

    case "SAVE_SUCCESS":
      return {
        ...state,
        phase: "saved",
        savedId: action.id,
        parseError: null,
        showGenerationBanner: true,
        canUpload: state.canUpload,
        canSave: false,
      };

    case "REUPLOAD":
      return {
        ...state,
        phase: "idle",
        draft: null,
        r2Key: null,
        parseError: null,
        savedId: state.savedId,
        showGenerationBanner: false,
        canSave: false,
      };

    case "LOAD_SAVED":
      return {
        ...state,
        phase: "view",
        draft: action.sheet,
        savedId: action.id,
        parseError: null,
        showGenerationBanner: false,
      };

    case "START_MANUAL_ENTRY":
      return {
        ...state,
        phase: "draft",
        draft: { sections: emptySkillSheetSections() },
        parseError: null,
        r2Key: null,
        savedId: null,
        showGenerationBanner: false,
        canUpload: state.canUpload,
        canSave: state.canUpload,
        canManualEntry: state.canManualEntry,
      };

    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
