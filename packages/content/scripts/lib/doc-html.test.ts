import { describe, expect, it } from "vitest";

import { docBodyHtml } from "./doc-html.js";

const source = [
  "# 0-1 まとめ",
  "",
  ":::os macos",
  "ターミナルで `npm --version` を実行します。",
  ":::",
  ":::os windows",
  "PowerShell で `npm.cmd --version` を実行します。",
  "",
  "![画面](tenant/ses/courses/x/assets/t1/run.windows.png)",
  ":::",
  "",
  "数字が出たら確認できています。",
].join("\n");

describe("配布 PDF のまとめ・課題文", () => {
  it("OS を分けない PDF は両方の手順を Windows・macOS の順に見出し付きで並べる", () => {
    const html = docBodyHtml(source, new Map(), undefined);
    expect(html).toContain('<p class="os-block-heading">Windows の場合</p>');
    expect(html).toContain('<p class="os-block-heading">macOS の場合</p>');
    expect(html.indexOf("Windows の場合")).toBeLessThan(html.indexOf("macOS の場合"));
    expect(html).toContain("<code>npm.cmd --version</code>");
    expect(html).toContain("<code>npm --version</code>");
    expect(html).toContain("数字が出たら確認できています。");
    expect(html).not.toContain(":::");
  });

  it("OS ごとの PDF はその OS の手順と画像だけを載せ、見出しを付けない", () => {
    const file = "/tmp/run.windows.png";
    const windows = docBodyHtml(
      source,
      new Map([["tenant/ses/courses/x/assets/t1/run.windows.png", file]]),
      "windows",
    );
    expect(windows).toContain("npm.cmd --version");
    expect(windows).not.toContain("npm --version");
    expect(windows).toContain('src="file:///tmp/run.windows.png"');
    expect(windows).not.toContain("os-block");
    const macos = docBodyHtml(source, new Map(), "macos");
    expect(macos).toContain("npm --version");
    expect(macos).not.toContain("npm.cmd");
    expect(macos).not.toContain("run.windows.png");
  });

  it("OS 別のブロックの無い本文は今までどおり 1 回で描く", () => {
    expect(docBodyHtml("# A\n\nB", new Map(), undefined)).toBe("<h1>A</h1>\n<p>B</p>");
  });
});
