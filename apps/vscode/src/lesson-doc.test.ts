import { describe, expect, it, vi } from "vitest";
import { buildLessonDocHtml, markdownToHtml, resolveLessonDoc } from "./lesson-doc.js";

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

  it("offers falcon.openInWeb for pdf-only lessons", () => {
    const html = buildLessonDocHtml({
      kind: "pdf-only",
      title: "Slides",
      stageId: "c1",
      lessonId: "l1",
    });
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain("command:falcon.openInWeb");
    expect(html).toContain("c1");
    expect(html).toContain("l1");
  });
});
