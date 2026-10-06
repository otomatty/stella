import { describe, expect, it, vi } from "vitest";
import {
  buildLessonDocHtml,
  defaultOsForPlatform,
  markdownToHtml,
  resolveLessonDoc,
} from "./lesson-doc.js";

vi.mock("vscode", () => ({
  window: { createWebviewPanel: vi.fn() },
  ViewColumn: { Active: 1 },
}));

describe("markdownToHtml", () => {
  it("escapes raw HTML instead of passing it through", () => {
    const html = markdownToHtml("<script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders headings, lists, fenced code, and links", () => {
    const src = [
      "# Title",
      "",
      "- item",
      "",
      "```ts",
      "const x = 1;",
      "```",
      "",
      "[docs](https://example.com)",
    ].join("\n");
    const html = markdownToHtml(src);
    expect(html).toContain("<h1>");
    expect(html).toContain("Title");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>");
    expect(html).toContain("<pre>");
    expect(html).toContain("<code");
    expect(html).toContain("const x = 1;");
    expect(html).toContain('href="https://example.com"');
  });

  it("does not turn javascript: links into hrefs", () => {
    const html = markdownToHtml("[x](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("x");
  });

  it("strips _class authoring comments instead of showing escaped HTML", () => {
    const html = markdownToHtml("<!-- _class: lead -->\n# Hello");
    expect(html).not.toContain("_class");
    expect(html).not.toContain("&lt;!--");
    expect(html).toContain("<h1>");
    expect(html).toContain("Hello");
  });

  it("renders a takeaway blockquote", () => {
    const html = markdownToHtml("> **takeaway**");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("</blockquote>");
    expect(html).toContain("<strong>takeaway</strong>");
  });

  it("renders a 2-column pipe table", () => {
    const html = markdownToHtml("| a | b |\n| --- | --- |\n| 1 | 2 |");
    expect(html).toContain("<table>");
    expect(html).toContain("</table>");
    expect(html).toContain("<th>");
    expect(html).toContain("a");
    expect(html).toContain("b");
    expect(html).toContain("<td>");
    expect(html).toContain("1");
    expect(html).toContain("2");
  });
});

describe("resolveLessonDoc", () => {
  it("prefers markdown when both markdown and pdfPath exist", () => {
    const doc = resolveLessonDoc({
      id: "l1",
      stageId: "c1",
      title: "Intro",
      markdown: "# Hi",
      pdfPath: "slides/a.pdf",
    });
    expect(doc.kind).toBe("markdown");
    if (doc.kind === "markdown") {
      expect(doc.bodyHtml).toContain("<h1>");
      expect(doc.bodyHtml).toContain("Hi");
    }
  });

  it("is pdf-only when only pdfPath exists", () => {
    const doc = resolveLessonDoc({
      id: "l1",
      stageId: "c1",
      title: "Slides",
      pdfPath: "slides/a.pdf",
    });
    expect(doc).toEqual({
      kind: "pdf-only",
      title: "Slides",
      stageId: "c1",
      lessonId: "l1",
    });
  });

  it("is empty when neither markdown nor pdfPath is present", () => {
    const doc = resolveLessonDoc({
      id: "l1",
      stageId: "c1",
      title: "Soon",
    });
    expect(doc.kind).toBe("empty");
  });
});

describe("buildLessonDocHtml", () => {
  it("includes no script tags", () => {
    const html = buildLessonDocHtml({
      kind: "markdown",
      title: "Intro",
      bodyHtml: "<h1>Hi</h1>",
    });
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain("<h1>Hi</h1>");
  });

  it("offers stella.openInWeb for pdf-only lessons", () => {
    const html = buildLessonDocHtml({
      kind: "pdf-only",
      title: "Slides",
      stageId: "c1",
      lessonId: "l1",
    });
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain("command:stella.openInWeb");
    expect(html).toContain("c1");
    expect(html).toContain("l1");
  });
});

describe("OS 別ブロック", () => {
  const source = [
    "# 確認",
    "",
    ":::os macos",
    "```sh",
    "npm --version",
    "```",
    ":::",
    ":::os windows",
    "PowerShell で <b>npm.cmd</b> を使います。",
    "",
    "```powershell",
    "npm.cmd --version",
    "```",
    ":::",
    "",
    "数字が出たら合格です。",
  ].join("\n");

  it("OS のタブにして、指定した OS のタブを開いておく", () => {
    const html = markdownToHtml(source, { os: "macos" });
    expect(html).toContain('<div class="os-tabs"');
    // タブは Windows・macOS の順
    expect(html.indexOf('value="windows"')).toBeLessThan(html.indexOf('value="macos"'));
    expect(html).toMatch(/value="macos" checked/);
    expect(html).not.toMatch(/value="windows" checked/);
    expect(html).toContain('<div class="os-panel" data-os="windows">');
    expect(html).toContain("npm.cmd --version");
    expect(html).toContain("<h1>確認</h1>");
    expect(html).toContain("<p>数字が出たら合格です。</p>");
    expect(html).not.toContain(":::");
  });

  it("ブロックの中の生の HTML も文字のまま出す", () => {
    const html = markdownToHtml(source, { os: "windows" });
    expect(html).toContain("&lt;b&gt;npm.cmd&lt;/b&gt;");
    expect(html).not.toContain("<b>");
    expect(html).toMatch(/value="windows" checked/);
  });

  it("組ごとにラジオの名前を分ける", () => {
    const html = markdownToHtml(`${source}\n\n${source}`, { os: "windows" });
    expect(html).toContain('name="os-tabs-1"');
    expect(html).toContain('name="os-tabs-2"');
  });

  it("既定のタブは process.platform で決め、Windows・macOS 以外は Windows にする", () => {
    expect(defaultOsForPlatform("win32")).toBe("windows");
    expect(defaultOsForPlatform("darwin")).toBe("macos");
    expect(defaultOsForPlatform("linux")).toBe("windows");
    const doc = resolveLessonDoc(
      { id: "doc-0-1", stageId: "s", title: "まとめ", markdown: source },
      defaultOsForPlatform("darwin"),
    );
    expect(doc.kind === "markdown" && doc.bodyHtml).toMatch(/value="macos" checked/);
  });

  it("OS 別ブロックの無い本文は今までどおり描く", () => {
    expect(markdownToHtml("# A\n\nB", { os: "macos" })).toBe("<h1>A</h1>\n<p>B</p>");
  });

  it("スクリプトを使わず CSS だけで切り替える", () => {
    const html = buildLessonDocHtml({
      kind: "markdown",
      title: "まとめ",
      bodyHtml: markdownToHtml(source, { os: "windows" }),
    });
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain('.os-tab-input[value="macos"]:checked ~ .os-panel[data-os="macos"]');
    expect(html).toContain("default-src 'none'");
  });
});
