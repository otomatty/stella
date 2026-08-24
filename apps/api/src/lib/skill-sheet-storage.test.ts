import { describe, expect, it } from "vitest";

import { ApiError } from "./authz.js";
import {
  SKILL_SHEET_ALLOWED_EXTENSIONS,
  SKILL_SHEET_MAX_UPLOAD_BYTES,
  assertSkillSheetR2Key,
  assertSkillSheetUploadFormat,
  buildSkillSheetR2Key,
} from "./skill-sheet-storage.js";

describe("buildSkillSheetR2Key", () => {
  it("uses skill-sheets/<tenantId>/<profileId>/<id>.<ext> pattern", () => {
    const key = buildSkillSheetR2Key("ses", "seed-learner", "abc123", "pdf");
    expect(key).toBe("skill-sheets/ses/seed-learner/abc123.pdf");
  });

  it("does not use tenant/ prefix (materials policy is forbidden)", () => {
    const key = buildSkillSheetR2Key("ses", "seed-learner", "abc123", "xlsx");
    expect(key.startsWith("tenant/")).toBe(false);
    expect(key.startsWith("skill-sheets/")).toBe(true);
  });
});

describe("assertSkillSheetR2Key", () => {
  it("accepts valid skill-sheets keys", () => {
    expect(() => assertSkillSheetR2Key("skill-sheets/ses/seed-learner/abc123.pdf")).not.toThrow();
  });

  it("rejects tenant/ prefix keys", () => {
    expect(() => assertSkillSheetR2Key("tenant/ses/skill-sheets/seed-learner/abc123.pdf")).toThrow(
      ApiError,
    );
  });
});

describe("assertSkillSheetUploadFormat", () => {
  it("allows pdf and xlsx only", () => {
    expect(SKILL_SHEET_ALLOWED_EXTENSIONS).toEqual(["pdf", "xlsx"]);
    expect(() => assertSkillSheetUploadFormat("resume.pdf", "application/pdf", 1024)).not.toThrow();
    expect(() =>
      assertSkillSheetUploadFormat(
        "resume.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        1024,
      ),
    ).not.toThrow();
  });

  it("rejects unsupported formats with 400", () => {
    expect(() => assertSkillSheetUploadFormat("resume.docx", "application/msword", 1024)).toThrow(
      ApiError,
    );
    try {
      assertSkillSheetUploadFormat("resume.docx", "application/msword", 1024);
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(400);
      expect((err as ApiError).message.length).toBeGreaterThan(0);
    }
  });

  it("rejects files over ~10MB", () => {
    const overLimit = SKILL_SHEET_MAX_UPLOAD_BYTES + 1;
    expect(() => assertSkillSheetUploadFormat("resume.pdf", "application/pdf", overLimit)).toThrow(
      ApiError,
    );
    expect(SKILL_SHEET_MAX_UPLOAD_BYTES).toBeLessThanOrEqual(10 * 1024 * 1024);
  });
});
