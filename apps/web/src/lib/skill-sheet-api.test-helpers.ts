/**
 * Issue #233 — skill sheet web API client test contracts.
 * Reuses #203 API paths; expected production module: ./skill-sheet-api.js
 */

import type { SkillSheetDraft, SkillSheetV1 } from "@stella/shared/skill-sheet/types";
import { emptySkillSheetSections } from "@stella/shared/skill-sheet/types";

export const SKILL_SHEET_PARSE_PATH = "/api/skill-sheets/parse";
export const SKILL_SHEET_SAVE_PATH = "/api/skill-sheets";
export const skillSheetViewPath = (profileId: string) => `/api/skill-sheets/${profileId}`;

export const SKILL_SHEET_V1_SECTION_KEYS = [
  "basic",
  "skills",
  "projects",
  "certifications",
  "self_pr",
] as const;

export function minimalSkillSheetV1(): SkillSheetV1 {
  return { sections: emptySkillSheetSections() };
}

export function sampleParseDraft(): SkillSheetDraft {
  return {
    status: "DRAFT",
    sections: {
      basic: { years_total: 5, current_role: "バックエンドエンジニア" },
      skills: [{ name: "TypeScript", category: "lang", years: 3, level: "中", note: "" }],
      projects: [
        {
          period: "2022-2024",
          role: "メンバー",
          team_size: 4,
          phases: ["設計", "実装"],
          technologies: ["TypeScript", "PostgreSQL"],
          summary: "EC 保守",
        },
      ],
      certifications: ["基本情報"],
      self_pr: "解析下書き",
    },
    r2Key: "skill-sheets/ses/seed-learner/test.pdf",
  };
}

export function createPdfFile(name = "resume.pdf"): File {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], name, {
    type: "application/pdf",
  });
}

export function createXlsxFile(name = "resume.xlsx"): File {
  return new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export const TEST_SERVER_URL = "http://127.0.0.1:8787";
