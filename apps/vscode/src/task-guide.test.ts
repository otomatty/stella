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
  guideProblems,
  GUIDE_COMMANDS,
  problemCellGroups,
  problemNow,
  problemRefText,
  problemRows,
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
  it("「進め方をすべて見る」の最後にウォークスルーへのリンクを出す", () => {
    const html = buildTaskGuideHtml(guide());
    const details = html.match(/<details class="all-steps">[\s\S]*?<\/details>/)?.[0];
    expect(details).toMatch(
      /<p>はじめての方は「<a href="command:stella\.openWalkthrough">課題の進め方を見る<\/a>」をどうぞ。<\/p><\/details>$/,
    );
    expect(GUIDE_COMMANDS).toContain("stella.openWalkthrough");
  });

  it("4 段の進行バーと畳んだ 3 行の手順を出し、唯一の主ボタンは提出する", () => {
    const input = guide();
    const html = buildTaskGuideHtml(input);
    expect(html).toContain(
      '<ol class="stepper"><li class="done">課題文を読む</li><li class="now" aria-current="step">編集して保存</li><li>提出</li><li>レビュー</li></ol>',
    );
    expect(html).toContain('<details class="all-steps"><summary>進め方をすべて見る</summary><ol>');
    expect(html.split('<details class="all-steps">')[1]?.match(/<li>/g)).toHaveLength(3);
    expect(html).toContain("エディターの右上のビーカー");
    expect(html).toContain("レビューで合格すると、この課題は完了です。");
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
      ["管理者に相談"],
    ],
    [
      "error",
      "error",
      "提出",
      "! 環境の問題で確認できませんでした",
      "&lt;準備に失敗&gt;",
      ["実行ログ", "管理者に相談"],
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

  it.each([
    ["passed", "✓ 合格しました"],
    ["ai-passed", "✓ 合格しました (AI で合格)"],
  ] as const)("%s は 4 段とも済みにしてレビューを見るリンクを出す", (taskStatus, title) => {
    const input = guide({ taskStatus, lastRun: { outcome: "failed", steps: [] } });
    const html = buildTaskGuideHtml(input);
    expect(html.match(/<li class="done">/g)).toHaveLength(4);
    expect(html).not.toContain('aria-current="step"');
    expect(html).toContain(`<div class="now-card passed"><p class="now-title">${title}</p>`);
    expect(html).toContain("この課題は完了です。");
    expect(html).toContain("レビューの結果を見る");
    expect(commandArgs(html, "stella.showTaskHelp")).toEqual([[input.root], [input.root]]);
    expect(commandArgs(html, "stella.submitTask")).toEqual([]);
  });

  it.each([
    ["submitted", "AI が確認中", "結果は、ふつう数分で届きます。ここと Web の通知に出ます。"],
    [
      "instructor-pending",
      "管理者の確認待ち",
      "管理者が確認しています。結果は、ここと Web の通知に出ます。",
    ],
  ] as const)("%s はレビューの段と結果・更新のリンクを出す", (taskStatus, label, body) => {
    const input = guide({ taskStatus, lastRun: { outcome: "passed", steps: [] } });
    const html = buildTaskGuideHtml(input);
    expect(html).toContain(
      '<li class="done">提出</li><li class="now" aria-current="step">レビュー</li>',
    );
    expect(html).toContain(`<div class="now-card review"><p class="now-title">… ${label}</p>`);
    expect(html).toContain(body);
    expect(html).toContain("レビューの結果を見る");
    expect(html).toContain("表示を更新する");
    expect(commandArgs(html, "stella.showTaskHelp")).toEqual([[input.root], [input.root]]);
    expect(commandArgs(html, "stella.showTaskReadme")).toEqual([[input.root]]);
    expect(commandArgs(html, "stella.submitTask")).toEqual([]);
  });

  it.each([undefined, "passed"] as const)("再提出で前回が %s のときは修正を案内する", (outcome) => {
    const input = guide({
      taskStatus: "resubmit",
      ...(outcome ? { lastRun: { outcome, steps: [] } } : {}),
    });
    const html = buildTaskGuideHtml(input);
    expect(html).toContain('<li class="now" aria-current="step">編集して保存</li>');
    expect(html).toContain(
      '<div class="now-card failed"><p class="now-title">✗ 再提出になりました</p>',
    );
    expect(html).toContain("レビューの結果を見て直し、保存してもう一度提出します。");
    const actions = /<p class="actions">(.*?)<\/p>/.exec(html)?.[1] ?? "";
    expect(commandArgs(actions, "stella.submitTask")).toEqual([[input.root]]);
    expect(commandArgs(actions, "stella.showTaskHelp")).toEqual([[input.root]]);
    expect(commandArgs(actions, "stella.consultTask")).toEqual([[input.root]]);
  });

  it.each([
    ["resubmit", "failed"],
    ["resubmit", "error"],
    ["not-started", "failed"],
    ["local-passed", "passed"],
  ] as const)(
    "%s で前回が %s のときは手元の結果だけの場合と同じ表示になる",
    (taskStatus, outcome) => {
      const lastRun = { outcome, steps: [] };
      expect(buildTaskGuideHtml(guide({ taskStatus, lastRun }))).toBe(
        buildTaskGuideHtml(guide({ lastRun })),
      );
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
          { id: "q03-mod", title: "余り" },
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
    expect(html).toContain("提出 1 / 3 問");
    expect(html).toContain("ドリル 3 ・ 応用 0");
    expect(problemNow(input).kind).toBe("passed");
    expect(html).toContain("問2 は確認が通りましたが、まだ提出していません");
    expect(html).toContain('aria-label="3 問中 1 問を提出済み"');
    expect(html).toContain("提出済み");
    expect(html).not.toContain("手元で合格");
    expect(html).toContain('class="problem-status submitted">提出済み');
    expect(html).toContain('class="problem-status local-passed">未提出');
    expect(html).toContain('class="problem-status not-submitted">未提出');
    expect(html).toMatch(/<li class="current"[^>]*>.*<a [^>]*>引く<\/a>/);
    expect(html).toContain("提出する");
    expect(html).not.toContain("説明");
    expect(html).not.toContain("修正記録");
    expect(html).not.toContain("ファイルを編集して保存する");
    expect(html).not.toContain("command:stella.openWalkthrough");
    expect(commandArgs(html, "stella.openTaskFile")).toEqual([
      [input.root, "src/q01-add.ts"],
      [input.root, "src/q02-sub.ts"],
      [input.root, "src/q03-mod.ts"],
    ]);
    expect(commandArgs(html, "stella.submitTask")).toEqual([[input.root, "q02-sub"]]);
    expect(commandArgs(html, "stella.consultTask")).toEqual([[input.root, "q02-sub"]]);
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
    expect(problemNow(input).kind).toBe("edit");
    const html = buildTaskGuideHtml(input);
    expect(html).toContain('<h2 class="now-title">問1 &lt;足す&gt;</h2>');
    expect(html).toContain(
      "<code>src/&lt;q01-add&gt;.ts</code></a> に書いて保存したら、確認して提出します。",
    );
    expect(html).not.toMatch(/<足す>|<q01-add>/);
    expect(commandArgs(html, "stella.openTaskFile")).toEqual([
      [input.root, item.source],
      [input.root, item.source],
    ]);

    const completed = buildTaskGuideHtml(
      guide({ manifest, problems: [{ ...item, status: "submitted" }] }),
    );
    expect(completed).toContain('<h2 class="now-title">全部の問題を提出しました</h2>');
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

it("段階がある課題の進め方は全問を出し、ロック中は鍵と理由を付ける", () => {
  const manifest: TaskManifest = {
    ...nodeManifest,
    problemSteps: true,
    problems: [
      { id: "q01", title: "最初の問題" },
      { id: "q02", title: "まだ解けない題" },
    ],
  };
  const shared = guide({ manifest, problemProgress: { passed: 0, total: 2 } });
  const lockReason = "「変数と定数」を終えると解けます";
  const html = buildTaskGuideHtml({
    ...shared,
    problems: [
      { id: "q01", title: "最初の問題", source: "src/q01.ts", status: "not-submitted" },
      {
        id: "q02",
        title: "まだ解けない題",
        source: "src/q02.ts",
        status: "not-submitted",
        lockReason,
        onDisk: true,
      },
    ],
  });
  expect(html).toContain("最初の問題");
  expect(html).toContain("まだ解けない題");
  expect(html).toContain(`🔒 ${lockReason}`);
  expect(html).toContain("src/q02.ts");
  expect(commandArgs(html, "stella.submitTask")).toEqual([[shared.root, "q01"]]);
  expect(html).toContain('aria-label="2 問中 0 問を提出済み"');
});

it("段階がある課題は未解放も数え、次の動画と手がかりを案内する", () => {
  const manifest: TaskManifest = {
    ...nodeManifest,
    problemSteps: true,
    problems: [
      { id: "q01", title: "最初の問題" },
      { id: "q02", title: "次の問題" },
      { id: "q03", title: "その次の問題" },
      { id: "extra", title: "最後の応用問題" },
      { id: "more", title: "前の問題が必要" },
    ],
  };
  const video = {
    lessonId: "video-id",
    stageId: "stage-id",
    title: "変数と定数",
    lessonType: "slides",
    accessible: true,
    completed: false,
    auto: true as const,
  };
  const notes = {
    lessonId: "notes-id",
    stageId: "other-stage",
    stageTitle: "<他のステージ>",
    title: "<まとめ>",
    lessonType: "text",
    accessible: false,
    completed: false,
  };
  const problemResults: NonNullable<TaskGuideInput["problemResults"]> = {
    gated: true,
    refs: [{ ...video, completed: true }],
    passedProblems: 1,
    totalProblems: 5,
    taskPassed: false,
    problems:
      manifest.problems?.map(({ id, title }, index) => ({
        id,
        title,
        firstPassedAt: null,
        status: index === 0 ? "passed" : "not-submitted",
        state: index === 0 ? "submitted" : index === 4 ? "locked-previous" : "locked-video",
        afterTitle: video.title,
        afterLessonId: video.lessonId,
        refs: [video, notes],
      })) ?? [],
  };
  const shared = guide({
    manifest,
    problemResults,
    problems: [{ id: "q01", title: "最初の問題", source: "src/q01.ts", status: "submitted" }],
  });
  const items = guideProblems(shared);
  const now = problemNow(shared);
  expect(now.kind).toBe("video");
  expect(problemCellGroups(items, now)).toMatchObject({
    drills: [{ style: "submitted" }, { style: "locked" }, { style: "locked" }, { style: "locked" }],
    advanced: [{ label: "応用", style: "locked" }],
  });
  expect(
    problemRows(items).map((row) => (row.lock ? [row.lock, row.items.length] : row.item.id)),
  ).toEqual(["q01", ["locked-video", 3], ["locked-previous", 1]]);
  expect(problemRefText(notes)).toEqual({
    title: "まとめ『<まとめ>』",
    suffix: "（『<他のステージ>』を受講すると見られます）",
  });
  expect(problemRefText(video).title).toBe("動画『変数と定数』");
  expect(problemRefText({ ...video, lessonType: "video" }).title).toBe("動画『変数と定数』");
  const waiting = buildTaskGuideHtml(shared);
  expect(waiting).toContain("動画『変数と定数』を見る");
  expect(waiting).toContain("問2『次の問題』がここに出ます");
  expect(waiting).toContain("問2〜3・応用問題");
  expect(waiting).toContain("動画のあとに出る 3 問");
  expect(waiting).toContain("前の問題のあとに出る 1 問");
  expect(waiting).toContain("手がかり:");
  expect(waiting).toContain(">動画『変数と定数』</a>");
  expect(waiting).toContain(
    "まとめ『&lt;まとめ&gt;』（『&lt;他のステージ&gt;』を受講すると見られます）",
  );
  expect(waiting).toContain(" ✓");
  expect(waiting).not.toContain("全部の問題を提出しました");
  expect(commandArgs(waiting, "stella.openTaskWebPage")).toEqual([
    ["stage-id", "video-id"],
    ["stage-id", "video-id"],
    ["stage-id", "video-id"],
  ]);
  expect(commandArgs(waiting, "stella.openTaskFile")).toEqual([[shared.root, "src/q01.ts"]]);
  expect(commandArgs(waiting, "stella.submitTask")).toEqual([]);

  const { refs: _taskRefs, ...legacyResults } = problemResults;
  const legacyInput = {
    ...shared,
    stageId: video.stageId,
    problemResults: {
      ...legacyResults,
      problems: problemResults.problems.map(({ refs: _problemRefs, ...problem }) => problem),
    },
  };
  expect(problemNow(legacyInput).kind).toBe("video");
  const legacyHtml = buildTaskGuideHtml(legacyInput);
  expect(legacyHtml).toContain("動画『変数と定数』を見る");
  expect(legacyHtml).not.toContain("手がかり:");
  expect(commandArgs(legacyHtml, "stella.openTaskWebPage")).toEqual([["stage-id", "video-id"]]);
  const withoutStage = buildTaskGuideHtml({ ...legacyInput, stageId: undefined });
  expect(withoutStage).toContain("表示を更新する");
  expect(commandArgs(withoutStage, "stella.openTaskWebPage")).toEqual([]);

  const oldServer = buildTaskGuideHtml({
    ...shared,
    problemResults: undefined,
    problems: [{ id: "q01", title: "最初の問題", source: "src/q01.ts", status: "not-submitted" }],
  });
  expect(oldServer).toContain("最初の問題");
  expect(oldServer).not.toContain("その次の問題");
  expect(oldServer).not.toContain("src/q02.ts");
  expect(oldServer).not.toContain("手がかり:");
  expect(commandArgs(oldServer, "stella.submitTask")).toEqual([[shared.root, "q01"]]);
});

it("書き出していない問題にはリンクを出さず、ロックの理由だけを出す", () => {
  const manifest: TaskManifest = {
    ...nodeManifest,
    problemSteps: true,
    problems: [
      { id: "q01", title: "最初の問題" },
      { id: "q02", title: "次の問題" },
    ],
  };
  const reason = "「変数と定数」を終えると解けます";
  const locked = {
    id: "q02",
    title: "次の問題",
    source: "src/q02.ts",
    status: "not-submitted" as const,
    lockReason: reason,
  };
  const hidden = buildTaskGuideHtml(
    guide({
      manifest,
      problems: [
        { id: "q01", title: "最初の問題", source: "src/q01.ts", status: "submitted", onDisk: true },
        locked,
      ],
    }),
  );
  expect(hidden).toContain(reason);
  expect(hidden).not.toContain("src/q02.ts");
  expect(commandArgs(hidden, "stella.openTaskFile")).toEqual([[guide().root, "src/q01.ts"]]);

  const linked = buildTaskGuideHtml(
    guide({
      manifest,
      problems: [
        { id: "q01", title: "最初の問題", source: "src/q01.ts", status: "submitted", onDisk: true },
        { ...locked, onDisk: true },
      ],
    }),
  );
  expect(linked).toContain(reason);
  expect(commandArgs(linked, "stella.openTaskFile")).toEqual([
    [guide().root, "src/q01.ts"],
    [guide().root, "src/q02.ts"],
  ]);
});

it("失敗した確認のチップと指摘を表示し、テストと ESLint の行へ移動できる", () => {
  const manifest: TaskManifest = {
    ...nodeManifest,
    problems: [
      { id: "q01", title: "足す" },
      { id: "q02", title: "引く" },
    ],
  };
  const test = {
    name: "<合計>",
    status: "failed" as const,
    file: "tests/q01.test.ts",
    message: "expected 2 to be 3",
  };
  const detail = {
    durationMs: 10,
    summary: "<環境の詳細>",
  };
  const run: RunResult = {
    schemaVersion: 1,
    taskId: manifest.id,
    problemId: "q01",
    runner: manifest.runner,
    outcome: "failed",
    startedAt: "2026-11-24T00:00:00Z",
    durationMs: 60,
    platform: "linux",
    toolVersions: {},
    files: [],
    protected: [],
    manifestSha256: "a".repeat(64),
    steps: [
      {
        ...detail,
        id: "test",
        label: "テスト",
        status: "failed",
        tests: [test, { name: "空配列", status: "passed" }],
      },
      {
        ...detail,
        id: "lint",
        label: "ESLint",
        status: "failed",
        lint: [
          {
            file: "src/q01.ts",
            line: 8,
            column: 2,
            message: "<直す内容>",
            ruleId: "no-unused-vars",
            severity: "error",
          },
        ],
      },
      { ...detail, id: "typecheck", label: "型の確認", status: "passed" },
      { ...detail, id: "format", label: "整形", status: "passed" },
    ],
  };
  const input = guide({ manifest, problemRun: run, problemTestLines: new Map([[test, 4]]) });
  const now = problemNow(input);
  expect(now.kind).toBe("failed");
  expect(problemCellGroups(guideProblems(input), now).drills).toMatchObject([
    { style: "failed", text: "いまの問題・要確認" },
    { style: "pending" },
  ]);
  const html = buildTaskGuideHtml(input);
  expect(html).toContain("問1 に直すところがあります");
  expect(html).toContain("テスト 1 / 2");
  expect(html).toContain("書き方 1 件");
  expect(html).toContain("✓</b>型");
  expect(html).toContain("✓</b>整形");
  expect(html).toContain('<dt>期待</dt><dd class="expected">3');
  expect(html).toContain('<dt>実際</dt><dd class="actual">2');
  expect(html).toContain("&lt;合計&gt;");
  expect(html).toContain("&lt;直す内容&gt;");
  expect(html).toContain("no-unused-vars");
  expect(commandArgs(html, "stella.openProblemLocation")).toEqual([
    [input.root, "q01", "tests/q01.test.ts", 4],
    [input.root, "q01", "src/q01.ts", 8],
  ]);
  expect(commandArgs(html, "stella.submitTask")).toEqual([[input.root, "q01"]]);
  expect(html).toContain("もう一度 確認して提出");

  const errorInput = {
    ...input,
    problemRun: {
      ...run,
      outcome: "error",
      steps: [{ ...detail, id: "deps", label: "準備", status: "error" }],
    },
  } satisfies TaskGuideInput;
  expect(problemNow(errorInput).kind).toBe("error");
  const error = buildTaskGuideHtml(errorInput);
  expect(error).toContain("環境の問題で確認できませんでした");
  expect(error).toContain("&lt;環境の詳細&gt;");
  expect(commandArgs(error, "stella.submitTask")).toEqual([[input.root, "q01"]]);
});

it("全問提出後は課題の合格状態と、ステージが分かるときは Web へのボタンを出す", () => {
  const input = guide({
    manifest: { ...nodeManifest, problems: [{ id: "q01", title: "応用問題" }] },
    problems: [{ id: "q01", title: "応用問題", source: "src/q01.ts", status: "submitted" }],
    problemResults: { problems: [], totalProblems: 1, passedProblems: 1, taskPassed: true },
    stageId: "stage-1",
  });
  expect(problemNow(input).kind).toBe("done");
  const html = buildTaskGuideHtml(input);
  expect(html).toContain("この課題に合格しました");
  expect(html).toContain("Web で次の課題を選ぶ");
  expect(commandArgs(html, "stella.openTaskWebPage")).toEqual([["stage-1"]]);
  expect(commandArgs(html, "stella.submitTask")).toEqual([]);
  expect(buildTaskGuideHtml({ ...input, stageId: undefined })).not.toContain(
    "Web で次の課題を選ぶ",
  );
});
