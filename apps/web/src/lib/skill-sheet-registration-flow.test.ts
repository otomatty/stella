/**
 * Issue #233 — skill sheet registration flow reducer tests.
 * Expected production module: ./skill-sheet-registration-flow.js
 */

import { describe, expect, it } from "vitest";
import { emptySkillSheetSections } from "@stella/shared/skill-sheet/types";

import { minimalSkillSheetV1, sampleParseDraft } from "./skill-sheet-api.test-helpers.js";

type RegistrationFlowModule = typeof import("./skill-sheet-registration-flow.js");

async function loadRegistrationFlow(): Promise<RegistrationFlowModule | null> {
  try {
    return await import("./skill-sheet-registration-flow.js");
  } catch {
    return null;
  }
}

describe("skill-sheet-registration-flow module (#233)", () => {
  it("exports initialSkillSheetRegistrationState and reduceSkillSheetRegistration", async () => {
    const mod = await loadRegistrationFlow();
    expect(mod, "skill-sheet-registration-flow.js must exist for #233").not.toBeNull();
    expect(typeof mod?.initialSkillSheetRegistrationState).toBe("function");
    expect(typeof mod?.reduceSkillSheetRegistration).toBe("function");
  });
});

describe("learner upload → draft → edit → save (#233 acceptance 1)", () => {
  it("starts with upload affordance for registrars", async () => {
    const mod = await loadRegistrationFlow();
    expect(mod, "skill-sheet-registration-flow.js must exist for #233").not.toBeNull();

    const state = mod?.initialSkillSheetRegistrationState({
      profileRole: "student",
      hasSavedSheet: false,
    });
    expect(state?.canUpload).toBe(true);
    expect(state?.phase).toBe("idle");
  });

  it("transitions parse success into editable draft without committing save", async () => {
    const mod = await loadRegistrationFlow();
    expect(mod, "skill-sheet-registration-flow.js must exist for #233").not.toBeNull();

    const initial = mod?.initialSkillSheetRegistrationState({
      profileRole: "student",
      hasSavedSheet: false,
    });
    expect(initial).toBeDefined();

    const parsing = mod?.reduceSkillSheetRegistration(initial as NonNullable<typeof initial>, {
      type: "UPLOAD_START",
    });
    expect(parsing?.phase).toBe("parsing");

    const draft = sampleParseDraft();
    const afterParse = mod?.reduceSkillSheetRegistration(parsing as NonNullable<typeof parsing>, {
      type: "PARSE_SUCCESS",
      draft: { sections: draft.sections },
      r2Key: draft.r2Key,
    });
    expect(afterParse?.phase).toBe("draft");
    expect(afterParse?.draft?.sections.self_pr).toBe("解析下書き");
    expect(afterParse?.savedId).toBeNull();
    expect(afterParse?.canSave).toBe(true);
  });

  it("commits save and leaves draft for view/re-upload", async () => {
    const mod = await loadRegistrationFlow();
    expect(mod, "skill-sheet-registration-flow.js must exist for #233").not.toBeNull();

    let state = mod?.initialSkillSheetRegistrationState({
      profileRole: "student",
      hasSavedSheet: false,
    });
    state = mod?.reduceSkillSheetRegistration(state as NonNullable<typeof state>, {
      type: "PARSE_SUCCESS",
      draft: minimalSkillSheetV1(),
    }) as NonNullable<typeof state>;

    const edited = mod?.reduceSkillSheetRegistration(state, {
      type: "EDIT_FIELD",
      sheet: {
        sections: { ...emptySkillSheetSections(), self_pr: "編集後" },
      },
    });
    expect(edited?.draft?.sections.self_pr).toBe("編集後");

    const saved = mod?.reduceSkillSheetRegistration(edited as NonNullable<typeof edited>, {
      type: "SAVE_SUCCESS",
      id: "sheet-1",
    });
    expect(saved?.phase).toBe("saved");
    expect(saved?.savedId).toBe("sheet-1");
    expect(saved?.canUpload).toBe(true);
  });
});

describe("sales/admin proxy registration from monitoring (#233 acceptance 2)", () => {
  it("allows save in proxy mode for sales", async () => {
    const mod = await loadRegistrationFlow();
    expect(mod, "skill-sheet-registration-flow.js must exist for #233").not.toBeNull();

    const state = mod?.initialSkillSheetRegistrationState({
      profileRole: "sales",
      hasSavedSheet: false,
    });
    expect(state?.canUpload).toBe(true);
    expect(state?.canSave).toBe(false);

    const draft = mod?.reduceSkillSheetRegistration(state as NonNullable<typeof state>, {
      type: "PARSE_SUCCESS",
      draft: minimalSkillSheetV1(),
    });
    expect(draft?.canSave).toBe(true);
  });
});

describe("instructor view-only (#233 acceptance 3)", () => {
  it("does not offer upload or save affordances", async () => {
    const mod = await loadRegistrationFlow();
    expect(mod, "skill-sheet-registration-flow.js must exist for #233").not.toBeNull();

    const state = mod?.initialSkillSheetRegistrationState({
      profileRole: "instructor",
      hasSavedSheet: true,
    });
    expect(state?.canUpload).toBe(false);
    expect(state?.canSave).toBe(false);
    expect(state?.canManualEntry).toBe(false);
    expect(state?.phase).toBe("view");
  });
});

describe("saved sheet viewing (#233 acceptance 4)", () => {
  it("loads saved sheet into view phase for staff and learner", async () => {
    const mod = await loadRegistrationFlow();
    expect(mod, "skill-sheet-registration-flow.js must exist for #233").not.toBeNull();

    const sheet = minimalSkillSheetV1();
    sheet.sections.self_pr = "閲覧用";
    const viewed = mod?.reduceSkillSheetRegistration(
      mod?.initialSkillSheetRegistrationState({
        profileRole: "instructor",
        hasSavedSheet: true,
      }) as NonNullable<
        ReturnType<NonNullable<RegistrationFlowModule>["initialSkillSheetRegistrationState"]>
      >,
      { type: "LOAD_SAVED", sheet, id: "sheet-view" },
    );
    expect(viewed?.phase).toBe("view");
    expect(viewed?.draft?.sections.self_pr).toBe("閲覧用");
  });
});

describe("parse failure with manual entry (#233 acceptance 5)", () => {
  it("shows parse error and keeps manual entry path for registrars", async () => {
    const mod = await loadRegistrationFlow();
    expect(mod, "skill-sheet-registration-flow.js must exist for #233").not.toBeNull();

    let state = mod?.initialSkillSheetRegistrationState({
      profileRole: "student",
      hasSavedSheet: false,
    });
    state = mod?.reduceSkillSheetRegistration(state as NonNullable<typeof state>, {
      type: "UPLOAD_START",
    }) as NonNullable<typeof state>;

    const failed = mod?.reduceSkillSheetRegistration(state, {
      type: "PARSE_FAILURE",
      message: "解析に失敗しました。手入力で登録できます。",
    });
    expect(failed?.parseError).toMatch(/解析|失敗|手入力/i);
    expect(failed?.canManualEntry).toBe(true);
    expect(failed?.canSave).toBe(true);
    expect(failed?.draft?.sections).toEqual(emptySkillSheetSections());
  });

  it("manual entry start provides empty SkillSheetV1 form", async () => {
    const mod = await loadRegistrationFlow();
    expect(mod, "skill-sheet-registration-flow.js must exist for #233").not.toBeNull();

    const manual = mod?.reduceSkillSheetRegistration(
      mod?.initialSkillSheetRegistrationState({
        profileRole: "admin",
        hasSavedSheet: false,
      }) as NonNullable<
        ReturnType<NonNullable<RegistrationFlowModule>["initialSkillSheetRegistrationState"]>
      >,
      { type: "START_MANUAL_ENTRY" },
    );
    expect(manual?.phase).toBe("draft");
    expect(manual?.draft?.sections).toEqual(emptySkillSheetSections());
    expect(manual?.canSave).toBe(true);
  });
});

describe("replace / re-upload (#233 learner tab)", () => {
  it("returns to idle upload state on REUPLOAD after save", async () => {
    const mod = await loadRegistrationFlow();
    expect(mod, "skill-sheet-registration-flow.js must exist for #233").not.toBeNull();

    let state = mod?.initialSkillSheetRegistrationState({
      profileRole: "student",
      hasSavedSheet: true,
    });
    state = mod?.reduceSkillSheetRegistration(state as NonNullable<typeof state>, {
      type: "LOAD_SAVED",
      sheet: minimalSkillSheetV1(),
      id: "sheet-1",
    }) as NonNullable<typeof state>;

    const reupload = mod?.reduceSkillSheetRegistration(state, { type: "REUPLOAD" });
    expect(reupload?.phase).toBe("idle");
    expect(reupload?.draft).toBeNull();
    expect(reupload?.parseError).toBeNull();
    expect(reupload?.canUpload).toBe(true);
  });
});

describe("post-save #206 guidance (#233 acceptance 6)", () => {
  it("sets generation info banner without requiring real AI completion", async () => {
    const mod = await loadRegistrationFlow();
    expect(mod, "skill-sheet-registration-flow.js must exist for #233").not.toBeNull();

    let state = mod?.initialSkillSheetRegistrationState({
      profileRole: "student",
      hasSavedSheet: false,
    });
    state = mod?.reduceSkillSheetRegistration(state as NonNullable<typeof state>, {
      type: "PARSE_SUCCESS",
      draft: minimalSkillSheetV1(),
    }) as NonNullable<typeof state>;

    const saved = mod?.reduceSkillSheetRegistration(state, {
      type: "SAVE_SUCCESS",
      id: "sheet-1",
    });
    expect(saved?.showGenerationBanner).toBe(true);
  });
});
