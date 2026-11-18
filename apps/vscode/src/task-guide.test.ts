import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TaskManifest } from "@stella/shared/tasks/manifest";
import type { RunResult } from "@stella/shared/tasks/run-result";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  window: { createWebviewPanel: vi.fn() },
  ViewColumn: { Active: 1 },
}));

import {
  buildTaskGuideHtml,
  opensAsText,
  readLastRun,
  resolveEditFiles,
  stripLeadingTitle,
  type TaskGuideInput,
} from "./task-guide.js";

const staticManifest: TaskManifest = {
  schemaVersion: 1,
  id: "dev-env-basics/u02-first-task/q01-first-page",
  title: "最初のページを作る",
  kind: "basic",
  runner: "static-preview",
  submit: { files: ["index.html"] },
  protected: ["tests/**"],
  checks: { lint: false, format: false },
};

const nodeManifest: TaskManifest = {
  schemaVersion: 1,
  id: "course/unit/q01",
  title: "会話の履歴を組み立てる",
  kind: "basic",
  runner: "node-test",
  submit: { files: ["src/**/*.js", "notes/*.md"] },
  protected: ["package.json", "tests/**", "src/fixtures/**"],
  checks: { lint: true, format: true },
};

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function makeRoot(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "stella-guide-"));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
    await writeFile(path.join(root, rel), content);
  }
  return root;
}

function guide(overrides: Partial<TaskGuideInput> = {}): TaskGuideInput {
  return {
    root: "/home/me/web-training/dev-env-basics/u02-first-task/q01-first-page",
    manifest: staticManifest,
    edit: { files: ["index.html"], missing: [] },
    os: "windows",
    ...overrides,
  };
}

/** HTML の command: リンクの引数 (JSON) を取り出す。 */
function commandArgs(html: string, command: string): unknown[][] {
  const pattern = new RegExp(`href="command:${command.replaceAll(".", "\\.")}\\?([^"]+)"`, "g");
  return [...html.matchAll(pattern)].map((m) => JSON.parse(decodeURIComponent(m[1] ?? "")));
}

describe("resolveEditFiles", () => {
  it("提出するファイルのうち、配布したテスト・設定と依存パッケージを除いたものを返す", async () => {
    const root = await makeRoot({
      "src/conversation.js": "",
      "src/fixtures/data.js": "",
      "src/lib/util.js": "",
      "package.json": "{}",
      "tests/conversation.test.js": "",
      "node_modules/pkg/src/index.js": "",
      ".stella/task.json": "{}",
    });
    expect(await resolveEditFiles(root, nodeManifest)).toEqual({
      files: ["src/conversation.js", "src/lib/util.js"],
      missing: ["notes/*.md"],
    });
  });

  it("まだ作っていないファイルは missing に出す", async () => {
    const root = await makeRoot({ "README.md": "" });
    expect(await resolveEditFiles(root, staticManifest)).toEqual({
      files: [],
      missing: ["index.html"],
    });
  });
});

function runResult(overrides: Partial<RunResult> = {}): RunResult {
  return {
    schemaVersion: 1,
    taskId: staticManifest.id,
    runner: "static-preview",
    outcome: "passed",
    startedAt: "2026-11-01T00:00:00.000Z",
    durationMs: 10,
    platform: "win32",
    toolVersions: {},
    steps: [],
    files: [],
    protected: [],
    manifestSha256: "a".repeat(64),
    ...overrides,
  };
}

function saveRun(result: unknown): Promise<string> {
  return makeRoot({ ".stella/last-run.json": JSON.stringify(result) });
}

describe("readLastRun", () => {
  it("この課題の前回の結果だけを読み、中断・読めない結果・形の違う結果を無視する", async () => {
    const root = await saveRun(runResult());
    expect(await readLastRun(root, staticManifest.id)).toEqual({ outcome: "passed", steps: [] });
    expect(await readLastRun(root, "other/task/id")).toBeUndefined();
    expect(await readLastRun(await makeRoot({}), staticManifest.id)).toBeUndefined();
    const broken = await makeRoot({ ".stella/last-run.json": "{" });
    expect(await readLastRun(broken, staticManifest.id)).toBeUndefined();
    const wrongShape = await saveRun({ ...runResult(), steps: [{ label: "lint" }] });
    expect(await readLastRun(wrongShape, staticManifest.id)).toBeUndefined();
    const cancelled = await saveRun(runResult({ outcome: "cancelled" }));
    expect(await readLastRun(cancelled, staticManifest.id)).toBeUndefined();
  });

  it("最初にエラーになった手順の要約だけを読み、省略したテストは数えない", async () => {
    const root = await saveRun(
      runResult({
        outcome: "error",
        steps: [
          {
            id: "deps",
            label: "準備 (npm ci)",
            status: "error",
            durationMs: 1,
            summary: "依存の準備に失敗",
          },
          {
            id: "build",
            label: "ビルド（C#）",
            status: "error",
            durationMs: 1,
            summary: "ビルドに失敗",
          },
          {
            id: "test",
            label: "テスト (Vitest)",
            status: "skipped",
            durationMs: 0,
            summary: "省略",
            tests: [{ name: "省略したテスト", status: "skipped" }],
          },
        ],
      }),
    );
    expect(await readLastRun(root, staticManifest.id)).toEqual({
      outcome: "error",
      steps: [
        { label: "準備", status: "error" },
        { label: "ビルド", status: "error" },
        { label: "テスト", status: "skipped" },
      ],
      errorSummary: "依存の準備に失敗",
    });
  });
});

describe("buildTaskGuideHtml", () => {
  it("3 段の進行バーと畳んだ手順を出し、唯一の主ボタンは提出する", () => {
    const input = guide();
    const html = buildTaskGuideHtml(input);
    expect(html).toContain(
      '<ol class="stepper"><li class="done">課題文を読む</li><li class="now" aria-current="step">編集して保存</li><li>提出</li></ol>',
    );
    expect(html).toContain('<details class="all-steps"><summary>進め方をすべて見る</summary><ol>');
    expect(html.split('<details class="all-steps">')[1]?.match(/<li>/g)).toHaveLength(3);
    expect(html).toContain("エディターの右上のビーカー");
    expect(commandArgs(html, "stella.openTaskFile")).toEqual([[input.root, "index.html"]]);
    expect(commandArgs(html, "stella.runTask")).toEqual([[input.root]]);
    expect(commandArgs(html, "stella.submitTask")).toEqual([[input.root]]);
    expect(commandArgs(html, "stella.consultTask")).toEqual([[input.root]]);
    expect(commandArgs(html, "stella.showTaskHelp")).toEqual([[input.root]]);
    expect(html).toContain('href="command:stella.showRunLog"');
    expect(html.match(/class="button"/g)).toHaveLength(1);
    expect(html).not.toMatch(/<script/i);
  });

  it.each([
    [
      undefined,
      "none",
      "編集して保存",
      "ファイルを書き換えて保存する",
      "で保存したら提出します。",
      [],
    ],
    [
      "failed",
      "failed",
      "編集して保存",
      "✗ 直すところがあります",
      "直して保存し、もう一度提出します。",
      ["講師に相談"],
    ],
    [
      "error",
      "error",
      "提出",
      "! 環境の問題で確認できませんでした",
      "&lt;準備に失敗&gt;",
      ["実行ログ", "講師に相談"],
    ],
    [
      "passed",
      "passed",
      "提出",
      "✓ 確認はすべて通りました",
      "「提出する」を押して、振り返りを書いて送ります。",
      [],
    ],
  ] as const)(
    "前回が %s のときに対応する段・枠・操作を出す",
    (outcome, tone, current, title, body, links) => {
      const input = guide(
        outcome ? { lastRun: { outcome, steps: [], errorSummary: "<準備に失敗>" } } : {},
      );
      const html = buildTaskGuideHtml(input);
      expect(html).toContain(`<li class="now" aria-current="step">${current}</li>`);
      expect(html).toContain(`<div class="now-card ${tone}"><p class="now-title">${title}</p>`);
      expect(html).toContain(body);
      expect(html).not.toContain("<準備に失敗>");
      expect(html.includes('class="first"')).toBe(outcome === undefined);
      const actions = /<p class="actions">(.*?)<\/p>/.exec(html)?.[1] ?? "";
      expect([...actions.matchAll(/>([^<]+)<\/a>/g)].map((match) => match[1])).toEqual([
        "提出する",
        ...links,
      ]);
      expect(html.match(/class="button"/g)).toHaveLength(1);
    },
  );

  it("失敗した実行のファイルからテストの件数・手順の印・残りを出す", async () => {
    const root = await saveRun(
      runResult({
        outcome: "failed",
        steps: [
          { id: "deps", label: "準備", status: "passed", durationMs: 1, summary: "通過" },
          {
            id: "format",
            label: "整形 (Prettier)",
            status: "failed",
            durationMs: 1,
            summary: "失敗",
          },
          {
            id: "test",
            label: "テスト (Vitest)",
            status: "failed",
            durationMs: 1,
            summary: "失敗",
            tests: [
              { name: "通過したテスト", status: "passed" },
              { name: "<script>失敗したテスト</script>", status: "failed" },
              { name: "省略したテスト", status: "skipped" },
            ],
          },
          {
            id: "e2e",
            label: "操作テスト (Playwright)",
            status: "failed",
            durationMs: 1,
            summary: "失敗",
            tests: [
              { name: "失敗した操作テスト 1", status: "failed" },
              { name: "失敗した操作テスト 2", status: "failed" },
            ],
          },
          { id: "build", label: "<ビルド>", status: "skipped", durationMs: 0, summary: "省略" },
        ],
      }),
    );
    const lastRun = await readLastRun(root, staticManifest.id);
    const html = buildTaskGuideHtml(guide(lastRun ? { lastRun } : {}));
    expect(html).toContain(
      'role="img" aria-label="テスト 4 件中 1 件が通りました"><i class="p"></i><i></i><i></i><i></i></span><span class="count">1 / 4</span>',
    );
    expect(html).toContain('<li class="chip passed"><b aria-label="通過">✓</b>準備</li>');
    expect(html).toContain('<li class="chip failed"><b aria-label="要修正">✗</b>整形</li>');
    expect(html).toContain(
      '<li class="chip skipped"><b aria-label="省略">–</b>&lt;ビルド&gt;</li>',
    );
    expect(html).toContain('<p class="rest">残り: 整形 ・ テスト 1 件 ・ 操作テスト 2 件</p>');
    expect(html).not.toMatch(/<script|失敗したテスト|<ビルド>|Prettier|Vitest/);
  });

  it("テストが 40 件までは個別に描き、41 件以上は割合のバーにする", () => {
    const render = (total: number) =>
      buildTaskGuideHtml(
        guide({
          lastRun: { outcome: "passed", steps: [], tests: { passed: total, total } },
        }),
      );
    const segments = render(40);
    expect(segments.match(/<i class="p"><\/i>/g)).toHaveLength(40);
    expect(segments).not.toContain('class="rest"');
    expect(render(41)).toContain(
      'class="tbar wide" role="img" aria-label="テスト 41 件中 41 件が通りました"><i class="p" style="width:100.0%"></i>',
    );
  });

  it("環境エラーには手順の印を出し、テストの件数と残りは出さない", () => {
    const html = buildTaskGuideHtml(
      guide({
        lastRun: {
          outcome: "error",
          steps: [{ label: "準備", status: "error" }],
          tests: { passed: 0, total: 1 },
        },
      }),
    );
    expect(html).toContain('<li class="chip error"><b aria-label="環境の問題">!</b>準備</li>');
    expect(html).not.toMatch(/class="(?:tests-line|rest)"/);
  });

  it("HTML の課題はブラウザーでの確認を、テストの課題は初回の準備と信頼を案内する", () => {
    const html = buildTaskGuideHtml(guide());
    expect(html).toContain("ブラウザーで開いて表示を確かめます");
    expect(html).not.toContain("npm ci");

    const node = buildTaskGuideHtml(
      guide({
        manifest: nodeManifest,
        edit: { files: ["src/conversation.js"], missing: ["notes/*.md"] },
      }),
    );
    expect(node).toContain(
      "提出の前に、テストと lint・整形の確認が自動で走ります。通らなければ何も送りません。",
    );
    expect(node).toContain("npm ci");
    expect(node).toContain("信頼");
    expect(node).toContain("まだ無いファイル: <code>notes/*.md</code>");
    expect(node).not.toContain("ブラウザーで開いて");
  });

  it("CI と公開の課題は push と URL の入力を案内する", () => {
    const html = buildTaskGuideHtml(
      guide({ manifest: { ...staticManifest, runner: "ci-deploy", ci: { workflow: "x.yml" } } }),
    );
    expect(html).toContain("GitHub に push");
    expect(html).toContain("GitHub Actions の実行の URL と公開先の URL を尋ねます。");
  });

  it("Git の課題はコミットを、C# の課題は NuGet とフォルダーの信頼を案内する", () => {
    const git = buildTaskGuideHtml(
      guide({ manifest: { ...staticManifest, runner: "git-record" } }),
    );
    expect(git).toContain("学習フォルダーでコミットします。");
    expect(git).toContain("学習フォルダーの Git の記録と設定の確認が自動で走ります。");

    const dotnet = buildTaskGuideHtml(
      guide({ manifest: { ...staticManifest, runner: "dotnet-test" } }),
    );
    expect(dotnet).toContain("C# のコードのビルドとテストが自動で走ります。");
    expect(dotnet).toContain("NuGet から入れる (dotnet restore)");
    expect(dotnet).toContain("VS Code にフォルダーを信頼するか尋ねられたら");
    expect(dotnet).not.toContain("npm ci");
  });

  it("保存のキーは OS に合わせる", () => {
    expect(buildTaskGuideHtml(guide({ os: "windows" }))).toContain("<kbd>Ctrl+S</kbd>");
    expect(buildTaskGuideHtml(guide({ os: "macos" }))).toContain("<kbd>⌘S</kbd>");
  });

  it("ファイル名はエスケープし、多いときは数だけ出す", () => {
    const files = Array.from({ length: 12 }, (_, i) => `src/<f${i}>.js`);
    const html = buildTaskGuideHtml(guide({ edit: { files, missing: [] } }));
    expect(html).toContain("<code>src/&lt;f0&gt;.js</code>");
    expect(html).not.toContain("<f0>");
    expect(html).toContain("ほか 2 件");
    expect(commandArgs(html, "stella.openTaskFile")).toHaveLength(10);
  });

  it("問題の無い課題では問題の一覧も件数も出さない", () => {
    const html = buildTaskGuideHtml(guide());
    expect(html).not.toMatch(/class="(?:problems|pbar|tests-line)"/);
    expect(html).toContain("振り返りを書いて送ります");
  });

  it("問題つきの課題は一覧と件数を出し、確認して提出して次へ進む", () => {
    const input = guide({
      manifest: {
        ...staticManifest,
        runner: "ts-test",
        problems: [
          { id: "q01-add", title: "足す" },
          { id: "q02-sub", title: "引く" },
        ],
        submit: { files: ["src/**/*.ts"] },
      },
      problems: [
        { id: "q01-add", title: "足す", source: "src/q01-add.ts", status: "submitted" },
        { id: "q02-sub", title: "引く", source: "src/q02-sub.ts", status: "local-passed" },
        { id: "q03-mod", title: "余り", source: "src/q03-mod.ts", status: "not-submitted" },
      ],
    });
    const html = buildTaskGuideHtml(input);
    expect(html).toContain("1/3 問");
    expect(html).toContain("提出済み");
    expect(html).toContain("手元で合格");
    expect(html).toContain("未提出");
    expect(html).toContain('<p class="now-title">いまの問題: 引く</p>');
    expect(html).toContain(
      "手元の確認は通っています。「提出する」を押すと送って、次の問題を開きます。",
    );
    expect(html).toContain(
      'class="pbar" role="img" aria-label="3 問中 1 問を提出済み"><i style="width:33.3%"></i>',
    );
    expect(html).toContain('class="problem-status submitted">提出済み');
    expect(html).toContain('class="problem-status local-passed">手元で合格');
    expect(html).toContain('class="problem-status not-submitted">未提出');
    expect(html).toMatch(/<li class="current"[^>]*><a [^>]*>引く<\/a>/);
    expect(html).toContain("提出する");
    expect(html).not.toContain("説明");
    expect(html).not.toContain("修正記録");
    expect(html).not.toContain("ファイルを編集して保存する");
    expect(commandArgs(html, "stella.openTaskFile")).toEqual([
      [input.root, "src/q01-add.ts"],
      [input.root, "src/q02-sub.ts"],
      [input.root, "src/q03-mod.ts"],
    ]);
    expect(commandArgs(html, "stella.submitTask")).toEqual([[input.root]]);
    expect(commandArgs(html, "stella.consultTask")).toEqual([
      [input.root, "q02-sub"],
      [input.root],
    ]);
    expect(html).not.toContain("command:stella.runTask");
  });

  it("未確認の問題は題とファイル名をエスケープして案内し、全問提出後は完了を示す", () => {
    const manifest: TaskManifest = {
      ...staticManifest,
      runner: "ts-test",
      problems: [{ id: "q01-add", title: "<足す>" }],
    };
    const item = { id: "q01-add", title: "<足す>", source: "src/<q01-add>.ts" };
    const input = guide({ manifest, problems: [{ ...item, status: "not-submitted" }] });
    const html = buildTaskGuideHtml(input);
    expect(html).toContain('<p class="now-title">いまの問題: &lt;足す&gt;</p>');
    expect(html).toContain(
      "<code>src/&lt;q01-add&gt;.ts</code></a> を書いて保存したら提出します。",
    );
    expect(html).not.toMatch(/<足す>|<q01-add>/);
    expect(commandArgs(html, "stella.openTaskFile")).toEqual([
      [input.root, item.source],
      [input.root, item.source],
    ]);

    const completed = buildTaskGuideHtml(
      guide({ manifest, problems: [{ ...item, status: "submitted" }] }),
    );
    expect(completed).toContain(
      '<div class="now-card passed"><p class="now-title">✓ 全部の問題を提出しました</p>',
    );
    expect(completed).toContain('aria-label="1 問中 1 問を提出済み"');
    expect(completed).not.toMatch(/class="(?:button|current)"|command:stella.submitTask/);
  });

  it("ヒントの無い種別では「レビューの結果」とだけ出す", () => {
    const html = buildTaskGuideHtml(
      guide({ manifest: { ...staticManifest, kind: "assessment-b" } }),
    );
    expect(html).toContain(">レビューの結果</a>");
    expect(html).not.toContain("ヒント・解答");
  });
});

describe("opensAsText", () => {
  it("画像・フォント・アーカイブは自動では開かない (SVG と CSV はテキスト)", () => {
    expect(["index.html", "src/a.ts", "logo.svg", "data.csv", "README"].every(opensAsText)).toBe(
      true,
    );
    expect(["logo.PNG", "photo.jpeg", "font.woff2", "a.zip", "app.wasm"].some(opensAsText)).toBe(
      false,
    );
  });
});

describe("stripLeadingTitle", () => {
  it("課題名と同じ先頭の見出しだけを外す", () => {
    expect(stripLeadingTitle("\n# 最初のページを作る\n\n本文", "最初のページを作る")).toBe(
      "\n本文",
    );
    expect(stripLeadingTitle("# 別の見出し\n本文", "最初のページを作る")).toBe(
      "# 別の見出し\n本文",
    );
    expect(stripLeadingTitle("本文\n# 最初のページを作る", "最初のページを作る")).toBe(
      "本文\n# 最初のページを作る",
    );
  });
});
