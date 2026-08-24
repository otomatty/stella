/**
 * Issue #206 — plain common answer templates (retire blank-span decorations).
 */

import { describe, expect, it } from "vitest";

import { plainAnswerTemplateText } from "./answer-template.js";
import { INTERVIEW_QUESTIONS } from "./questions.js";

describe("plainAnswerTemplateText (#206)", () => {
  it("removes blank span markup while preserving inner text", () => {
    expect(
      plainAnswerTemplateText(
        '経験は<span class="blank">5</span>年で、<span class="blank">PHP</span>が中心です',
      ),
    ).toBe("経験は5年で、PHPが中心です");
  });

  it("returns plain strings unchanged", () => {
    expect(plainAnswerTemplateText("そのまま表示")).toBe("そのまま表示");
  });
});

describe("INTERVIEW_QUESTIONS common templates (#206)", () => {
  it("stores common answer templates without blank span decorations", () => {
    for (const q of INTERVIEW_QUESTIONS) {
      if (!q.answer_template) continue;
      expect(q.answer_template, `no=${q.no}`).not.toMatch(/<span class="blank">/);
      expect(q.answer_template, `no=${q.no}`).toEqual(plainAnswerTemplateText(q.answer_template));
    }
  });
});
