import type { TaskManifest } from "@stella/shared/tasks/manifest";
import type { RunResult, RunStepResult, TestCaseResult } from "@stella/shared/tasks/run-result";
import { describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { GUIDE_COMMANDS } from "./task-guide.js";
import {
  buildTaskPanelHtml,
  buildTaskReadmeHtml,
  decideReadmeLayout,
  onTaskReadmeVisible,
  showTaskPanel,
  showTaskReadme,
  sideColumn,
  updateTaskPanelCheck,
  updateTaskReadmeCheck,
} from "./task-panel.js";
import { finishTaskCheck, progressTaskCheck, startTaskCheck } from "./task-run-events.js";
import { expectedActual } from "./task-test-message.js";

vi.mock("vscode", () => ({
  EventEmitter: class {
    event = vi.fn();
    fire = vi.fn();
  },
  window: {
    createWebviewPanel: vi.fn(),
    showTextDocument: vi.fn(),
    get visibleTextEditors() {
      return [];
    },
    tabGroups: {
      get activeTabGroup() {
        return undefined;
      },
      get all() {
        return [];
      },
    },
  },
  ViewColumn: { Active: -1, Beside: -2, One: 1, Two: 2 },
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
  it("課題の出典・読む箇所・必要な帰属表示を安全に表示する", () => {
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
    expect(html).toContain("&lt;script&gt;source&lt;/script&gt;</a> — MDN / 見出し");
    expect(html).not.toContain("<script>");
    expect(html).not.toMatch(
      /見出しの受入条件|出典の詳細|教材独自の課題|概念の参照|資料: 更新型|確認日: 2026-10-05|環境:|static-web-01@1/,
    );
    expect(html).toContain("Required credit");
    expect(html).toContain("原作者: &lt;b&gt;Fixture author&lt;/b&gt;");
    expect(html).not.toContain("<b>");
    expect(html).toContain("再利用範囲: 図の配色と配置");
    expect(html).toContain(
      '利用条件: <a href="https://example.org/Attrib_copyright_license">https://example.org/Attrib_copyright_license</a>',
    );
    expect(html).toContain("条件確認日: 2026-09-30");
  });

  it("失敗した項目を先に出し、HTML をエスケープし、スクリプトを含めない", () => {
    const html = buildTaskPanelHtml({ kind: "result", manifest, result: result() });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("整数から &lt;k&gt; 以上を選ぶ");
    expect(html).toContain("default-src 'none'; style-src 'unsafe-inline';");
    expect(html).toContain('<div class="summary failed">');
    expect(html).toContain('<span class="summary-mark" aria-hidden="true">✗</span>');
    expect(html).toContain('<p class="summary-title">直すところがあります</p>');
    expect(html).toContain(
      '<p class="summary-sub">lint ・ テスト 1 件 ・ まだ何も送っていません</p>',
    );
    expect(html).toContain("<pre>expected [ 7 ]</pre>");
    expect(html).toContain("&lt;never&gt;");
    expect(html).toContain(
      '<p class="links"><a href="command:stella.consultTask">管理者に相談</a> ・ <a href="command:stella.showRunLog">実行ログを表示</a> ・ <a href="command:stella.showTaskHelp">ヒント・解答・レビューの結果</a></p>',
    );
    expect(html).toContain("src/filter.js:8:5");
    expect(html.indexOf('<div class="test-fail">')).toBeLessThan(html.indexOf("✓ 空配列"));
    expect(html).toContain("<details><summary>通ったテスト 1 件</summary>");
    expect(html).toContain('href="command:stella.submitTask">提出する</a>');
    expect(html).toContain("v22.22.0");
  });

  it("提出前の合格結果は開いているパネルだけを更新する", () => {
    const createPanel = vi.mocked(vscode.window.createWebviewPanel);
    const panel = {
      title: "",
      reveal: vi.fn(),
      onDidDispose: vi.fn(),
      webview: { html: "" },
    };
    createPanel.mockReturnValueOnce(panel as unknown as vscode.WebviewPanel);
    const passed = {
      kind: "result" as const,
      manifest,
      result: result({ outcome: "passed", steps: [] }),
    };
    showTaskPanel(passed, { reveal: false });
    expect(createPanel).not.toHaveBeenCalled();
    showTaskPanel({ ...passed, result: result() });
    showTaskPanel(passed, { reveal: false });
    expect(createPanel).toHaveBeenCalledTimes(1);
    expect(panel.reveal).not.toHaveBeenCalled();
    expect(panel.webview.html).toContain("手元の確認はすべて通りました。");
    for (const [listener] of panel.onDidDispose.mock.calls) listener();
    createPanel.mockClear();
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

  it("問題の失敗結果からの提出・相談は、その問題の ID を渡す", () => {
    const root = "/home/me/web-training/course/unit/q01";
    const problemId = "q01-add";
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest,
      result: result({ problemId }),
      root,
    });
    expect(html).toContain(
      `href="command:stella.consultTask?${encodeURIComponent(JSON.stringify([root, problemId]))}">管理者に相談`,
    );
    expect(html).toContain(
      `href="command:stella.submitTask?${encodeURIComponent(JSON.stringify([root, problemId]))}">提出する`,
    );
  });

  it("全部通れば次の行動を案内する", () => {
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest,
      result: result({ outcome: "passed", steps: [] }),
    });
    expect(html).toContain('<div class="summary passed">');
    expect(html).toContain('<span class="summary-mark" aria-hidden="true">✓</span>');
    expect(html).toContain('<p class="summary-title">すべて通りました</p>');
    expect(html).toContain('<p class="summary-sub">手元の確認はすべて通りました。</p>');
    expect(html).toContain("command:stella.submitTask");
    expect(html).not.toContain("command:stella.consultTask");
  });

  it("提出するリンクは課題フォルダーを渡す (パネルからはファイルを探せないため)", () => {
    const root = "/home/me/web-training/course/unit/q01";
    const html = buildTaskPanelHtml({ kind: "result", manifest, result: result(), root });
    expect(html).toContain(
      `href="command:stella.submitTask?${encodeURIComponent(JSON.stringify([root]))}">提出する`,
    );
  });

  it("環境の問題は講師への相談を案内する", () => {
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest,
      result: result({ outcome: "error" }),
    });
    expect(html).toContain('<div class="summary error">');
    expect(html).toContain('<span class="summary-mark" aria-hidden="true">!</span>');
    expect(html).toContain('<p class="summary-title">環境の問題で確認できませんでした</p>');
    expect(html).toContain('<p class="summary-sub">まだ何も送っていません</p>');
    expect(html).toContain('href="command:stella.consultTask">管理者に相談');
  });

  it("中断した実行は結果を残さないと伝える", () => {
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest,
      result: result({ outcome: "cancelled" }),
    });
    expect(html).toContain('<div class="summary cancelled">');
    expect(html).toContain('<span class="summary-mark" aria-hidden="true">–</span>');
    expect(html).toContain('<p class="summary-title">確認を中断しました</p>');
    expect(html).toContain('<p class="summary-sub">途中で止めたので、結果は残していません。</p>');
    expect(html).not.toContain("command:stella.consultTask");
  });

  it("課題の外からの環境診断は、課題ではなく診断をやり直す", () => {
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest: { ...manifest, runner: "env-diagnose" },
      result: result({ runner: "env-diagnose", outcome: "passed", steps: [] }),
      standalone: true,
    });
    expect(html).toContain('<div class="summary passed">');
    expect(html).toContain('<p class="summary-sub">手元の確認はすべて通りました。</p>');
    expect(html).toContain(
      '<a class="button" href="command:stella.diagnoseEnvironment">もう一度確認する</a>',
    );
    expect(html).toContain(
      '<p class="links"><a href="command:stella.showRunLog">実行ログを表示</a></p>',
    );
    expect(html).not.toContain("command:stella.submitTask");
    expect(html).not.toContain("command:stella.showTaskHelp");
  });

  it("課題の外からの環境診断でエラーが出たときは、送信の案内を出さない", () => {
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest: { ...manifest, runner: "env-diagnose" },
      result: result({ runner: "env-diagnose", outcome: "error", steps: [] }),
      standalone: true,
      root: "/work",
    });
    expect(html).toContain('<div class="summary error">');
    expect(html).toContain('href="command:stella.diagnoseEnvironment">もう一度確認する');
    expect(html).not.toContain('class="summary-sub"');
    expect(html).not.toContain("command:stella.consultTask");
  });

  const passedStep: RunStepResult = {
    id: "lint",
    label: "lint (ESLint)",
    status: "passed",
    summary: "違反はありません",
    durationMs: 1900,
  };
  const skippedStep: RunStepResult = {
    id: "format",
    label: "整形 (Prettier)",
    status: "skipped",
    summary: "対象ファイルなし",
    durationMs: 0,
  };

  it("要約、手順の印、修正箇所、通過・省略の行の順に出す", () => {
    const error: RunStepResult = {
      id: "deps",
      label: "準備",
      status: "error",
      summary: "準備できません",
      durationMs: 200,
    };
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest,
      result: result({
        outcome: "error",
        steps: [passedStep, result().steps[1], skippedStep, error],
      }),
    });
    const sections = [
      '<div class="summary error">',
      '<ul class="chips">',
      '<section class="step failed">',
      '<section class="step error">',
      '<ul class="passed-steps">',
    ].map((tag) => html.indexOf(tag));
    expect(sections[0]).toBeGreaterThan(-1);
    for (const [index, position] of sections.entries()) {
      if (index > 0) expect(position).toBeGreaterThan(sections[index - 1]);
    }
    expect(html).toContain('<li class="chip passed"><b aria-label="通過">✓</b>lint</li>');
    expect(html).toContain('<li class="chip skipped"><b aria-label="省略">–</b>整形</li>');
    expect(html).toContain(
      '<h3><span class="mark">!</span> 準備 <span class="time">0.2 秒</span></h3>',
    );
    expect(html).toContain(
      '<li class="passed"><div class="row"><b>✓</b><span class="step-name">lint (ESLint)</span><span class="step-summary">違反はありません</span><span class="time">1.9 秒</span></div></li>',
    );
    expect(html).toContain(
      '<li class="skipped"><div class="row"><b>–</b><span class="step-name">整形 (Prettier)</span><span class="step-summary">対象ファイルなし</span><span class="time">0.0 秒</span></div></li>',
    );
  });

  it("通った手順のテストは行の下に畳む", () => {
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest,
      result: result({
        outcome: "passed",
        steps: [
          {
            ...passedStep,
            id: "test",
            label: "テスト (Vitest)",
            tests: [{ name: "空配列", status: "passed" }],
          },
          skippedStep,
        ],
      }),
    });
    expect(html).toContain('<ul class="passed-steps">');
    expect(html).not.toContain('<section class="step');
    expect(html).toContain(
      '</div><details><summary>通ったテスト 1 件</summary><ul class="tests ok"><li>✓ 空配列</li></ul></details></li>',
    );
  });

  it("先頭の失敗 5 件は開き、6 件目からと通過・省略したテストは畳む", () => {
    const tests: TestCaseResult[] = Array.from({ length: 7 }, (_, index) => ({
      name: `失敗 ${index + 1}`,
      status: "failed",
    }));
    tests.push({ name: "空配列", status: "passed" }, { name: "保留", status: "skipped" });
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest,
      result: result({ steps: [{ ...result().steps[1], tests }] }),
    });
    expect(html).toContain('<p class="summary-sub">テスト 7 件 ・ まだ何も送っていません</p>');
    expect(html).toContain('aria-label="テスト 8 件中 1 件が通りました"');
    expect(html).toContain('<span class="count">1 / 8</span></span></h3>');
    const overflow = "<details><summary>ほかに直すテスト 2 件</summary>";
    const [expanded, collapsed] = html.split(overflow);
    expect(expanded.match(/class="test-fail"/g)).toHaveLength(5);
    expect(expanded).toContain('<p class="test-name">失敗 5</p>');
    expect(collapsed).toMatch(
      /^<div class="test-fail"><p class="test-name">失敗 6<\/p><\/div><div class="test-fail"><p class="test-name">失敗 7<\/p><\/div><\/details>/,
    );
    expect(collapsed).toContain(
      '<details><summary>通ったテスト 1 件・省略 1 件</summary><ul class="tests ok"><li>✓ 空配列</li><li>– 保留</li></ul></details>',
    );
  });

  it("期待と実際を表示し、複数行の全文を畳んでエスケープする", () => {
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest,
      result: result({
        steps: [
          {
            ...result().steps[1],
            label: "<テスト>（Vitest）",
            summary: "<要約>",
            files: ["<対象>.js"],
            logTail: "<出力>",
            tests: [
              {
                name: "Vitest",
                status: "failed",
                file: "tests/<retry>.test.js",
                message: "expected [ 7 ] to deeply equal [ 5, 7 ]",
              },
              {
                name: "Playwright",
                status: "failed",
                message: "Expected: 3\nReceived: 2",
              },
              {
                name: "HTML",
                status: "failed",
                message: "Expected: <b>\nActual: <script>\n<iframe>",
              },
            ],
          },
        ],
      }),
    });
    expect(html).toContain("&lt;テスト&gt; 3 件 ・ まだ何も送っていません");
    expect(html).toContain("&lt;テスト&gt;（Vitest）");
    expect(html).toContain("<p>&lt;要約&gt;</p>");
    expect(html).toContain('<span class="file">tests/&lt;retry&gt;.test.js</span>');
    expect(html).toContain(
      '<dd class="expected">[ 5, 7 ]</dd><dt>実際</dt><dd class="actual">[ 7 ]</dd></dl></div>',
    );
    expect(html).toContain(
      '<dd class="expected">3</dd><dt>実際</dt><dd class="actual">2</dd></dl><details><summary>メッセージの全文</summary><pre>Expected: 3\nReceived: 2</pre></details>',
    );
    expect(html).toContain(
      '<dd class="expected">&lt;b&gt;</dd><dt>実際</dt><dd class="actual">&lt;script&gt;</dd>',
    );
    expect(html).toContain(
      "<pre>Expected: &lt;b&gt;\nActual: &lt;script&gt;\n&lt;iframe&gt;</pre>",
    );
    expect(html).toContain("<code>&lt;対象&gt;.js</code>");
    expect(html).toContain("<summary>出力の末尾</summary><pre>&lt;出力&gt;</pre>");
    expect(html).not.toMatch(/<(?:script|iframe)>/);
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

  it("ヒントの無い種別はレビューの結果だけを案内する", () => {
    const html = buildTaskPanelHtml({
      kind: "result",
      manifest: { ...manifest, kind: "assessment-a" },
      result: result({ outcome: "passed", files: [], steps: [] }),
    });
    expect(html).toContain('href="command:stella.consultTask">管理者に相談</a>');
    expect(html).toContain('href="command:stella.showTaskHelp">レビューの結果</a>');
  });

  it("定義の誤りを一覧にする", () => {
    const html = buildTaskPanelHtml({ kind: "invalid", root: "/w/<t>", errors: ["runner は <x>"] });
    expect(html).toContain("課題の定義を読めません");
    expect(html).toContain("/w/&lt;t&gt;");
    expect(html).toContain("runner は &lt;x&gt;");
  });
});

describe("expectedActual", () => {
  it.each([
    ["AssertionError: expected [ 7 ] to deeply equal [ 5, 7 ]", "[ 5, 7 ]", "[ 7 ]"],
    ["expected a to equal b", "b", "a"],
    ["expected 1 to strictly equal 2\n差分", "2", "1"],
    ["expected 1 to be 2 // Object.is equality", "2", "1"],
    ["expected false to be truthy", "truthy", "false"],
    ["expected undefined to be defined", "defined", "undefined"],
    ["expected 1 to be null", "null", "1"],
    ['expected "a b" to be "c d"', '"c d"', '"a b"'],
    ["Error: 差分\r\n  Expected:  \u001b[32m3\u001b[39m  \r\nReceived:  2", "3", "2"],
    ["Actual: 2\nExpected: 3", "3", "2"],
    ["\u001b[38:2::0:128:0mexpected 2 to be 3\u001b[m", "3", "2"],
  ])("比較メッセージ %s から値を取り出す", (message, expected, actual) => {
    expect(expectedActual(message)).toEqual({ expected, actual });
  });

  it.each([
    "expected a to equal b to equal c",
    "expected a to deeply equal b to equal c",
    "expected a to be b to be c",
    "expected a to be to be c",
    "expected 1 to be greater than 3",
    "expected 1 to be close to 3",
    "expected 1 to be one of [ 2, 3 ]",
    "expected 1 to be an instance of String",
    "expected a to equal ",
    "Expected: 3",
    "Expected: 3\nReceived: ",
    "Expected: \nActual: 2",
    "Expected: 3\nExpected: 4\nReceived: 2",
    "Expected: 3\nReceived: 2\nActual: 2",
    "Error: 差分\nexpected a to equal b",
  ])("あいまいなメッセージ %s は要約しない", (message) => {
    expect(expectedActual(message)).toBeUndefined();
  });

  it("長い値を前後の空白を除いて 200 文字に切る", () => {
    const expected = "あ".repeat(200);
    const actual = "🛰".repeat(200);
    expect(expectedActual(`Expected:  ${expected}あ \nActual:  ${actual} 	`)).toEqual({
      expected: `${expected}…`,
      actual,
    });
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

  function mockReadmePanel() {
    const disposeMessages = vi.fn();
    return {
      title: "",
      visible: true,
      viewColumn: vscode.ViewColumn.Two,
      webview: {
        html: "",
        postMessage: vi.fn().mockResolvedValue(true),
        onDidReceiveMessage: vi.fn((_listener: (message: unknown) => void) => ({
          dispose: disposeMessages,
        })),
      },
      disposeMessages,
      reveal: vi.fn(),
      onDidDispose: vi.fn(),
      onDidChangeViewState: vi.fn(),
    };
  }

  it.each([
    { compact: false, width: 419, expected: "collapse" },
    { compact: false, width: 420, expected: "stay" },
    { compact: true, width: 899, expected: "stay" },
    { compact: true, width: 900, expected: "expand" },
    { compact: false, width: 419, hasLeftEditor: false, expected: "stay" },
    { compact: false, width: 419, inSideColumn: false, expected: "stay" },
    { compact: true, width: 900, groupHasOtherTabs: false, expected: "stay" },
  ])("配置を判定する (%j)", ({ expected, ...input }) => {
    expect(
      decideReadmeLayout({
        inSideColumn: !input.compact,
        hasLeftEditor: true,
        groupHasOtherTabs: true,
        ...input,
      }),
    ).toBe(expected);
  });

  it("OS のタブ付きで描き、指定した OS のタブを開いておく", () => {
    const html = buildTaskReadmeHtml({ title: "最初のページ", markdown, os: "macos" });
    expect(html).toMatch(/value="macos" checked/);
    expect(html).toContain("エクスプローラーで <code>index.html</code> を開きます。");
    expect(html).toContain("Finder で");
  });

  it("幅を通知するスクリプトだけに nonce を付け、生の HTML は文字のまま出す", () => {
    const html = buildTaskReadmeHtml({ title: "<課題>", markdown, os: "windows" });
    const nonce = html.match(/script-src 'nonce-([A-Za-z0-9+/=]+)';/)?.[1];
    expect(nonce).toBeDefined();
    expect(html.match(/<script\b[^>]*>/gi)).toEqual([`<script nonce="${nonce}">`]);
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("<title>&lt;課題&gt;</title>");
  });

  it("問題つきの課題は README を出さず、参照元が未指定か空なら参照元も出さない", () => {
    const guide = {
      root: "/w/task",
      manifest: { ...manifest, problems: [{ id: "q01", title: "値を選ぶ" }] },
      edit: { files: [], missing: [] },
    };
    const withoutNonce = (html: string) =>
      html.replace(/(nonce-|nonce=")[A-Za-z0-9+/=]+/g, "$1NONCE");
    const html = withoutNonce(buildTaskReadmeHtml({ title: manifest.title, markdown, guide }));
    expect(html).toBe(
      withoutNonce(buildTaskReadmeHtml({ title: manifest.title, markdown: "", guide })),
    );
    expect(html).toContain("<h1>整数から &lt;k&gt; 以上を選ぶ</h1>");
    expect(html).toContain('aria-label="いまやること"');
    expect(html).not.toMatch(/class="(?:meta|readme-title)"|ヒント・解答・レビューの結果/);
    expect(html).not.toContain("参照元");
    expect(
      withoutNonce(
        buildTaskReadmeHtml({
          title: manifest.title,
          markdown: "",
          guide: { ...guide, manifest: { ...guide.manifest, references: [] } },
        }),
      ),
    ).toBe(html);
  });

  it("問題つきの課題は実行ログの下に公開の出典リンクと帰属表示を出す", () => {
    const reference = {
      id: "SRC-example",
      title: "サンプル & 練習",
      url: "https://example.org/exercises",
      publisher: "教材チーム",
      section: "配列",
      documentVersion: "更新型",
      checkedAt: "2026-10-05",
      environmentRef: "ts-test-01@1",
      usedFor: "練習問題",
      authorship: "original-exercise",
      reuse: "concept-reference",
    };
    const html = buildTaskReadmeHtml({
      title: manifest.title,
      markdown: "",
      guide: {
        root: "/w/task",
        manifest: {
          ...manifest,
          problems: [{ id: "q01", title: "値を選ぶ" }],
          references: [
            {
              ...reference,
              attribution: "CC BY-SA 4.0 / <原作者>",
              attributionTerms: {
                creator: "原作者",
                scope: "練習問題",
                conditionsUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
                checkedAt: "2026-10-05",
              },
            },
            { ...reference, id: "SRC-local", title: "ローカルの資料", url: "file:///source.md" },
          ],
        },
        edit: { files: [], missing: [] },
      },
    });
    const section = '<section class="references"><h2>参照元</h2>';
    expect(html).toContain('>管理者に相談</a> ・ <a href="command:stella.showRunLog">実行ログ</a>');
    expect(html.indexOf(section)).toBeGreaterThan(html.indexOf(">実行ログ</a>"));
    expect(html).toContain(
      '<a href="https://example.org/exercises">サンプル &amp; 練習</a> — 教材チーム / 配列',
    );
    expect(html).toContain("CC BY-SA 4.0 / &lt;原作者&gt;");
    expect(html).toContain("原作者: 原作者 / 再利用範囲: 練習問題");
    expect(html).toContain('href="https://creativecommons.org/licenses/by-sa/4.0/"');
    expect(html).toContain("条件確認日: 2026-10-05");
    expect(html).toContain("<li>ローカルの資料 — 教材チーム / 配列");
    expect(html).not.toContain('href="file:///source.md"');
  });

  const root = "/w/task";
  const input = {
    root,
    title: manifest.title,
    markdown,
    guide: { root, manifest, edit: { files: [], missing: [] } },
  };
  const check = {
    progress: { steps: [{ label: "型の確認", status: "running" as const }] },
    target: "問1 値を選ぶ",
    note: "確認だけを行います。",
  };
  const slot = '<div id="check-progress">';
  const checklist = '<section class="check-progress"';

  it.each([false, true])(
    "進め方と今のカードの間にチェックリストの場所を作る (問題つき %s)",
    (hasProblems) => {
      const guide = {
        ...input.guide,
        manifest: hasProblems
          ? { ...manifest, problems: [{ id: "q01", title: "値を選ぶ" }] }
          : manifest,
      };
      const idle = buildTaskReadmeHtml({ ...input, guide });
      expect(idle.split(slot)).toHaveLength(2);
      expect(idle).toContain(`${slot}</div>`);
      expect(idle).not.toContain('<body class="checking">');
      const html = buildTaskReadmeHtml({ ...input, guide, check });
      expect(html.split(slot)).toHaveLength(2);
      expect(html).toContain('<body class="checking">');
      expect(html).toContain(slot + checklist);
      const guideProgress = hasProblems ? 'class="problem-progress"' : 'class="stepper"';
      expect(html.indexOf(guideProgress)).toBeGreaterThan(-1);
      expect(html.indexOf(slot)).toBeGreaterThan(html.indexOf(guideProgress));
      expect(html.indexOf('class="now-card ')).toBeGreaterThan(html.indexOf(slot));
    },
  );

  it("同じ課題文のパネルだけを描き直すかメッセージで更新し、終了時に空にする", () => {
    const panel = mockReadmePanel();
    const create = vi.mocked(vscode.window.createWebviewPanel);
    create.mockReturnValueOnce(panel as never);
    showTaskReadme(input);
    try {
      const idle = panel.webview.html;
      updateTaskReadmeCheck("/別の課題", check, { rerender: true });
      updateTaskReadmeCheck("/別の課題", check);
      expect(panel.webview.html).toBe(idle);
      expect(panel.webview.postMessage).not.toHaveBeenCalled();

      updateTaskReadmeCheck(root, check, { rerender: true });
      const running = panel.webview.html;
      expect(running).toContain(slot + checklist);
      expect(running).toContain('<body class="checking">');
      expect(running).not.toContain("  reportWidth();");
      expect(panel.webview.postMessage).not.toHaveBeenCalled();

      updateTaskReadmeCheck(root, { ...check, target: "問2 値を選ぶ" });
      expect(panel.webview.html).toBe(running);
      expect(panel.webview.postMessage).toHaveBeenCalledExactlyOnceWith({
        type: "check-progress",
        html: expect.stringContaining("問2 値を選ぶ"),
      });

      // 裏のタブを再表示したときなど、再読み込みした Webview にも最新の内容を送る。
      const receive = panel.webview.onDidReceiveMessage.mock.calls[0]?.[0];
      receive?.({ type: "check-progress-ready" });
      expect(panel.webview.postMessage).toHaveBeenCalledTimes(2);
      expect(panel.webview.postMessage).toHaveBeenLastCalledWith({
        type: "check-progress",
        html: expect.stringContaining("問2 値を選ぶ"),
      });

      updateTaskReadmeCheck(root, undefined);
      expect(panel.webview.html).toBe(running);
      expect(panel.webview.postMessage).toHaveBeenLastCalledWith({
        type: "check-progress",
        html: "",
      });
      updateTaskReadmeCheck(root, undefined, { rerender: true });
      expect(panel.webview.html).toContain(`${slot}</div>`);
      expect(panel.webview.html).not.toContain('<body class="checking">');
      expect(panel.reveal).not.toHaveBeenCalled();
    } finally {
      panel.onDidDispose.mock.calls[0]?.[0]();
    }
    const created = create.mock.calls.length;
    updateTaskReadmeCheck(root, check, { rerender: true });
    expect(create).toHaveBeenCalledTimes(created);
  });

  it("実行中に課題文を描き直しても、同じ課題の最新の進み具合を出す", () => {
    const panel = mockReadmePanel();
    vi.mocked(vscode.window.createWebviewPanel).mockReturnValueOnce(panel as never);
    startTaskCheck({ root, taskId: manifest.id, target: check.target, note: check.note });
    progressTaskCheck({ type: "plan", steps: [{ id: "test", label: "テスト" }] });
    try {
      showTaskReadme(input);
      expect(panel.webview.html).toContain(slot + checklist);
      expect(panel.webview.html).toContain("問1 値を選ぶ");
      expect(panel.webview.html).toContain('class="check-label">テスト<');
      progressTaskCheck({ type: "step-start", index: 0 });
      showTaskReadme({ ...input, markdown: "新しい課題文" }, { reveal: false });
      expect(panel.webview.html).toContain("新しい課題文");
      expect(panel.webview.html).toContain('<li class="running" aria-current="step">');
      expect(panel.reveal).not.toHaveBeenCalled();
    } finally {
      finishTaskCheck({ root, manifest, result: result(), saved: false });
      panel.onDidDispose.mock.calls[0]?.[0]();
    }
  });

  it("同じ課題の結果だけを差し替え、終了時に最後に描いた結果に戻す", () => {
    const panel = mockReadmePanel();
    const create = vi.mocked(vscode.window.createWebviewPanel);
    const created = create.mock.calls.length;
    const titledCheck = { ...check, title: "確認中の <課題>" };
    updateTaskPanelCheck(root, titledCheck);
    expect(create).toHaveBeenCalledTimes(created);
    create.mockReturnValueOnce(panel as never);
    const panelInput = { kind: "result" as const, root, manifest, result: result() };
    showTaskPanel(panelInput);
    try {
      const previous = panel.webview.html;
      updateTaskPanelCheck("/別の課題", titledCheck);
      expect(panel.webview.html).toBe(previous);
      updateTaskPanelCheck(root, titledCheck);
      const head = (html: string) => html.split("</head>")[0]?.replace(/<title>.*?<\/title>/, "");
      expect(head(panel.webview.html)).toBe(head(previous));
      expect(panel.webview.html).toContain("<h1>確認中の &lt;課題&gt;</h1>");
      expect(panel.webview.html).toContain(checklist);
      expect(panel.webview.html).toContain('href="command:stella.showRunLog"');
      expect(panel.webview.html).not.toMatch(/<div class="summary|<script/);
      updateTaskPanelCheck(root, undefined);
      expect(panel.webview.html).toBe(previous);

      updateTaskPanelCheck(root, titledCheck);
      const next = { ...panelInput, result: result({ outcome: "passed" }) };
      showTaskPanel(next, { reveal: false });
      expect(panel.webview.html).toBe(buildTaskPanelHtml(next));
      updateTaskPanelCheck(root, undefined);
      expect(panel.webview.html).toBe(buildTaskPanelHtml(next));

      const invalid = { kind: "invalid" as const, root, errors: ["定義のエラー"] };
      showTaskPanel(invalid, { reveal: false });
      updateTaskPanelCheck(root, titledCheck);
      expect(panel.webview.html).toBe(buildTaskPanelHtml(invalid));
      expect(panel.reveal).not.toHaveBeenCalled();
      expect(panel.webview.postMessage).not.toHaveBeenCalled();
    } finally {
      for (const [dispose] of panel.onDidDispose.mock.calls) dispose();
    }
    updateTaskPanelCheck(root, titledCheck);
    expect(create).toHaveBeenCalledTimes(created + 1);
  });

  it.each([
    ["C:\\a\\b", "c:\\a\\b"],
    ["c:\\a\\b", "C:\\a\\b"],
  ])(
    "ドライブ文字の大小が違っても両方のパネルで進捗を表示する (%s / %s)",
    (panelRoot, checkRoot) => {
      const platform = process.platform;
      const readme = mockReadmePanel();
      const resultPanel = mockReadmePanel();
      vi.mocked(vscode.window.createWebviewPanel)
        .mockReturnValueOnce(readme as never)
        .mockReturnValueOnce(resultPanel as never);
      Object.defineProperty(process, "platform", { value: "win32" });
      try {
        startTaskCheck({ root: checkRoot, taskId: manifest.id });
        progressTaskCheck({ type: "plan", steps: [{ id: "test", label: "最初の手順" }] });
        showTaskReadme({ ...input, root: panelRoot, guide: { ...input.guide, root: panelRoot } });
        expect(readme.webview.html).toContain(slot + checklist);
        expect(readme.webview.html).toContain("最初の手順");
        updateTaskReadmeCheck(checkRoot, check);
        expect(readme.webview.postMessage).toHaveBeenCalledExactlyOnceWith({
          type: "check-progress",
          html: expect.stringContaining("型の確認"),
        });

        const panelInput = { kind: "result" as const, root: panelRoot, manifest, result: result() };
        showTaskPanel(panelInput);
        const previous = resultPanel.webview.html;
        updateTaskPanelCheck(checkRoot, { ...check, title: manifest.title });
        expect(resultPanel.webview.html).toContain(checklist);
        expect(resultPanel.webview.html).toContain("型の確認");
        updateTaskPanelCheck(checkRoot, undefined);
        expect(resultPanel.webview.html).toBe(previous);
      } finally {
        Object.defineProperty(process, "platform", { value: platform });
        finishTaskCheck({ root: checkRoot, manifest, result: result(), saved: false });
        for (const [dispose] of readme.onDidDispose.mock.calls) dispose();
        for (const [dispose] of resultPanel.onDidDispose.mock.calls) dispose();
      }
    },
  );

  it("確認のあとの描き直しは、閉じたパネルを作り直さない", () => {
    showTaskReadme({ title: "最初のページ", markdown, root: "/x" }, { reveal: false });
    expect(vscode.window.createWebviewPanel).not.toHaveBeenCalled();
  });

  it("確認のあとの描き直しは、別の課題に切り替えたパネルを上書きしない", () => {
    const panel = mockReadmePanel();
    vi.mocked(vscode.window.createWebviewPanel).mockReturnValueOnce(panel as never);
    showTaskReadme({ title: "課題B", markdown: "B の本文", root: "/b" });
    expect(panel.webview.html).toContain("B の本文");
    expect(vscode.window.createWebviewPanel).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(Object),
      { enableScripts: true, localResourceRoots: [], enableCommandUris: [...GUIDE_COMMANDS] },
    );
    // 課題 A の確認のあとの描き直しが、読み込みを待つ間に B へ切り替わったパネルに届く。
    showTaskReadme({ title: "課題A", markdown: "A の本文", root: "/a" }, { reveal: false });
    expect(panel.webview.html).toContain("B の本文");
    expect(panel.webview.html).not.toContain("A の本文");
    // 同じ課題の描き直しは届く。
    showTaskReadme({ title: "課題B", markdown: "B の新しい本文", root: "/b" }, { reveal: false });
    expect(panel.webview.html).toContain("B の新しい本文");
    expect(panel.reveal).not.toHaveBeenCalled();
    panel.onDidDispose.mock.calls[0]?.[0]();
    expect(panel.disposeMessages).toHaveBeenCalledOnce();
  });

  it("課題文の幅で配置を切り替え、まとめたときはコードを前面に戻す", () => {
    const panel = mockReadmePanel();
    const resultPanel = mockReadmePanel();
    const closedPanel = mockReadmePanel();
    const input = { title: "課題A", markdown, root: "/a" };
    const resultInput = { kind: "result" as const, manifest, result: result() };
    const editor = { viewColumn: vscode.ViewColumn.One, document: {} } as vscode.TextEditor;
    const editors = vi.spyOn(vscode.window, "visibleTextEditors", "get").mockReturnValue([editor]);
    const groups = vi.spyOn(vscode.window.tabGroups, "all", "get");
    const activeGroup = vi.spyOn(vscode.window.tabGroups, "activeTabGroup", "get");
    const showDocument = vi.mocked(vscode.window.showTextDocument).mockResolvedValue(editor);
    const createPanel = vi.mocked(vscode.window.createWebviewPanel);
    try {
      createPanel.mockReturnValueOnce(closedPanel as never);
      showTaskPanel(resultInput);
      for (const [listener] of closedPanel.onDidDispose.mock.calls) listener();
      createPanel.mockReturnValueOnce(resultPanel as never);
      showTaskPanel(resultInput);
      createPanel.mockReturnValueOnce(panel as never);
      showTaskReadme(input);
      expect(createPanel).toHaveBeenLastCalledWith(
        "stella.taskReadme",
        "課題: 課題A",
        { viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
        expect.any(Object),
      );
      const receive = panel.webview.onDidReceiveMessage.mock.calls[0]?.[0];
      for (const message of [
        null,
        { type: "other", width: 300 },
        { type: "layout", width: "300" },
        { type: "layout", width: NaN },
        { type: "layout", width: Infinity },
        { type: "layout", width: 0 },
      ]) {
        receive?.(message);
      }
      panel.visible = false;
      receive?.({ type: "layout", width: 300 });
      expect(panel.reveal).not.toHaveBeenCalled();
      expect(showDocument).not.toHaveBeenCalled();

      panel.visible = true;
      receive?.({ type: "layout", width: 300 });
      expect(resultPanel.reveal).toHaveBeenCalledExactlyOnceWith(vscode.ViewColumn.One, true);
      expect(resultPanel.reveal).toHaveBeenCalledBefore(panel.reveal);
      expect(closedPanel.reveal).not.toHaveBeenCalled();
      expect(panel.reveal).toHaveBeenLastCalledWith(vscode.ViewColumn.One, true);
      expect(showDocument).toHaveBeenCalledExactlyOnceWith(editor.document, {
        viewColumn: vscode.ViewColumn.One,
        preview: false,
      });
      expect(sideColumn()).toBe(vscode.ViewColumn.Active);
      activeGroup.mockReturnValue({ viewColumn: vscode.ViewColumn.Two } as vscode.TabGroup);
      expect(sideColumn()).toBe(vscode.ViewColumn.Two);

      panel.viewColumn = vscode.ViewColumn.One;
      showTaskReadme(input);
      expect(panel.reveal).toHaveBeenLastCalledWith(vscode.ViewColumn.Two, false);
      groups.mockReturnValue([{ viewColumn: vscode.ViewColumn.One, tabs: [{}] }] as never);
      receive?.({ type: "layout", width: 900 });
      expect(panel.reveal).toHaveBeenCalledTimes(2);

      groups.mockReturnValue([{ viewColumn: vscode.ViewColumn.One, tabs: [{}, {}] }] as never);
      receive?.({ type: "layout", width: 900 });
      expect(panel.reveal).toHaveBeenLastCalledWith(vscode.ViewColumn.Two, true);
      expect(sideColumn()).toBe(vscode.ViewColumn.Two);
    } finally {
      panel.onDidDispose.mock.calls[0]?.[0]();
      for (const [listener] of resultPanel.onDidDispose.mock.calls) listener();
      editors.mockRestore();
      groups.mockRestore();
      activeGroup.mockRestore();
      showDocument.mockReset();
    }
  });

  it("非表示から戻った課題を通知し、同じ課題は 30 秒に 1 回にする", () => {
    const panel = mockReadmePanel();
    const setVisible = (visible: boolean) => {
      panel.visible = visible;
      panel.onDidChangeViewState.mock.calls[0]?.[0]({ webviewPanel: panel });
    };
    const listener = vi.fn();
    const subscription = onTaskReadmeVisible(listener);
    const now = vi.spyOn(Date, "now").mockReturnValue(0);
    vi.mocked(vscode.window.createWebviewPanel).mockReturnValueOnce(panel as never);
    try {
      showTaskReadme({ title: "課題A", markdown, root: "/a" });
      setVisible(true);
      setVisible(false);
      expect(listener).not.toHaveBeenCalled();
      setVisible(true);
      expect(listener.mock.calls).toEqual([["/a"]]);

      now.mockReturnValue(29_999);
      setVisible(false);
      setVisible(true);
      expect(listener).toHaveBeenCalledTimes(1);

      showTaskReadme({ title: "課題B", markdown, root: "/b" });
      setVisible(false);
      setVisible(true);
      expect(listener.mock.calls).toEqual([["/a"], ["/b"]]);

      now.mockReturnValue(30_000);
      showTaskReadme({ title: "課題A", markdown, root: "/a" });
      setVisible(false);
      setVisible(true);
      expect(listener.mock.calls).toEqual([["/a"], ["/b"], ["/a"]]);

      subscription.dispose();
      now.mockReturnValue(60_000);
      setVisible(false);
      setVisible(true);
      expect(listener).toHaveBeenCalledTimes(3);
    } finally {
      panel.onDidDispose.mock.calls[0]?.[0]();
      subscription.dispose();
      now.mockRestore();
    }
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
      const sections = [
        '<ol class="stepper">',
        '<div class="now-card none">',
        '<details class="all-steps"><summary>進め方をすべて見る</summary>',
        '<p class="help">',
        '<h2 class="readme-title">課題文',
      ].map((section) => html.indexOf(section));
      expect(sections.every((index) => index >= 0)).toBe(true);
      expect(sections).toEqual([...sections].sort((a, b) => a - b));
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
      expect(html.match(/<script\b/gi)).toHaveLength(1);
      expect(html).toContain(
        "default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'nonce-",
      );
    });

    it("前回の結果は課題文の上の枠に件数と手順だけを表示する", () => {
      const failed = buildTaskReadmeHtml({
        title: staticManifest.title,
        markdown,
        guide: {
          root,
          manifest: staticManifest,
          edit: { files: [], missing: [] },
          lastRun: {
            outcome: "failed",
            steps: [{ label: "<テスト>", status: "failed", tests: { total: 2, passed: 1 } }],
            tests: { total: 2, passed: 1 },
          },
        },
      });
      const body = failed.slice(failed.indexOf("<body>"));
      expect(body).toMatch(/class="now-card failed".*テスト 2 件中 1 件が通りました/);
      expect(body).toContain("残り: &lt;テスト&gt; 1 件");
      expect(body).not.toContain("<テスト>");
      expect(body.match(/class="button"/g)).toHaveLength(1);
      expect(body.indexOf("残り")).toBeLessThan(body.indexOf('<h2 class="readme-title">課題文'));
    });
  });
});
