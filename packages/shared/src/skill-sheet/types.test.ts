import { describe, expect, it } from "vitest";

import { stripForbiddenContactFields, validateSkillSheetV1 } from "./types.js";

/** Required top-level sections in SkillSheet v1 (Issue #203). */
const SKILL_SHEET_V1_SECTIONS = [
  "basic",
  "skills",
  "projects",
  "certifications",
  "self_pr",
] as const;

const FORBIDDEN_PARSED_CONTACT_FIELDS = [
  "name",
  "fullName",
  "full_name",
  "email",
  "phone",
  "tel",
  "telephone",
  "mobile",
  "address",
  "contact",
] as const;

function minimalSkillSheetV1() {
  return {
    sections: {
      basic: {},
      skills: [],
      projects: [],
      certifications: [],
      self_pr: "",
    },
  };
}

describe("SkillSheet v1 shape", () => {
  it("requires sections basic, skills, projects, certifications, self_pr", () => {
    const result = validateSkillSheetV1(minimalSkillSheetV1());
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const section of SKILL_SHEET_V1_SECTIONS) {
        expect(result.value.sections).toHaveProperty(section);
      }
    }
  });

  it("rejects payloads missing required sections", () => {
    const result = validateSkillSheetV1({ sections: { basic: {} } });
    expect(result.ok).toBe(false);
  });
});

describe("stripForbiddenContactFields", () => {
  it("removes name and contact info from parsed draft", () => {
    const raw = {
      sections: {
        basic: { title: "Engineer", name: "Taro Yamada", email: "taro@example.com" },
        skills: [],
        projects: [],
        certifications: [],
        self_pr: "motivated",
      },
      phone: "090-0000-0000",
      fullName: "Taro Yamada",
    };

    const stripped = stripForbiddenContactFields(raw);

    for (const field of FORBIDDEN_PARSED_CONTACT_FIELDS) {
      expect(stripped).not.toHaveProperty(field);
    }
    expect(stripped.sections.basic).not.toHaveProperty("name");
    expect(stripped.sections.basic).not.toHaveProperty("email");
    expect(stripped.sections.basic).toHaveProperty("title", "Engineer");
  });
});
