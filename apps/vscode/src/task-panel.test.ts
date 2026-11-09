import type { TaskManifest } from "@stella/shared/tasks/manifest";
import type { RunResult } from "@stella/shared/tasks/run-result";
import { describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { buildTaskPanelHtml, buildTaskReadmeHtml, showTaskReadme } from "./task-panel.js";

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

  it("問題の確認では、その問題と次へ進む案内を出す", () => {
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest,
      result: result({ outcome: "passed", steps: [], problemId: "q01-add" }),
    });
    expect(html).toContain("問題 <code>q01-add</code>");
    expect(html).toContain("提出すると次の問題を開きます");
    expect(html).not.toContain("手元の確認はすべて通りました");
    expect(html).not.toContain("説明");
    expect(html).not.toContain("修正記録");
  });

  it("問題の失敗結果からの相談は、その問題の ID を渡す", () => {
    const root = "/home/me/web-training/course/unit/q01";
    const problemId = "q01-add";
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest,
      result: result({ problemId }),
      root,
    });
    expect(html).toContain(
      `href="command:stella.consultTask?${encodeURIComponent(JSON.stringify([root, problemId]))}">講師に相談`,
    );
  });

  it("全部通れば次の行動を案内する", () => {
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest,
      result: result({ outcome: "passed", steps: [] }),
    });
    expect(html).toContain("すべて通りました");
    expect(html).toContain("手元の確認はすべて通りました");
    expect(html).toContain("command:stella.submitTask");
    expect(html).not.toContain("command:stella.consultTask");
  });

  it("もう一度確認するリンクは課題フォルダーを渡す (パネルからはファイルを探せないため)", () => {
    const root = "/home/me/web-training/course/unit/q01";
    const html = buildTaskPanelHtml({ kind: "result", manifest, result: result(), root });
    expect(html).toContain(
      `href="command:stella.runTask?${encodeURIComponent(JSON.stringify([root]))}">もう一度確認する`,
    );
  });

  it("環境の問題は講師への相談を案内する", () => {
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest,
      result: result({ outcome: "error" }),
    });
    expect(html).toContain("講師に相談してください");
    expect(html).toContain("command:stella.consultTask");
    expect(html).not.toContain("command:stella.submitTask");
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

  it("CI と公開の課題は、控えた実行・公開先・コミットを出す (リンクは https だけ)", () => {
    const commit = "0123456789abcdef0123456789abcdef01234567";
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest: {
        ...manifest,
        runner: "ci-deploy",
        ci: { workflow: ".github/workflows/deploy.yml" },
      },
      result: result({
        runner: "ci-deploy",
        outcome: "passed",
        steps: [],
        files: [{ path: "site/index.html", sha256: "a".repeat(64), bytes: 1 }],
        ci: {
          runUrl: "https://github.com/yamada/web-deploy/actions/runs/1",
          deployUrl: "https://yamada.github.io/web-deploy/?q=<b>",
          commit,
        },
      }),
    });
    expect(html).toContain('<a href="https://github.com/yamada/web-deploy/actions/runs/1">');
    expect(html).toContain("https://yamada.github.io/web-deploy/?q=&lt;b&gt;");
    expect(html).not.toContain("<b>");
    expect(html).toContain(commit);
    expect(html).toContain(".github/workflows/deploy.yml");
    expect(html).toContain("command:stella.submitTask");
    // 形の違う URL (last-run.json の書き換えなど) はリンクにしない。
    const bad = buildTaskPanelHtml({
      kind: "result",
      manifest,
      result: result({
        ci: { runUrl: "javascript:alert(1)", deployUrl: "http://example.com/" },
      }),
    });
    expect(bad).not.toContain('href="javascript:');
    expect(bad).not.toContain('href="http://example.com');
  });

  it("定義の誤りを一覧にする", () => {
    const html = buildTaskPanelHtml({ kind: "invalid", root: "/w/<t>", errors: ["runner は <x>"] });
    expect(html).toContain("課題の定義を読めません");
    expect(html).toContain("/w/&lt;t&gt;");
    expect(html).toContain("runner は &lt;x&gt;");
  });
});

describe("課題文のパネル", () => {
  const markdown = [
    "# 最初のページを作る",
    "",
    ":::os windows",
    "エクスプローラーで `index.html` を開きます。",
    ":::",
    ":::os macos",
    "Finder で `index.html` を開きます。<script>alert(1)</script>",
    ":::",
  ].join("\n");

  it("OS のタブ付きで描き、指定した OS のタブを開いておく", () => {
    const html = buildTaskReadmeHtml({ title: "最初のページ", markdown, os: "macos" });
    expect(html).toMatch(/value="macos" checked/);
    expect(html).toContain("エクスプローラーで <code>index.html</code> を開きます。");
    expect(html).toContain("Finder で");
  });

  it("スクリプトを含めず、生の HTML は文字のまま出す", () => {
    const html = buildTaskReadmeHtml({ title: "<課題>", markdown, os: "windows" });
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<title>&lt;課題&gt;</title>");
  });

  it("確認のあとの描き直しは、閉じたパネルを作り直さない", () => {
    showTaskReadme({ title: "最初のページ", markdown, root: "/x" }, { reveal: false });
    expect(vscode.window.createWebviewPanel).not.toHaveBeenCalled();
  });

  it("確認のあとの描き直しは、別の課題に切り替えたパネルを上書きしない", () => {
    const panel = {
      title: "",
      webview: { html: "" },
      reveal: vi.fn(),
      onDidDispose: vi.fn(),
    };
    vi.mocked(vscode.window.createWebviewPanel).mockReturnValueOnce(panel as never);
    showTaskReadme({ title: "課題B", markdown: "B の本文", root: "/b" });
    expect(panel.webview.html).toContain("B の本文");
    // 課題 A の確認のあとの描き直しが、読み込みを待つ間に B へ切り替わったパネルに届く。
    showTaskReadme({ title: "課題A", markdown: "A の本文", root: "/a" }, { reveal: false });
    expect(panel.webview.html).toContain("B の本文");
    expect(panel.webview.html).not.toContain("A の本文");
    // 同じ課題の描き直しは届く。
    showTaskReadme({ title: "課題B", markdown: "B の新しい本文", root: "/b" }, { reveal: false });
    expect(panel.webview.html).toContain("B の新しい本文");
    expect(panel.reveal).not.toHaveBeenCalled();
  });

  describe("進め方つき", () => {
    const root = "/home/me/web-training/dev-env-basics/u02-first-task/q01-first-page";
    const staticManifest: TaskManifest = {
      ...manifest,
      title: "最初のページを作る",
      runner: "static-preview",
      submit: { files: ["index.html"] },
    };
    const html = buildTaskReadmeHtml({
      title: staticManifest.title,
      markdown: `${markdown}\n\n[実行](command:stella.runTask) [MDN](https://developer.mozilla.org/)`,
      os: "windows",
      guide: { root, manifest: staticManifest, edit: { files: ["index.html"], missing: [] } },
    });

    it("見出しの下に進め方を置き、課題文の同じ見出しは重ねない", () => {
      expect(html.match(/最初のページを作る<\/h1>/g)).toHaveLength(1);
      expect(html).toContain('<p class="meta">基礎 ・ HTML の確認</p>');
      expect(html.indexOf("進め方")).toBeLessThan(html.indexOf('<h2 class="readme-title">課題文'));
      expect(html.indexOf('<h2 class="readme-title">課題文')).toBeLessThan(
        html.indexOf("エクスプローラーで"),
      );
      expect(html).toContain("<code>index.html</code>");
    });

    it("コマンドのリンクは進め方にだけ出し、課題文の中のコマンドはリンクにしない", () => {
      const readme = html.slice(html.indexOf('<h2 class="readme-title">'));
      expect(readme).not.toContain("command:");
      expect(readme).toContain('<a href="https://developer.mozilla.org/">MDN</a>');
      expect(html.slice(0, html.indexOf('<h2 class="readme-title">'))).toContain(
        "command:stella.runTask",
      );
      expect(html).not.toMatch(/<script/i);
    });
  });
});
