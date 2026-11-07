import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TaskManifest } from "@stella/shared/tasks/manifest";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  window: { createWebviewPanel: vi.fn() },
  ViewColumn: { Active: 1 },
}));

import {
  buildTaskGuideHtml,
  opensAsText,
  readLastOutcome,
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

describe("readLastOutcome", () => {
  it("この課題の前回の結果だけを読む", async () => {
    const run = {
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
    };
    const root = await makeRoot({ ".stella/last-run.json": JSON.stringify(run) });
    expect(await readLastOutcome(root, staticManifest.id)).toBe("passed");
    expect(await readLastOutcome(root, "other/task/id")).toBeUndefined();
    expect(await readLastOutcome(await makeRoot({}), staticManifest.id)).toBeUndefined();
    const broken = await makeRoot({ ".stella/last-run.json": "{" });
    expect(await readLastOutcome(broken, staticManifest.id)).toBeUndefined();
  });
});

describe("buildTaskGuideHtml", () => {
  it("課題文を読む → 編集して保存 → 確認 → 提出 の順に並べ、ボタンは課題フォルダーを渡す", () => {
    const input = guide();
    const html = buildTaskGuideHtml(input);
    const order = ["課題文を読む", "ファイルを編集して保存する", "手元で確認する", "提出する"].map(
      (title) => html.indexOf(title),
    );
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(commandArgs(html, "stella.openTaskFile")).toEqual([[input.root, "index.html"]]);
    expect(commandArgs(html, "stella.runTask")).toEqual([[input.root]]);
    expect(commandArgs(html, "stella.submitTask")).toEqual([[input.root]]);
    expect(commandArgs(html, "stella.consultTask")).toEqual([[input.root]]);
    expect(commandArgs(html, "stella.showTaskHelp")).toEqual([[input.root]]);
    expect(html).toContain('href="command:stella.showRunLog"');
    expect(html).toContain("ステータスバー");
    expect(html).not.toMatch(/<script/i);
  });

  it("前回の確認の結果から「いまここ」を決める", () => {
    const current = (html: string) =>
      /<li class="step current"><h3>([^<]+)/.exec(html)?.[1]?.trim();
    expect(current(buildTaskGuideHtml(guide()))).toBe("ファイルを編集して保存する");
    expect(buildTaskGuideHtml(guide())).toContain("まだ確認していません");
    expect(current(buildTaskGuideHtml(guide({ lastOutcome: "failed" })))).toBe(
      "ファイルを編集して保存する",
    );
    expect(current(buildTaskGuideHtml(guide({ lastOutcome: "error" })))).toBe("手元で確認する");
    const passed = buildTaskGuideHtml(guide({ lastOutcome: "passed" }));
    expect(current(passed)).toBe("提出する");
    expect(passed).toContain("提出できます");
    expect(passed.match(/いまここ/g)).toHaveLength(1);
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
    expect(node).toContain("テストを手元で実行します");
    expect(node).toContain("lintと整形の確認もします");
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
    expect(html).toContain("公開先の URL");
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
