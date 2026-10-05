import { describe, expect, it } from "vitest";
import { isPublicSourceUrl, parsePublicSourceReferences } from "./source-reference.js";
const reference = {
  id: "SRC-mdn-20261005",
  title: "HTML",
  publisher: "MDN",
  url: "https://example.org/html",
  section: "見出し",
  documentVersion: "更新型",
  checkedAt: "2026-10-05",
  environmentRef: "static-web-01@1",
  usedFor: "見出しの受入条件",
  authorship: "original-exercise",
  reuse: "concept-reference",
};
describe("出典の公開境界", () => {
  it.each([
    "javascript:alert(1)",
    "file:///private/answer.md",
    "https://example.org/private/answer",
    "https://example.org/%70rivate/answer",
    "https://user:pass@example.org/",
  ])("%s を公開リンクにしない", (url) => {
    expect(isPublicSourceUrl(url)).toBe(false);
  });
  it("内部レビューや非公開素材の属性を配布データに持ち込まない", () => {
    const parsed = parsePublicSourceReferences([
      { ...reference, review: { reviewer: "teacher" }, private: "secret" },
    ]);
    expect(parsed).toEqual([reference]);
  });
  it("読む箇所と用途がない出典を拒否する", () => {
    expect(() => parsePublicSourceReferences([{ ...reference, section: "" }])).toThrow("section");
    expect(() => parsePublicSourceReferences([{ ...reference, usedFor: "" }])).toThrow("usedFor");
  });
});
