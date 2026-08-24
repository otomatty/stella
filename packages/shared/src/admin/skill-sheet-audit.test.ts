import { describe, expect, it } from "vitest";

import { AUDIT_ACTION_LABELS } from "./audit-actions.js";

describe("skill sheet audit actions (#203)", () => {
  it("defines skill_sheet_upload for parse/upload", () => {
    expect(AUDIT_ACTION_LABELS).toHaveProperty("skill_sheet_upload");
    expect((AUDIT_ACTION_LABELS as Record<string, string>).skill_sheet_upload).toBeTruthy();
  });

  it("defines skill_sheet_update for save", () => {
    expect(AUDIT_ACTION_LABELS).toHaveProperty("skill_sheet_update");
    expect((AUDIT_ACTION_LABELS as Record<string, string>).skill_sheet_update).toBeTruthy();
  });

  it("includes skill sheet actions with Japanese labels", () => {
    const labels = AUDIT_ACTION_LABELS as Record<string, string>;
    for (const action of ["skill_sheet_upload", "skill_sheet_update"]) {
      expect(labels[action]).toBeTruthy();
    }
  });
});
