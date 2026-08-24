/**
 * Issue #233 — skill sheet UI permission and screen wiring tests.
 * Expected production module: ./skill-sheet-ui.js
 */

import { describe, expect, it } from "vitest";
import type { ProfileRole } from "@falcon/shared/cms/types";
import type { Role } from "@/data/types";

type SkillSheetUiModule = typeof import("./skill-sheet-ui.js");

async function loadSkillSheetUi(): Promise<SkillSheetUiModule | null> {
  try {
    return await import("./skill-sheet-ui.js");
  } catch {
    return null;
  }
}

const REGISTER_ROLES: ProfileRole[] = ["student", "sales", "admin", "platform_admin"];
const VIEW_ROLES: ProfileRole[] = ["student", "sales", "admin", "platform_admin", "instructor"];

describe("skill-sheet-ui module (#233)", () => {
  it("exports role helpers and interview-prep tab wiring", async () => {
    const mod = await loadSkillSheetUi();
    expect(mod, "skill-sheet-ui.js must exist for #233").not.toBeNull();
    expect(typeof mod?.canRegisterSkillSheet).toBe("function");
    expect(typeof mod?.canViewSkillSheet).toBe("function");
    expect(typeof mod?.resolveSkillSheetUiMode).toBe("function");
    expect(typeof mod?.interviewPrepTabIdsForRole).toBe("function");
    expect(typeof mod?.skillSheetSaveSuccessBanner).toBe("function");
    expect(typeof mod?.skillSheetParseFailureMessage).toBe("function");
    expect(typeof mod?.canManualEntryAfterParseFailure).toBe("function");
    expect(typeof mod?.canReplaceSkillSheetUpload).toBe("function");
    expect(typeof mod?.resolveSkillSheetTargetProfileId).toBe("function");
    expect(typeof mod?.monitoringSkillSheetEntryVisible).toBe("function");
    expect(typeof mod?.skillSheetFormSectionKeys).toBe("function");
  });
});

describe("canRegisterSkillSheet (#233 acceptance 1, 2, 3)", () => {
  it.each(REGISTER_ROLES.map((role) => [role, true] as const))(
    "allows %s to upload and save",
    async (role, expected) => {
      const mod = await loadSkillSheetUi();
      expect(mod, "skill-sheet-ui.js must exist for #233").not.toBeNull();
      expect(mod?.canRegisterSkillSheet(role)).toBe(expected);
    },
  );

  it("denies instructor upload/save affordance", async () => {
    const mod = await loadSkillSheetUi();
    expect(mod, "skill-sheet-ui.js must exist for #233").not.toBeNull();
    expect(mod?.canRegisterSkillSheet("instructor")).toBe(false);
  });
});

describe("canViewSkillSheet (#233 acceptance 4)", () => {
  it.each(VIEW_ROLES.map((role) => [role, true] as const))(
    "allows %s to view a saved sheet",
    async (role, expected) => {
      const mod = await loadSkillSheetUi();
      expect(mod, "skill-sheet-ui.js must exist for #233").not.toBeNull();
      expect(mod?.canViewSkillSheet(role)).toBe(expected);
    },
  );
});

describe("resolveSkillSheetUiMode (#233 screens)", () => {
  it("learner self-registers on interview-prep スキルシート tab", async () => {
    const mod = await loadSkillSheetUi();
    expect(mod, "skill-sheet-ui.js must exist for #233").not.toBeNull();
    expect(
      mod?.resolveSkillSheetUiMode({
        profileRole: "student",
        shellRole: "learner",
        targetProfileId: "seed-learner",
        currentUserId: "seed-learner",
      }),
    ).toBe("register");
  });

  it("sales proxy-registers from monitoring learner detail", async () => {
    const mod = await loadSkillSheetUi();
    expect(mod, "skill-sheet-ui.js must exist for #233").not.toBeNull();
    expect(
      mod?.resolveSkillSheetUiMode({
        profileRole: "sales",
        shellRole: "sales",
        targetProfileId: "seed-learner",
        currentUserId: "seed-sales",
      }),
    ).toBe("proxy-register");
  });

  it("admin proxy-registers from monitoring learner detail", async () => {
    const mod = await loadSkillSheetUi();
    expect(mod, "skill-sheet-ui.js must exist for #233").not.toBeNull();
    expect(
      mod?.resolveSkillSheetUiMode({
        profileRole: "admin",
        shellRole: "admin",
        targetProfileId: "seed-learner",
        currentUserId: "seed-admin",
      }),
    ).toBe("proxy-register");
  });

  it("instructor is view-only on monitoring entry", async () => {
    const mod = await loadSkillSheetUi();
    expect(mod, "skill-sheet-ui.js must exist for #233").not.toBeNull();
    expect(
      mod?.resolveSkillSheetUiMode({
        profileRole: "instructor",
        shellRole: "instructor",
        targetProfileId: "seed-learner",
        currentUserId: "seed-instructor",
      }),
    ).toBe("view-only");
  });
});

describe("interviewPrepTabIdsForRole (#233 learner tab)", () => {
  it("learner interview-prep includes スキルシート tab alongside questions", async () => {
    const mod = await loadSkillSheetUi();
    expect(mod, "skill-sheet-ui.js must exist for #233").not.toBeNull();
    const tabs = mod?.interviewPrepTabIdsForRole("learner");
    expect(tabs).toContain("questions");
    expect(tabs).toContain("skill-sheet");
  });
});

describe("monitoringSkillSheetEntryVisible (#233 acceptance 2, 3)", () => {
  it("shows proxy registration entry for sales and admin on monitoring", async () => {
    const mod = await loadSkillSheetUi();
    expect(mod, "skill-sheet-ui.js must exist for #233").not.toBeNull();
    for (const shellRole of ["sales", "admin"] as const satisfies Role[]) {
      expect(
        mod?.monitoringSkillSheetEntryVisible({
          profileRole: shellRole,
          shellRole,
        }),
      ).toBe(true);
    }
  });

  it("shows view-only monitoring entry for instructor without upload", async () => {
    const mod = await loadSkillSheetUi();
    expect(mod, "skill-sheet-ui.js must exist for #233").not.toBeNull();
    expect(
      mod?.monitoringSkillSheetEntryVisible({
        profileRole: "instructor",
        shellRole: "instructor",
      }),
    ).toBe(true);
    expect(mod?.canRegisterSkillSheet("instructor")).toBe(false);
  });
});

describe("resolveSkillSheetTargetProfileId (#233 proxy registration)", () => {
  it("learner saves against own profile id", async () => {
    const mod = await loadSkillSheetUi();
    expect(mod, "skill-sheet-ui.js must exist for #233").not.toBeNull();
    expect(
      mod?.resolveSkillSheetTargetProfileId({
        profileRole: "student",
        currentUserId: "seed-learner",
        selectedLearnerId: null,
      }),
    ).toBe("seed-learner");
  });

  it("sales/admin save against selected learner from monitoring", async () => {
    const mod = await loadSkillSheetUi();
    expect(mod, "skill-sheet-ui.js must exist for #233").not.toBeNull();
    expect(
      mod?.resolveSkillSheetTargetProfileId({
        profileRole: "sales",
        currentUserId: "seed-sales",
        selectedLearnerId: "seed-learner",
      }),
    ).toBe("seed-learner");
  });
});

describe("parse failure and manual entry (#233 acceptance 5)", () => {
  it("maps parse errors to a clear user-facing message", async () => {
    const mod = await loadSkillSheetUi();
    expect(mod, "skill-sheet-ui.js must exist for #233").not.toBeNull();
    const message = mod?.skillSheetParseFailureMessage(new Error("解析に失敗しました"));
    expect(message).toMatch(/解析|失敗|手入力|入力/i);
  });

  it("keeps manual entry available for registrars after parse failure", async () => {
    const mod = await loadSkillSheetUi();
    expect(mod, "skill-sheet-ui.js must exist for #233").not.toBeNull();
    for (const role of REGISTER_ROLES) {
      expect(mod?.canManualEntryAfterParseFailure(role)).toBe(true);
    }
    expect(mod?.canManualEntryAfterParseFailure("instructor")).toBe(false);
  });
});

describe("replace / re-upload (#233 learner tab)", () => {
  it("allows learner to replace an uploaded or saved sheet", async () => {
    const mod = await loadSkillSheetUi();
    expect(mod, "skill-sheet-ui.js must exist for #233").not.toBeNull();
    expect(mod?.canReplaceSkillSheetUpload("student")).toBe(true);
    expect(mod?.canReplaceSkillSheetUpload("instructor")).toBe(false);
  });
});

describe("SkillSheetV1 form sections (#203 / #233)", () => {
  it("exposes basic / skills / projects / certifications / self_pr editors", async () => {
    const mod = await loadSkillSheetUi();
    expect(mod, "skill-sheet-ui.js must exist for #233").not.toBeNull();
    expect(mod?.skillSheetFormSectionKeys()).toEqual([
      "basic",
      "skills",
      "projects",
      "certifications",
      "self_pr",
    ]);
  });
});

describe("save success guidance for #206 (#233 acceptance 6)", () => {
  it("shows learner banner that personal answer templates will be generated (enqueue only)", async () => {
    const mod = await loadSkillSheetUi();
    expect(mod, "skill-sheet-ui.js must exist for #233").not.toBeNull();
    const banner = mod?.skillSheetSaveSuccessBanner();
    expect(banner).toMatch(/個別|回答の型|生成|A 必修/i);
    expect(banner).not.toMatch(/完了しました|生成されました/i);
  });
});
