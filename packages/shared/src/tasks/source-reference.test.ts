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
  describe("帰属表示", () => {
    const terms = {
      creator: "Fixture author",
      scope: "図の配色と配置",
      conditionsUrl: "https://example.org/Attrib_copyright_license",
      checkedAt: "2026-09-30",
    };
    const credited = {
      ...reference,
      authorship: "adapted",
      reuse: "adapt-diagram",
      attribution: "Original diagram credit",
      attributionTerms: terms,
    };
    it("文言と原作者・再利用範囲・利用条件・確認日を組で配り、表示位置は持ち込まない", () => {
      const parsed = parsePublicSourceReferences([
        { ...credited, attributionTerms: { ...terms, displayAt: "doc.md" } },
      ]);
      expect(parsed).toEqual([credited]);
    });
    it.each([
      ["文言だけ", { ...credited, attributionTerms: undefined }],
      ["条件だけ", { ...credited, attribution: undefined }],
      ["原作者なし", { ...credited, attributionTerms: { ...terms, creator: " " } }],
      ["範囲なし", { ...credited, attributionTerms: { ...terms, scope: undefined } }],
      ["確認日なし", { ...credited, attributionTerms: { ...terms, checkedAt: "" } }],
      [
        "条件が公開 URL でない",
        { ...credited, attributionTerms: { ...terms, conditionsUrl: "javascript:alert(1)" } },
      ],
      ["条件がオブジェクトでない", { ...credited, attributionTerms: "CC BY-SA" }],
    ])("%s の帰属表示は拒否する", (_label, row) => {
      expect(() => parsePublicSourceReferences([row])).toThrow("attribution");
    });
  });
  it("読む箇所と用途がない出典を拒否する", () => {
    expect(() => parsePublicSourceReferences([{ ...reference, section: "" }])).toThrow("section");
    expect(() => parsePublicSourceReferences([{ ...reference, usedFor: "" }])).toThrow("usedFor");
  });
});
