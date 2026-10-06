import { describe, expect, it } from "vitest";
import {
  hasOsBlocks,
  orderedOsBlocks,
  osFromNodePlatform,
  parseOsBlocks,
  parseOsPreference,
  pickOsBlock,
  selectOsMarkdown,
} from "./os-blocks.js";

const BOTH = [
  "# 準備",
  "",
  ":::os windows",
  "PowerShellで次を実行します。",
  ":::",
  "",
  ":::os macos",
  "ターミナルで次を実行します。",
  ":::",
  "",
  "確認できたら次へ進みます。",
].join("\n");

describe("parseOsBlocks", () => {
  it("空行だけを挟んだブロックを 1 組にまとめ、前後の本文を分ける", () => {
    const { segments, issues } = parseOsBlocks(BOTH);
    expect(issues).toEqual([]);
    expect(segments).toEqual([
      { kind: "markdown", markdown: "# 準備\n", line: 1 },
      {
        kind: "os",
        line: 3,
        blocks: [
          { os: "windows", markdown: "PowerShellで次を実行します。", line: 3 },
          { os: "macos", markdown: "ターミナルで次を実行します。", line: 7 },
        ],
      },
      { kind: "markdown", markdown: "\n確認できたら次へ進みます。", line: 10 },
    ]);
  });

  it("OS 別のブロックが無い本文はそのまま 1 つの本文になる", () => {
    const { segments, issues } = parseOsBlocks("# 見出し\n\n本文");
    expect(issues).toEqual([]);
    expect(segments).toEqual([{ kind: "markdown", markdown: "# 見出し\n\n本文", line: 1 }]);
  });

  it("CRLF の本文も同じに読む", () => {
    expect(parseOsBlocks(BOTH.replace(/\n/g, "\r\n"))).toEqual(parseOsBlocks(BOTH));
  });

  it("空行を挟まず続くブロックも、間に本文があるブロックは別の組になる", () => {
    const joined = parseOsBlocks(":::os macos\nA\n:::\n:::os windows\nB\n:::");
    expect(joined.issues).toEqual([]);
    expect(joined.segments).toHaveLength(1);
    const split = parseOsBlocks(
      ":::os windows\nA\n:::\n:::os macos\nB\n:::\n\n本文\n\n:::os windows\nC\n:::\n:::os macos\nD\n:::",
    );
    expect(split.issues).toEqual([]);
    expect(split.segments.map((s) => s.kind)).toEqual(["os", "markdown", "os"]);
  });

  it("組のあとの空行は、次が本文なら本文へ戻す", () => {
    const { segments } = parseOsBlocks(":::os windows\nA\n:::\n:::os macos\nB\n:::\n\n\n本文");
    expect(segments[1]).toEqual({ kind: "markdown", markdown: "\n\n本文", line: 7 });
  });

  it("ブロックの中のコードブロック・見出し・リストはそのまま中身に入る", () => {
    const src = [
      ":::os windows",
      "## PowerShell",
      "",
      "```powershell",
      "npm.cmd --version",
      ":::",
      "```",
      "",
      "- 数字が出たら確認します",
      ":::",
      ":::os macos",
      "```sh",
      "npm --version",
      "```",
      ":::",
    ].join("\n");
    const { segments, issues } = parseOsBlocks(src);
    expect(issues).toEqual([]);
    const group = segments[0];
    expect(group?.kind).toBe("os");
    if (group?.kind !== "os") return;
    expect(group.blocks[0]?.markdown).toBe(
      "## PowerShell\n\n```powershell\nnpm.cmd --version\n:::\n```\n\n- 数字が出たら確認します",
    );
  });

  it("コードブロックの中の `:::os` は記法として扱わない (書き方の見本を書ける)", () => {
    for (const fence of ["```", "~~~", "````"]) {
      const src = `${fence}markdown\n:::os windows\n説明\n:::\n${fence}`;
      const { segments, issues } = parseOsBlocks(src);
      expect(issues).toEqual([]);
      expect(segments).toEqual([{ kind: "markdown", markdown: src, line: 1 }]);
      expect(hasOsBlocks(src)).toBe(false);
    }
    // 4 文字の字下げ (インデントのコードブロック) も咎めない。
    expect(parseOsBlocks("    :::os windows\n    :::").issues).toEqual([]);
  });

  it("閉じていないコードブロックの短いフェンスでは閉じない", () => {
    const src = "````\n```\n:::os windows\n````\n";
    expect(parseOsBlocks(src).issues).toEqual([]);
    expect(hasOsBlocks(src)).toBe(false);
  });

  it("片方の OS しか無い組は誤りにする (描画では残った方を出す)", () => {
    const { segments, issues } = parseOsBlocks(":::os windows\nA\n:::");
    expect(issues).toEqual([
      { line: 1, message: "Windows と macOS の両方を書きます (足りない OS: macOS)" },
    ]);
    expect(segments).toHaveLength(1);
  });

  it("同じ OS が続いたら次の組にする", () => {
    const { segments, issues } = parseOsBlocks(
      ":::os windows\nA\n:::\n:::os windows\nB\n:::\n:::os macos\nC\n:::",
    );
    expect(segments.map((s) => (s.kind === "os" ? s.blocks.map((b) => b.os) : []))).toEqual([
      ["windows"],
      ["windows", "macos"],
    ]);
    expect(issues.map((i) => i.line)).toEqual([1]);
  });

  it("未知の OS・OS の書き忘れ・大文字は誤りにして、行は本文に残す", () => {
    for (const opener of [":::os linux", ":::os", ":::os Windows", ":::OS windows"]) {
      const src = `${opener}\n本文\n:::`;
      const { segments, issues } = parseOsBlocks(src);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.line).toBe(1);
      expect(segments.every((s) => s.kind === "markdown")).toBe(true);
      expect(segments.map((s) => (s.kind === "markdown" ? s.markdown : "")).join("\n")).toBe(src);
    }
  });

  it("閉じていないブロックは誤りにして、本文に戻す (後ろの本文を隠さない)", () => {
    const src = "前\n\n:::os windows\nA\n\n後ろの本文";
    const { segments, issues } = parseOsBlocks(src);
    expect(issues).toEqual([{ line: 3, message: "`:::os windows` が `:::` で閉じていません" }]);
    expect(segments.map((s) => (s.kind === "markdown" ? s.markdown : "")).join("\n")).toBe(src);
  });

  it("閉じていないブロックの前に閉じた組があれば、組は残す", () => {
    const src = ":::os windows\nA\n:::\n:::os macos\nB\n:::\n\n:::os windows\nC";
    const { segments, issues } = parseOsBlocks(src);
    expect(segments.map((s) => s.kind)).toEqual(["os", "markdown"]);
    expect(issues.map((i) => i.line)).toEqual([8]);
  });

  it("入れ子・ブロックの中の `:::` 記法・対応の無い `:::`・字下げした `:::` を誤りにする", () => {
    expect(parseOsBlocks(":::os windows\n:::os macos\nB\n:::\n:::os macos\nC\n:::").issues).toEqual(
      [
        {
          line: 2,
          message: "OS 別のブロックは入れ子にできません。先に `:::` で閉じてください",
        },
      ],
    );
    expect(parseOsBlocks(":::os windows\n:::note\n:::\n:::os macos\nC\n:::").issues[0]?.line).toBe(
      2,
    );
    expect(parseOsBlocks("本文\n:::\n").issues).toEqual([
      { line: 2, message: "対応する `:::os` の無い `:::` です" },
    ]);
    expect(parseOsBlocks(":::note\n本文\n").issues[0]?.line).toBe(1);
    expect(parseOsBlocks("- 手順\n  :::os windows\n  A\n  :::").issues[0]?.line).toBe(2);
  });

  it("空のブロックを誤りにする", () => {
    const { issues } = parseOsBlocks(":::os windows\n\n:::\n:::os macos\nB\n:::");
    expect(issues).toEqual([{ line: 1, message: "OS 別のブロックが空です" }]);
  });

  it("行末の空白は許す", () => {
    expect(parseOsBlocks(":::os windows  \nA\n:::\t\n:::os macos\nB\n::: ").issues).toEqual([]);
  });
});

describe("OS の選択", () => {
  const group = parseOsBlocks(":::os macos\nM\n:::\n:::os windows\nW\n:::").segments[0];
  const blocks = group?.kind === "os" ? group.blocks : [];

  it("タブは Windows・macOS の順に並べる", () => {
    expect(orderedOsBlocks(blocks).map((b) => b.os)).toEqual(["windows", "macos"]);
  });

  it("その OS が無い組では先頭のブロックを出す", () => {
    expect(pickOsBlock(blocks, "windows")?.markdown).toBe("W");
    expect(pickOsBlock(blocks.slice(0, 1), "windows")?.markdown).toBe("M");
  });

  it("1 つの OS だけの本文にする", () => {
    expect(selectOsMarkdown(BOTH, "windows")).toBe(
      "# 準備\n\n\nPowerShellで次を実行します。\n\n\n確認できたら次へ進みます。",
    );
    expect(selectOsMarkdown(BOTH, "macos")).toContain("ターミナルで次を実行します。");
    expect(selectOsMarkdown(BOTH, "macos")).not.toContain("PowerShell");
  });

  it("process.platform から OS を決める", () => {
    expect(osFromNodePlatform("win32")).toBe("windows");
    expect(osFromNodePlatform("darwin")).toBe("macos");
    expect(osFromNodePlatform("linux")).toBeNull();
  });

  it("プロフィールの OS 設定は windows・macos・null だけを受け付ける", () => {
    expect(parseOsPreference("windows")).toBe("windows");
    expect(parseOsPreference("macos")).toBe("macos");
    expect(parseOsPreference(null)).toBeNull();
    for (const bad of ["linux", "Windows", "", 1, undefined, {}])
      expect(() => parseOsPreference(bad)).toThrow();
  });
});
