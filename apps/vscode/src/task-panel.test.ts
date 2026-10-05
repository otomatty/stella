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

  it("定義の誤りを一覧にする", () => {
    const html = buildTaskPanelHtml({ kind: "invalid", root: "/w/<t>", errors: ["runner は <x>"] });
    expect(html).toContain("課題の定義を読めません");
    expect(html).toContain("/w/&lt;t&gt;");
    expect(html).toContain("runner は &lt;x&gt;");
  });
});
