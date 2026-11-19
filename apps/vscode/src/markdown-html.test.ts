import { describe, expect, it, vi } from "vitest";
import { defaultOsForPlatform, markdownToHtml, OS_TABS_CSS } from "./markdown-html.js";

vi.mock("vscode", () => ({
  window: { createWebviewPanel: vi.fn() },
  workspace: {
    getConfiguration: () => ({ inspect: () => ({ globalValue: "https://configured.example/" }) }),
  },
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

  it("nests indented list items (教材の参照元は 2 段の箇条書き)", () => {
    const src = [
      "## 参照元",
      "",
      "- [HTML: 見出し](<https://developer.mozilla.org/ja/docs/Web/HTML>) — MDN / 見出し",
      "  - 確認すること: 見出しを書く",
      "  - 教材独自の課題 / 確認日: 2026-10-05",
      "- [二つ目](https://example.com/two)",
      "",
      "1. first",
      "   continued line",
      "2. second",
    ].join("\n");
    const html = markdownToHtml(src);
    expect(html).toContain(
      '<ul><li><a href="https://developer.mozilla.org/ja/docs/Web/HTML">HTML: 見出し</a> — MDN / 見出し<ul><li>確認すること: 見出しを書く</li><li>教材独自の課題 / 確認日: 2026-10-05</li></ul></li><li><a href="https://example.com/two">二つ目</a></li></ul>',
    );
    expect(html).toContain("<ol><li>first continued line</li><li>second</li></ol>");
    expect(html).not.toContain("<p>- 確認すること");
  });

  it("reads <url> link targets with parentheses but still rejects unsafe schemes", () => {
    const html = markdownToHtml(
      "[wiki](<https://example.com/a_(b)>) and [bad](<javascript:alert(1)>)",
    );
    expect(html).toContain('<a href="https://example.com/a_(b)">wiki</a>');
    expect(html).not.toContain("javascript:");
    expect(html).toContain("bad");
  });

  it("keeps numbered sub-steps that follow bullet sub-items under the same item", () => {
    const html = markdownToHtml("- 手順\n  - 補足\n  1. 最初に保存\n  2. 次に確認\n- 次");
    expect(html).toBe(
      "<ul><li>手順<ul><li>補足</li></ul><ol><li>最初に保存</li><li>次に確認</li></ol></li><li>次</li></ul>",
    );
  });

  it("splits a bullet list and a numbered list that follow each other", () => {
    const html = markdownToHtml("- a\n1. b");
    expect(html).toContain("<ul><li>a</li></ul>");
    expect(html).toContain("<ol><li>b</li></ol>");
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
    const html = markdownToHtml(source, { os: defaultOsForPlatform("darwin") });
    expect(html).toMatch(/value="macos" checked/);
  });

  it("OS 別ブロックの無い本文は今までどおり描く", () => {
    expect(markdownToHtml("# A\n\nB", { os: "macos" })).toBe("<h1>A</h1>\n<p>B</p>");
  });

  it("スクリプトを使わず CSS だけで切り替える", () => {
    const html = markdownToHtml(source, { os: "windows" });
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain('class="os-tab-input"');
    expect(OS_TABS_CSS).toContain(".os-panel { display: none;");
    expect(OS_TABS_CSS).toContain(
      '.os-tab-input[value="windows"]:checked ~ .os-panel[data-os="windows"],',
    );
    expect(OS_TABS_CSS).toContain(
      '.os-tab-input[value="macos"]:checked ~ .os-panel[data-os="macos"] { display: block; }',
    );
  });
});

it("renders tutorials as Web links without adding media or scripts", () => {
  const html = markdownToHtml(
    ":::tutorial overview\n\n:::os windows\n:::tutorial setup\n:::\n:::os macos\n:::tutorial setup\n:::",
  );
  expect(html).toContain('href="https://configured.example/tutorials/overview.mp4"');
  expect(html).toContain("動画: overview を Web で見る");
  expect(html).toContain("/tutorials/setup.mp4");
  expect(html).not.toMatch(/<video|<script/);
  expect(markdownToHtml("```\n:::tutorial overview\n```")).not.toContain("/tutorials/overview.mp4");
});
