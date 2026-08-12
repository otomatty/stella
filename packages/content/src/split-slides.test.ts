import { describe, expect, it } from "vitest";
import { splitSlides, stripFrontMatter } from "./split-slides.js";

const SAMPLE = [
  "---",
  "id: 1-1-2",
  "title: constとletの違い",
  'takeaway: "constは再代入できない、letはできる"',
  "---",
  "",
  "<!-- _class: lead -->",
  "",
  "# 1-1-2",
  "# constとletの違い",
  "",
  "<!-- ノート: つかみ。ここで期待を持たせる。 -->",
  "",
  "---",
  "",
  "## なぜ必要か",
  "",
  "- 変わっていく値と、変わってほしくない値がある",
  "",
  "<!-- ノート: 税率の事故は現場で本当に起きる。 -->",
  "",
  "---",
  "",
  "## 結論",
  "",
  "**constは再代入できない、letはできる**",
  "",
].join("\n");

describe("stripFrontMatter", () => {
  it("front-matter を落とした本文を返す", () => {
    const body = stripFrontMatter(SAMPLE);
    expect(body).not.toContain("takeaway:");
    expect(body.trimStart().startsWith("<!-- _class: lead -->")).toBe(true);
  });

  it("CRLF でも落とせる", () => {
    expect(stripFrontMatter(SAMPLE.replace(/\n/g, "\r\n"))).not.toContain("takeaway:");
  });

  it("front-matter が無ければ投げる", () => {
    expect(() => stripFrontMatter("# no front matter")).toThrow(/front-matter/);
  });
});

describe("splitSlides", () => {
  it("--- 区切りでスライドに分ける", () => {
    expect(splitSlides(SAMPLE)).toHaveLength(3);
  });

  it("講師ノートを本文から外して note に入れる", () => {
    const slides = splitSlides(SAMPLE);
    expect(slides[0].note).toBe("つかみ。ここで期待を持たせる。");
    expect(slides[0].body).not.toContain("ノート:");
    expect(slides[1].note).toBe("税率の事故は現場で本当に起きる。");
  });

  it("ノートが無いスライドは note が null", () => {
    expect(splitSlides(SAMPLE)[2].note).toBeNull();
  });

  it("Marp 用のディレクティブコメントは本文から外す", () => {
    expect(splitSlides(SAMPLE)[0].body).not.toContain("_class");
  });

  it("本文は前後の空白を落として返す", () => {
    const slides = splitSlides(SAMPLE);
    expect(slides[0].body.startsWith("# 1-1-2")).toBe(true);
    expect(slides[2].body.endsWith("letはできる**")).toBe(true);
  });

  it("CRLF でも同じ結果になる", () => {
    const crlf = splitSlides(SAMPLE.replace(/\n/g, "\r\n"));
    expect(crlf).toHaveLength(3);
    expect(crlf[0].note).toBe("つかみ。ここで期待を持たせる。");
  });
});
