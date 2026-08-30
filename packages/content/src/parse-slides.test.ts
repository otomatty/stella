import { describe, expect, it } from "vitest";
import { parseSlides } from "./parse-slides.js";

describe("parseSlides", () => {
  it("front-matter を取り出す", () => {
    const src = [
      "---",
      "id: 1-1-2",
      "title: constとletの違い",
      'takeaway: "constは再代入できない、letはできる"',
      "introduces: [const, let, 再代入]",
      "requires: [変数, 宣言, 代入]",
      'header: "TypeScript入門"',
      "---",
      "",
      "# 1-1-2",
    ].join("\n");

    expect(parseSlides(src)).toEqual({
      id: "1-1-2",
      title: "constとletの違い",
      takeaway: "constは再代入できない、letはできる",
      introduces: ["const", "let", "再代入"],
      requires: ["変数", "宣言", "代入"],
      slideCount: 1,
    });
  });

  it("スライド区切りを数える", () => {
    const src =
      '---\nid: 1-1-1\ntitle: t\ntakeaway: "x"\nintroduces: []\nrequires: []\n---\n\nA\n\n---\n\nB\n\n---\n\nC\n';
    expect(parseSlides(src).slideCount).toBe(3);
  });

  it("CRLF でも枚数を正しく数える", () => {
    const src =
      '---\nid: 1-1-1\ntitle: t\ntakeaway: "x"\nintroduces: []\nrequires: []\n---\n\nA\n\n---\n\nB\n\n---\n\nC\n';
    expect(parseSlides(src.replace(/\n/g, "\r\n")).slideCount).toBe(3);
  });

  it("front-matter が無ければ投げる", () => {
    expect(() => parseSlides("# no front matter")).toThrow(/front-matter/);
  });
});
