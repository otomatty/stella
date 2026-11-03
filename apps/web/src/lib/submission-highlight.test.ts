import { describe, expect, it } from "vitest";
import {
  highlightSubmission,
  MAX_HIGHLIGHT_CHARS,
  submissionLanguage,
} from "./submission-highlight";

describe("提出コードのハイライト", () => {
  it("HTMLのタグ・属性・属性値を区別し、入力をそのまま保つ", () => {
    const code = '<!doctype html>\n<h1 class="title">はじめてのページ</h1>\n';
    const lines = highlightSubmission(code, "index.html");
    expect(lines.flat().some((part) => part.className.includes("hljs-name"))).toBe(true);
    expect(lines.flat().some((part) => part.className.includes("hljs-attr"))).toBe(true);
    expect(lines.flat().some((part) => part.className.includes("hljs-string"))).toBe(true);
    expect(lines.map((line) => line.map((part) => part.text).join("")).join("\n")).toBe(code);
  });
  it("複数行コメントが続く行もコメントとして色分けする", () => {
    const lines = highlightSubmission("/* 最初\n続き */\nconst value = 1;", "main.ts");
    expect(lines[1]?.some((part) => part.className.includes("hljs-comment"))).toBe(true);
    expect(lines[2]?.some((part) => part.className.includes("hljs-keyword"))).toBe(true);
  });
  it("JSX・CSS・SQL・Pythonなどを拡張子で選ぶ", () => {
    expect(submissionLanguage("App.tsx")).toBe("typescript");
    expect(submissionLanguage("App.jsx")).toBe("javascript");
    expect(submissionLanguage("styles.CSS")).toBe("css");
    expect(submissionLanguage("query.sql")).toBe("sql");
    expect(submissionLanguage("main.py")).toBe("python");
    expect(submissionLanguage("", "js")).toBe("javascript");
  });
  it("未対応のファイルと大きなコードは、内容と行番号を保って表示する", () => {
    expect(highlightSubmission("<script>\n</script>", "notes.txt")).toEqual([
      [{ text: "<script>", className: "" }],
      [{ text: "</script>", className: "" }],
    ]);
    expect(
      highlightSubmission("x".repeat(MAX_HIGHLIGHT_CHARS + 1), "large.js")[0]?.[0]?.className,
    ).toBe("");
  });
});
