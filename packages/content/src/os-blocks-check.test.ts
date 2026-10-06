import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { allowsOsBlocks, checkOsBlockSource, checkOsBlocks, osImageOf } from "./os-blocks-check.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** courses/<slug>/modules/ の下にファイルを置いた一時ディレクトリを作る。 */
function courses(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "stella-os-blocks-"));
  roots.push(root);
  for (const [rel, body] of Object.entries(files)) {
    const file = join(root, "c", "modules", rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, body);
  }
  return root;
}

const pair = (windows: string, macos: string) =>
  `:::os windows\n${windows}\n:::\n\n:::os macos\n${macos}\n:::\n`;

describe("OS 別のブロックの検査", () => {
  it("doc.md と課題文 README.md の正しいブロックは通す", () => {
    const root = courses({
      "m0/l1/doc.md": `# まとめ\n\n${pair("PowerShell", "ターミナル")}`,
      "m0/l1/t1/slides.md": "# スライド",
      "m0/tasks/q01/README.md": pair("`npm.cmd`", "`npm`"),
    });
    expect(checkOsBlocks(root)).toEqual([]);
  });

  it("片方の OS しか無い組・閉じ忘れ・未知の OS を行番号付きで落とす", () => {
    const root = courses({
      "m0/l1/doc.md": ":::os windows\nA\n:::\n",
      "m0/tasks/q01/README.md": "前\n:::os linux\nA\n:::\n\n:::os macos\nB\n",
    });
    expect(checkOsBlocks(root)).toEqual([
      {
        file: "c/modules/m0/l1/doc.md",
        line: 1,
        message: "Windows と macOS の両方を書きます (足りない OS: macOS)",
      },
      {
        file: "c/modules/m0/tasks/q01/README.md",
        line: 2,
        message: "未知の OS です: linux (windows か macos を書きます)",
      },
      {
        file: "c/modules/m0/tasks/q01/README.md",
        line: 4,
        message: "対応する `:::os` の無い `:::` です",
      },
      {
        file: "c/modules/m0/tasks/q01/README.md",
        line: 6,
        message: "`:::os macos` が `:::` で閉じていません",
      },
    ]);
  });

  it("スライド・知識問題・ヒント・解説には書けない (コードブロックの見本は除く)", () => {
    const root = courses({
      "m0/l1/t1/slides.md": `# スライド\n\n${pair("A", "B")}`,
      "m0/l1/knowledge.md": "問題\n\n:::os windows\nA\n",
      "m0/tasks/q01/hints.md": "```markdown\n:::os windows\nA\n:::\n```\n",
      "m0/tasks/q01/private/explanation.md": pair("A", "B"),
    });
    const files = checkOsBlocks(root).map((d) => `${d.file}:${d.line}`);
    expect(files).toEqual([
      "c/modules/m0/l1/knowledge.md:3",
      "c/modules/m0/l1/t1/slides.md:3",
      "c/modules/m0/tasks/q01/private/explanation.md:1",
    ]);
  });

  it("書ける場所はレッスンの doc.md と課題直下の README.md だけ", () => {
    expect(allowsOsBlocks("m0/l1/doc.md")).toBe(true);
    expect(allowsOsBlocks("m0/tasks/q01/README.md")).toBe(true);
    expect(allowsOsBlocks("m0/tasks/q01/starter/README.md")).toBe(false);
    expect(allowsOsBlocks("m0/tasks/q01/tests/README.md")).toBe(false);
    expect(allowsOsBlocks("m0/l1/t1/slides.md")).toBe(false);
    expect(allowsOsBlocks("m0/tasks/doc.md")).toBe(false);
  });
});

describe("OS ごとの画像", () => {
  it("名前.OS.拡張子 を読む", () => {
    expect(osImageOf("t1-x/assets/install.windows.png")).toEqual({
      stem: "t1-x/assets/install",
      os: "windows",
      ext: "png",
    });
    expect(osImageOf("assets/a.b.macos.webp?v=2")).toEqual({
      stem: "assets/a.b",
      os: "macos",
      ext: "webp",
    });
    expect(osImageOf("assets/windows.png")).toBeNull();
    expect(osImageOf("assets/install.linux.png")).toBeNull();
  });

  it("対になる画像をそれぞれの OS のブロックで使えば通す", () => {
    const md = pair(
      "![インストーラー](t1/assets/install.windows.png)",
      "![インストーラー](t1/assets/install.macos.png)",
    );
    expect(checkOsBlockSource("doc.md", md)).toEqual([]);
  });

  it("対が無い・別の OS のブロック・ブロックの外で使った画像を落とす", () => {
    expect(
      checkOsBlockSource(
        "doc.md",
        pair("![a](t1/assets/install.windows.png)", "![b](t1/assets/other.macos.png)"),
      ).map((d) => d.message),
    ).toEqual([
      "画像を OS ごとに用意します: t1/assets/install.windows.png と対になる t1/assets/install.macos.png を `:::os macos` の中で使ってください",
      "画像を OS ごとに用意します: t1/assets/other.macos.png と対になる t1/assets/other.windows.png を `:::os windows` の中で使ってください",
    ]);
    expect(
      checkOsBlockSource(
        "doc.md",
        pair("![a](t1/assets/x.macos.png)", "![b](t1/assets/x.macos.png)"),
      )[0]?.message,
    ).toBe(
      "t1/assets/x.macos.png は macOS の画像です。`:::os windows` には Windows の画像を使います",
    );
    expect(checkOsBlockSource("doc.md", "![a](t1/assets/x.windows.png)")).toEqual([
      {
        file: "doc.md",
        line: 1,
        message: "OS ごとの画像 (t1/assets/x.windows.png) は `:::os windows` の中で使います",
      },
    ]);
  });

  it("assets/ には両方の OS の画像を置く (図解の元 .html と生成物は対象外)", () => {
    const root = courses({
      "m0/l1/t1/assets/install.windows.png": "png",
      "m0/l1/t1/assets/install.macos.png": "png",
      "m0/l1/t1/assets/menu.windows.png": "png",
      "m0/l1/t1/assets/flow.windows.html": "<svg />",
      "m0/l1/t1/assets/flow.windows.diagram.png": "png",
    });
    expect(checkOsBlocks(root)).toEqual([
      {
        file: "c/modules/m0/l1/t1/assets/menu.windows.png",
        line: 0,
        message: "画像を OS ごとに用意します: menu.macos.png がありません",
      },
    ]);
  });

  it("スライドでは OS ごとの画像を使えない", () => {
    const root = courses({
      "m0/l1/t1/slides.md": "# スライド\n\n![図](assets/install.windows.png)",
      "m0/l1/t1/assets/install.windows.png": "png",
      "m0/l1/t1/assets/install.macos.png": "png",
    });
    expect(checkOsBlocks(root).map((d) => d.message)).toEqual([
      "OS ごとの画像 (assets/install.windows.png) は、まとめ (doc.md) の `:::os` の中でだけ使えます",
    ]);
  });
});
