import { describe, expect, it, vi } from "vitest";

import { MissingApiKeyError } from "./anthropic.js";
import {
  SKILL_SHEET_PARSE_MODEL,
  parseSkillSheetFromPdf,
  parseSkillSheetFromXlsx,
} from "./skill-sheet-parse.js";

describe("SKILL_SHEET_PARSE_MODEL", () => {
  it("defaults to claude-opus-5", () => {
    expect(SKILL_SHEET_PARSE_MODEL).toBe("claude-opus-5");
  });
});

describe("parseSkillSheetFromPdf", () => {
  it("returns structured draft only (no persistence side effects)", async () => {
    const completeMessage = vi.fn().mockResolvedValue(
      JSON.stringify({
        sections: {
          basic: {},
          skills: [],
          projects: [],
          certifications: [],
          self_pr: "draft",
        },
      }),
    );

    const draft = await parseSkillSheetFromPdf({
      pdfBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      env: { ANTHROPIC_API_KEY: "test-key" },
      completeMessage,
    });

    expect(draft.status).toBe("DRAFT");
    expect(draft.sections).toBeDefined();
    expect(completeMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        env: expect.objectContaining({ ANTHROPIC_MODEL: "claude-opus-5" }),
      }),
    );
  });

  it("returns 503 when ANTHROPIC_API_KEY is unset (no heuristic fallback)", async () => {
    await expect(
      parseSkillSheetFromPdf({
        pdfBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
        env: { ANTHROPIC_API_KEY: "" },
      }),
    ).rejects.toBeInstanceOf(MissingApiKeyError);
  });

  it("surfaces clear user-visible error on AI parse failure", async () => {
    const completeMessage = vi.fn().mockRejectedValue(new Error("upstream failure"));

    await expect(
      parseSkillSheetFromPdf({
        pdfBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
        env: { ANTHROPIC_API_KEY: "test-key" },
        completeMessage,
      }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/解析|parse|失敗|failed/i),
    });
  });
});

describe("parseSkillSheetFromXlsx", () => {
  it("converts xlsx to CSV via SheetJS before calling AI", async () => {
    const sheetToCsv = vi.fn().mockReturnValue("skill,level\nTypeScript,3");
    const completeMessage = vi.fn().mockResolvedValue(
      JSON.stringify({
        sections: {
          basic: {},
          skills: [{ name: "TypeScript", level: 3 }],
          projects: [],
          certifications: [],
          self_pr: "",
        },
      }),
    );

    const draft = await parseSkillSheetFromXlsx({
      xlsxBytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
      env: { ANTHROPIC_API_KEY: "test-key" },
      sheetToCsv,
      completeMessage,
    });

    expect(sheetToCsv).toHaveBeenCalled();
    expect(completeMessage).toHaveBeenCalled();
    expect(draft.status).toBe("DRAFT");
    expect(draft.sections.skills).toEqual([{ name: "TypeScript", level: 3 }]);
  });
});
