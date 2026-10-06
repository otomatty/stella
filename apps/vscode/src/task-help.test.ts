import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TaskHelpResponse } from "@stella/shared/tasks/help";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => Promise<void> | void>(),
  folders: [] as string[],
  html: [] as string[],
  warningChoice: undefined as string | undefined,
  /** 拡張の接続が変わったときのリスナー (`onDidChangeAuth`)。 */
  authListeners: [] as (() => void)[],
  /** 作ったヘルプのパネル。閉じたかを見る。 */
  panels: [] as { disposed: boolean }[],
  /** 仮想ドキュメントの変更を知らせた URI。 */
  fired: [] as unknown[],
  /** 開いているドキュメント。 */
  documents: [] as { uri: unknown }[],
}));
const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  executeCommand: vi.fn(),
  showErrorMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showTextDocument: vi.fn(),
  openTextDocument: vi.fn(async (uri: unknown) => ({ uri })),
}));

vi.mock("vscode", () => ({
  EventEmitter: class {
    event = vi.fn();
    fire = vi.fn((uri: unknown) => {
      state.fired.push(uri);
    });
    dispose = vi.fn();
  },
  Uri: {
    from: (parts: { scheme: string; path: string; query?: string }) => ({
      ...parts,
      query: parts.query ?? "",
      toString: () => `${parts.scheme}:${parts.path}${parts.query ? `?${parts.query}` : ""}`,
    }),
    file: (fsPath: string) => ({ scheme: "file", fsPath }),
  },
  ViewColumn: { Beside: 2 },
  window: {
    get activeTextEditor() {
      return undefined;
    },
    createWebviewPanel: () => {
      const onDispose: (() => void)[] = [];
      const record = { disposed: false };
      state.panels.push(record);
      const panel = {
        title: "",
        reveal: vi.fn(),
        onDidDispose: (listener: () => void) => {
          onDispose.push(listener);
          return { dispose: vi.fn() };
        },
        dispose: () => {
          record.disposed = true;
          for (const listener of onDispose) listener();
        },
        webview: {
          set html(value: string) {
            state.html.push(value);
          },
        },
      };
      return panel;
    },
    showErrorMessage: mocks.showErrorMessage,
    showInformationMessage: vi.fn(),
    showWarningMessage: (...args: unknown[]) => {
      mocks.showWarningMessage(...args);
      return Promise.resolve(state.warningChoice);
    },
    showTextDocument: mocks.showTextDocument,
  },
  workspace: {
    get workspaceFolders() {
      return state.folders.map((fsPath) => ({ uri: { fsPath } }));
    },
    get textDocuments() {
      return state.documents;
    },
    openTextDocument: mocks.openTextDocument,
    registerTextDocumentContentProvider: () => ({ dispose: vi.fn() }),
  },
  commands: {
    registerCommand: (id: string, handler: (...args: unknown[]) => Promise<void> | void) => {
      state.handlers.set(id, handler);
      return { dispose: vi.fn() };
    },
    executeCommand: mocks.executeCommand,
  },
}));
vi.mock("./api.js", () => ({ apiRequest: mocks.apiRequest }));
vi.mock("./auth.js", () => ({
  onDidChangeAuth: (listener: () => void) => {
    state.authListeners.push(listener);
    return { dispose: vi.fn() };
  },
}));

const { buildTaskHelpHtml, registerTaskHelp, solutionContent } = await import("./task-help.js");

const TASK_ID = "dev-env-basics/m0-first-page/q01-first-page";
/** 配布記録 (`.stella/distribution.json`) の版。 */
const HASH = "a".repeat(64);
const encode = (text: string) => Buffer.from(text).toString("base64");

function help(overrides: Partial<TaskHelpResponse> = {}): TaskHelpResponse {
  return {
    taskId: TASK_ID,
    title: "最初のページを作る",
    kind: "basic",
    status: "local-passed",
    phase: "working",
    referencesOnly: false,
    notice: null,
    attempts: null,
    hints: [
      { level: 1, state: "available" },
      { level: 2, state: "locked", reason: "previous-hint" },
    ],
    solution: { state: "locked", reason: "hints-first" },
    explanation: { state: "locked", reason: "passed" },
    autoOpen: [],
    latestSubmission: null,
    ...overrides,
  };
}

describe("buildTaskHelpHtml", () => {
  it("開ける段だけをリンクにし、開けない理由を出す。スクリプトは許さない", () => {
    const html = buildTaskHelpHtml({ help: help(), root: "/work/q01" });
    expect(html).toContain("default-src 'none'");
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain(
      `command:stella.openTaskHelpItem?${encodeURIComponent(JSON.stringify(["/work/q01", "hint", 1]))}`,
    );
    expect(html).not.toContain(encodeURIComponent(JSON.stringify(["/work/q01", "hint", 2])));
    expect(html).toContain("前の段のヒントを開くと開けます");
    expect(html).toContain("ヒントを最後まで開くと開けます");
    expect(html).toContain("合格後に開けます");
    expect(html).toContain("支援の記録に残ります");
    expect(html).toContain("まだ提出していません");
  });

  it("開いた段の本文を描き、本文の HTML とリンクは実行させない", () => {
    const html = buildTaskHelpHtml({
      help: help({
        hints: [
          {
            level: 1,
            state: "opened",
            title: "<b>方針</b>",
            markdown:
              "<script>alert(1)</script> [x](command:stella.submitTask) [mdn](https://developer.mozilla.org/)",
          },
          { level: 2, state: "available" },
        ],
      }),
      root: "/work/q01",
    });
    expect(html).not.toContain("<script>alert(1)");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;b&gt;方針&lt;/b&gt;");
    expect(html).not.toContain('href="command:stella.submitTask');
    expect(html).toContain('href="https://developer.mozilla.org/"');
  });

  it("開いた解答例は自分のコードと並べるリンクを付け、コードは文字として出す", () => {
    const html = buildTaskHelpHtml({
      help: help({
        phase: "passed",
        status: "passed",
        solution: {
          state: "opened",
          files: [{ path: "index.html", content: encode("<h1>はじめてのページ</h1>") }],
        },
        explanation: { state: "opened", markdown: "# 解説\n見出しを変えます。" },
      }),
      root: "/work/q01",
    });
    expect(html).toContain("&lt;h1&gt;はじめてのページ&lt;/h1&gt;");
    expect(html).toContain(
      `command:stella.compareTaskSolution?${encodeURIComponent(JSON.stringify(["/work/q01", "index.html"]))}`,
    );
    expect(html).toContain("見出しを変えます。");
    expect(html).toContain("学習フォルダーには書き出しません");
  });

  it("挑戦の回数で開く課題は、回数を出す", () => {
    const html = buildTaskHelpHtml({
      help: help({
        kind: "independent",
        solution: { state: "locked", reason: "attempts" },
        attempts: { count: 2, required: 5 },
      }),
      root: "/work/q01",
    });
    expect(html).toContain("挑戦 2 / 5 回");
  });

  it("取り組み中の確認A・Bはヒントと解答の欄を出さず、案内と参照元だけにする", () => {
    const html = buildTaskHelpHtml({
      help: help({
        kind: "assessment-a",
        referencesOnly: true,
        notice: "確認Aでは、公式ドキュメントと文法の参照だけを使います。",
        hints: [],
        solution: { state: "locked", reason: "passed" },
        explanation: { state: "locked", reason: "not-offered" },
      }),
      manifest: {
        schemaVersion: 1,
        id: TASK_ID,
        title: "確認",
        kind: "assessment-a",
        runner: "static-preview",
        submit: { files: ["index.html"] },
        protected: [],
        checks: { lint: false, format: false },
        references: [
          {
            id: "SRC-mdn",
            title: "HTML 要素リファレンス",
            url: "https://developer.mozilla.org/ja/docs/Web/HTML/Element",
            publisher: "MDN",
            section: "h1",
            usedFor: "見出しの要素",
            documentVersion: "2026-10",
            checkedAt: "2026-10-05",
            environmentRef: "static-web-01",
            authorship: "external",
            reuse: "link-only",
          } as never,
        ],
      },
      root: "/work/q01",
    });
    expect(html).toContain("公式ドキュメントと文法の参照だけ");
    expect(html).toContain("HTML 要素リファレンス");
    expect(html).not.toContain("<h2>ヒント</h2>");
    expect(html).not.toContain("<h2>解答例</h2>");
    expect(html).not.toContain("<h2>解説</h2>");
    expect(html).not.toContain("stella.openTaskHelpItem");
    expect(html).not.toContain("支援の記録に残ります");
  });

  it("レビューの結果は判定・総評・採用した指摘・AI の所見を文字として出す", () => {
    const html = buildTaskHelpHtml({
      help: help({ status: "resubmit", latestSubmission: { id: "s1", attempt: 2 } }),
      root: "/work/q01",
      review: {
        attempt: 2,
        submitted_at: "2026-10-05T00:00:00Z",
        verdict: "resubmit",
        review_notes: "<i>見出しを確認</i>",
        ai_suggestions: [
          { line: 3, body: "h1 は 1 つに", adopted: true },
          { line: 4, body: "採用しなかった指摘", adopted: false },
        ],
        ai_feedback: {
          message: "よくできています",
          goodPoints: ["保存した"],
          nextSteps: ["見出しを確かめる"],
          findings: [
            { file: "index.html", startLine: 1, endLine: 2, severity: "minor", comment: "<x>" },
          ],
        },
      },
    });
    expect(html).toContain("2 回目の提出: 再提出");
    expect(html).toContain("&lt;i&gt;見出しを確認&lt;/i&gt;");
    expect(html).toContain("3 行目: h1 は 1 つに");
    expect(html).not.toContain("採用しなかった指摘");
    expect(html).toContain("index.html:1-2");
    expect(html).toContain("&lt;x&gt;");
  });
});

describe("課題パネルのコマンド", () => {
  let root: string;
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.apiRequest.mockReset();
    state.handlers.clear();
    state.html = [];
    state.authListeners = [];
    state.fired = [];
    state.documents = [];
    state.warningChoice = undefined;
    root = await mkdtemp(path.join(tmpdir(), "stella-help-"));
    await mkdir(path.join(root, ".stella"), { recursive: true });
    await writeFile(
      path.join(root, ".stella", "task.json"),
      JSON.stringify({
        schemaVersion: 1,
        id: TASK_ID,
        title: "最初のページを作る",
        kind: "basic",
        runner: "static-preview",
        submit: { files: ["index.html"] },
        static: { checks: [{ type: "html-document", path: "index.html" }] },
      }),
    );
    await writeFile(
      path.join(root, ".stella", "distribution.json"),
      JSON.stringify({ taskId: TASK_ID, contentHash: HASH }),
    );
    await writeFile(path.join(root, "index.html"), "<h1>ここを変更します</h1>");
    state.folders = [root];
    registerTaskHelp({ subscriptions: [] } as never);
  });
  const run = (id: string, ...args: unknown[]) => state.handlers.get(id)?.(...args);

  it("合格後に自動で開く素材は、まだ開いていなければ開いてから描く", async () => {
    const opened = help({
      phase: "passed",
      status: "passed",
      solution: { state: "opened", files: [{ path: "index.html", content: encode("<h1>A</h1>") }] },
      explanation: { state: "opened", markdown: "解説" },
    });
    mocks.apiRequest
      .mockResolvedValueOnce(
        help({
          phase: "passed",
          status: "passed",
          solution: { state: "available" },
          explanation: { state: "available" },
          autoOpen: ["solution", "explanation"],
        }),
      )
      .mockResolvedValueOnce(help({ ...opened, explanation: { state: "available" } }))
      .mockResolvedValue(opened);
    await run("stella.showTaskHelp", root);
    expect(mocks.showErrorMessage).not.toHaveBeenCalled();
    // 配布記録の版 (手元の版) を付けて問い合わせ、その版の素材を受け取る。
    expect(mocks.apiRequest.mock.calls.map((c) => c[0])).toEqual([
      `/api/tasks/help?${new URLSearchParams({ taskId: TASK_ID, contentHash: HASH })}`,
      "/api/tasks/help/open",
      "/api/tasks/help/open",
    ]);
    expect(mocks.apiRequest.mock.calls[1][1]).toMatchObject({
      method: "POST",
      body: { taskId: TASK_ID, item: "solution", contentHash: HASH },
    });
    expect(state.html.at(-1)).toContain("&lt;h1&gt;A&lt;/h1&gt;");

    await run("stella.compareTaskSolution", root, "index.html");
    expect(mocks.executeCommand).toHaveBeenCalledWith(
      "vscode.diff",
      expect.objectContaining({ scheme: "stella-solution" }),
      expect.objectContaining({ fsPath: path.join(root, "index.html") }),
      "index.html: 解答例 ↔ 自分のコード",
      { preview: true },
    );
    // 解答例は仮想ドキュメントにだけ置き、開くたびにサーバーで今の受講者の記録を確かめる。
    const left = mocks.executeCommand.mock.calls[0][1] as { path: string; query: string };
    mocks.apiRequest.mockClear();
    expect(await solutionContent(left)).toBe("<h1>A</h1>");
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/api/tasks/help?${new URLSearchParams({ taskId: TASK_ID, contentHash: HASH })}`,
    );
  });

  it("接続が変わったら、ヘルプのパネル・解答例の控え・開いている解答例の中身が残らない", async () => {
    const opened = help({
      phase: "passed",
      status: "passed",
      solution: {
        state: "opened",
        files: [{ path: "index.html", content: encode("<h1>SECRET_57</h1>") }],
      },
      explanation: { state: "opened", markdown: "解説" },
    });
    mocks.apiRequest.mockResolvedValue(opened);
    await run("stella.showTaskHelp", root);
    await run("stella.compareTaskSolution", root, "index.html");
    const diff = mocks.executeCommand.mock.calls.find((call) => call[0] === "vscode.diff");
    const left = diff?.[1] as { scheme: string; path: string; query: string };
    expect(left.scheme).toBe("stella-solution");
    state.documents = [{ uri: left }];
    expect(await solutionContent(left)).toBe("<h1>SECRET_57</h1>");
    expect(state.panels.some((panel) => !panel.disposed)).toBe(true);

    // 別の受講者が接続する。この受講者はまだ解答例を開いていない (サーバーは本文を返さない)。
    mocks.apiRequest.mockReset();
    mocks.apiRequest.mockResolvedValue(
      help({ phase: "passed", status: "passed", solution: { state: "available" } }),
    );
    expect(state.authListeners.length).toBeGreaterThan(0);
    for (const listener of state.authListeners) listener();

    expect(state.panels.every((panel) => panel.disposed)).toBe(true);
    expect(state.fired).toContainEqual(left);
    const after = await solutionContent(left);
    expect(after).not.toContain("SECRET_57");
    // 控えから比べられない (サーバーで開いた記録がない)。
    mocks.executeCommand.mockClear();
    await run("stella.compareTaskSolution", root, "index.html");
    expect(mocks.executeCommand).not.toHaveBeenCalled();
  });

  it("合格前の解答例は確かめてから開き、やめたら開かない", async () => {
    mocks.apiRequest.mockResolvedValue(help({ solution: { state: "available" } }));
    await run("stella.openTaskHelpItem", root, "solution");
    expect(mocks.showWarningMessage).toHaveBeenCalledWith(
      "解答例を開きますか",
      expect.objectContaining({ modal: true }),
      "解答例を開く",
    );
    expect(mocks.apiRequest).toHaveBeenCalledTimes(1);
    state.warningChoice = "解答例を開く";
    await run("stella.openTaskHelpItem", root, "solution");
    expect(mocks.apiRequest).toHaveBeenLastCalledWith("/api/tasks/help/open", {
      method: "POST",
      body: { taskId: TASK_ID, item: "solution", contentHash: HASH },
    });
  });

  it("ヒントは段を付けて開く", async () => {
    mocks.apiRequest.mockResolvedValue(help());
    await run("stella.openTaskHelpItem", root, "hint", 1);
    expect(mocks.showWarningMessage).not.toHaveBeenCalled();
    expect(mocks.apiRequest).toHaveBeenCalledWith("/api/tasks/help/open", {
      method: "POST",
      body: { taskId: TASK_ID, item: "hint", level: 1, contentHash: HASH },
    });
  });

  it.each([
    ["予備の類題", ["variants"]],
    ["レビューの観点", ["review"]],
    ["段の無いヒント", ["hint"]],
    ["段が数でないヒント", ["hint", "1"]],
  ])("%s は開かない", async (_label, args) => {
    await run("stella.openTaskHelpItem", root, ...args);
    expect(mocks.apiRequest).not.toHaveBeenCalled();
    expect(mocks.showErrorMessage).toHaveBeenCalled();
  });

  it("ワークスペースの外・配布記録の無い課題フォルダーは受け付けない", async () => {
    await run("stella.showTaskHelp", path.join(tmpdir(), "elsewhere"));
    expect(mocks.showErrorMessage).toHaveBeenLastCalledWith(
      expect.stringContaining("ワークスペースの中の課題フォルダー"),
    );
    await writeFile(path.join(root, ".stella", "distribution.json"), "");
    await run("stella.showTaskHelp", root);
    expect(mocks.apiRequest).not.toHaveBeenCalled();
  });

  it("開いていない解答例・課題の外を指すパスは比べない", async () => {
    for (const rel of ["../secret.txt", "other.html", "*.html"]) {
      await run("stella.compareTaskSolution", root, rel);
      expect(mocks.executeCommand).not.toHaveBeenCalled();
    }
    expect(mocks.showErrorMessage).toHaveBeenCalledTimes(3);
  });
});
