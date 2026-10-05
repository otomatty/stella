import type { TaskManifest } from "@stella/shared/tasks/manifest";
import type { RunResult } from "@stella/shared/tasks/run-result";
import { describe, expect, it, vi } from "vitest";
import { buildTaskPanelHtml } from "./task-panel.js";

vi.mock("vscode", () => ({
  window: { createWebviewPanel: vi.fn() },
  ViewColumn: { Beside: 2 },
}));

const manifest: TaskManifest = {
  schemaVersion: 1,
  id: "javascript-data-basics/u03-filter/q01",
  title: "整数から <k> 以上を選ぶ",
  kind: "basic",
  runner: "node-test",
  submit: { files: ["src/filter.js"] },
  protected: [],
  checks: { lint: true, format: false },
};

function result(overrides: Partial<RunResult> = {}): RunResult {
  return {
    schemaVersion: 1,
    taskId: manifest.id,
    runner: "node-test",
    outcome: "failed",
    startedAt: "2026-10-05T00:00:00.000Z",
    durationMs: 1500,
    platform: "win32",
    toolVersions: { node: "v22.22.0" },
    steps: [
      {
        id: "lint",
        label: "lint (ESLint)",
        status: "failed",
        durationMs: 300,
        summary: "エラー 1 件・警告 0 件",
        lint: [
          {
            file: "src/filter.js",
            line: 8,
            column: 5,
            ruleId: "no-unused-vars",
            message: "'unused' is assigned <never> used.",
            severity: "error",
          },
        ],
      },
      {
        id: "test",
        label: "テスト (Vitest)",
        status: "failed",
        durationMs: 900,
        summary: "2 件中 1 件が通りました",
        tests: [
          { name: "空配列", status: "passed" },
          { name: "<script>alert(1)</script>", status: "failed", message: "expected [ 7 ]" },
        ],
      },
    ],
    files: [{ path: "src/filter.js", sha256: "x", bytes: 1 }],
    protected: [],
    manifestSha256: "m",
    ...overrides,
  };
}

describe("buildTaskPanelHtml", () => {
  it("課題の出典・読む箇所・用途・必要な帰属表示を安全に表示する", () => {
    const html = buildTaskPanelHtml({
      kind: "result",
      result: result(),
      manifest: {
        ...manifest,
        references: [
          {
            id: "SRC-test",
            title: "<script>source</script>",
            publisher: "MDN",
            url: "https://example.org/html#heading",
            section: "見出し",
            documentVersion: "更新型",
            checkedAt: "2026-10-05",
            environmentRef: "static-web-01@1",
            usedFor: "見出しの受入条件",
            authorship: "original-exercise",
            reuse: "concept-reference",
            attribution: "Required credit",
            attributionTerms: {
              creator: "<b>Fixture author</b>",
              scope: "図の配色と配置",
              conditionsUrl: "https://example.org/Attrib_copyright_license",
              checkedAt: "2026-09-30",
            },
          },
        ],
      },
    });
    expect(html).toContain('href="https://example.org/html#heading"');
    expect(html).toContain("&lt;script&gt;source&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("見出しの受入条件");
    expect(html).toContain("教材独自の課題 / 概念の参照");
    expect(html).toContain("Required credit");
    expect(html).toContain("原作者: &lt;b&gt;Fixture author&lt;/b&gt;");
    expect(html).not.toContain("<b>");
    expect(html).toContain("再利用範囲: 図の配色と配置");
    expect(html).toContain(
      '利用条件: <a href="https://example.org/Attrib_copyright_license">https://example.org/Attrib_copyright_license</a>',
    );
    expect(html).toContain("条件確認日: 2026-09-30");
    expect(html).toContain("static-web-01@1");
  });

  it("失敗した項目を先に出し、HTML をエスケープし、スクリプトを含めない", () => {
    const html = buildTaskPanelHtml({ kind: "result", manifest, result: result() });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("整数から &lt;k&gt; 以上を選ぶ");
    expect(html).toContain("直すところがあります");
    expect(html).toContain("src/filter.js:8:5");
    expect(html.indexOf("✗")).toBeLessThan(html.indexOf("✓ 空配列"));
    expect(html).toContain('href="command:stella.runTask"');
    expect(html).toContain("v22.22.0");
  });

  it("全部通れば次の行動を案内する", () => {
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest,
      result: result({ outcome: "passed", steps: [] }),
    });
    expect(html).toContain("すべて通りました");
    expect(html).toContain("手元の確認はすべて通りました");
  });

  it("環境の問題は講師への相談を案内する", () => {
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest,
      result: result({ outcome: "error" }),
    });
    expect(html).toContain("講師に相談してください");
  });

  it("中断した実行は結果を残さないと伝える", () => {
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest,
      result: result({ outcome: "cancelled" }),
    });
    expect(html).toContain("確認を中断しました");
    expect(html).toContain("結果は残していません");
  });

  it("課題の外からの環境診断は、課題ではなく診断をやり直す", () => {
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest,
      result: result({ outcome: "passed", steps: [] }),
      standalone: true,
    });
    expect(html).toContain('href="command:stella.diagnoseEnvironment"');
    expect(html).not.toContain('href="command:stella.runTask"');
  });

  it("定義の誤りを一覧にする", () => {
    const html = buildTaskPanelHtml({ kind: "invalid", root: "/w/<t>", errors: ["runner は <x>"] });
    expect(html).toContain("課題の定義を読めません");
    expect(html).toContain("/w/&lt;t&gt;");
    expect(html).toContain("runner は &lt;x&gt;");
  });
});
