import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { RunResult } from "@stella/shared/tasks/run-result";
import type { ExtensionContext } from "vscode";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface FakeItem {
  id: string;
  priority: number;
  name?: string;
  text: string;
  tooltip: string;
  command: { command: string; arguments: unknown[] } | string | undefined;
  visible: boolean;
  show: () => void;
  hide: () => void;
  dispose: () => void;
}

const state = vi.hoisted(() => ({
  folders: [] as string[],
  activeFile: undefined as string | undefined,
  items: [] as FakeItem[],
  editorListener: undefined as ((editor: unknown) => Promise<void>) | undefined,
  executeCommand: vi.fn(),
}));

const apiRequest = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock("./api.js", () => ({ apiRequest, apiSession: () => 1 }));

vi.mock("vscode", () => ({
  EventEmitter: class<T> {
    private listeners = new Set<(value: T) => void>();
    event = (listener: (value: T) => void) => {
      this.listeners.add(listener);
      return { dispose: () => this.listeners.delete(listener) };
    };
    fire(value: T) {
      for (const listener of this.listeners) {
        try {
          listener(value);
        } catch {
          // VS Code の EventEmitter はほかのリスナーへの通知を続ける。
        }
      }
    }
  },
  StatusBarAlignment: { Left: 1 },
  window: {
    get activeTextEditor() {
      return state.activeFile
        ? { document: { uri: { scheme: "file", fsPath: state.activeFile } } }
        : undefined;
    },
    createStatusBarItem: (id: string, _alignment: number, priority: number) => {
      const item: FakeItem = {
        id,
        priority,
        text: "",
        tooltip: "",
        command: undefined,
        visible: false,
        show: () => {
          item.visible = true;
        },
        hide: () => {
          item.visible = false;
        },
        dispose: () => undefined,
      };
      state.items.push(item);
      return item;
    },
    onDidChangeActiveTextEditor: (listener: (editor: unknown) => Promise<void>) => {
      state.editorListener = listener;
      return { dispose: () => undefined };
    },
  },
  workspace: {
    get workspaceFolders() {
      return state.folders.map((fsPath) => ({ uri: { fsPath } }));
    },
    onDidChangeWorkspaceFolders: () => ({ dispose: () => undefined }),
  },
  commands: { executeCommand: state.executeCommand },
}));

import { AuthStore } from "./auth.js";
import { loadTask } from "./runner/run-task.js";
import { finishTaskCheck, startTaskCheck } from "./task-run-events.js";
import { getTaskState, refreshTaskState, registerTaskState } from "./task-state.js";
import { registerTaskStatus, setCurrentTask } from "./task-status.js";

let workspace = "";
let root = "";
let context: ExtensionContext;
let auth: AuthStore;
const taskId = "course/unit/q01";

beforeEach(async () => {
  vi.clearAllMocks();
  apiRequest.mockResolvedValue({});
  state.items = [];
  workspace = await mkdtemp(path.join(tmpdir(), "stella-status-"));
  root = path.join(workspace, "course", "unit", "q01");
  await mkdir(path.join(root, ".stella"), { recursive: true });
  await writeFile(
    path.join(root, ".stella", "task.json"),
    JSON.stringify({
      schemaVersion: 1,
      id: "course/unit/q01",
      title: "最初のページを作る",
      kind: "basic",
      runner: "static-preview",
      submit: { files: ["index.html"] },
      static: { checks: [{ type: "html-document", path: "index.html" }] },
    }),
  );
  await writeFile(path.join(root, "index.html"), "");
  await writeFile(path.join(workspace, "memo.txt"), "");
  state.folders = [workspace];
  state.activeFile = undefined;
  context = { subscriptions: [] } as unknown as ExtensionContext;
  let token: string | undefined = "token";
  auth = new AuthStore({
    get: async (key: string) => (key === "stella.accessToken" ? token : undefined),
    store: async (_key: string, value: string) => {
      token = value;
    },
    delete: async (key: string) => {
      if (key === "stella.accessToken") token = undefined;
    },
  } as never);
  registerTaskState(context, auth);
});
afterEach(async () => {
  for (const item of context.subscriptions) item.dispose();
  await rm(workspace, { recursive: true, force: true });
});

const editor = (file: string | undefined) =>
  file ? { document: { uri: { scheme: "file", fsPath: file } } } : undefined;
const inTask = () => state.executeCommand.mock.calls.at(-1);

describe("ステータスバーの課題のボタン", () => {
  it("課題フォルダーのファイルを開くと「提出する」「課題文」を出し、課題フォルダーを渡す", async () => {
    state.activeFile = path.join(root, "index.html");
    registerTaskStatus(context);
    await state.editorListener?.(editor(state.activeFile));
    const [run, readme] = state.items;
    expect(run?.visible).toBe(true);
    expect(run?.text).toBe("$(cloud-upload) 提出する");
    expect(run?.tooltip).toContain("最初のページを作る");
    expect(run?.command).toMatchObject({ command: "stella.submitTask", arguments: [root] });
    expect(readme?.command).toMatchObject({
      command: "stella.showTaskReadme",
      arguments: [root],
    });
    expect(inTask()).toEqual(["setContext", "stella.inTask", true]);
    expect(state.items[2]?.visible).toBe(false);
  });

  it("問題つきの課題は提出済みの件数を出す", async () => {
    const problemRoot = path.join(workspace, "extra", "unit", "calc");
    await mkdir(path.join(problemRoot, ".stella"), { recursive: true });
    await writeFile(
      path.join(problemRoot, ".stella", "task.json"),
      JSON.stringify({
        schemaVersion: 1,
        id: "extra/unit/calc",
        title: "計算",
        kind: "basic",
        runner: "node-test",
        problems: [
          { id: "q01-add", title: "足す" },
          { id: "q02-sub", title: "引く" },
        ],
        submit: { files: ["src/**/*.ts"] },
        protected: [],
        checks: { lint: false, format: false },
      }),
    );
    await mkdir(path.join(problemRoot, "src"), { recursive: true });
    await writeFile(path.join(problemRoot, "src", "q01-add.ts"), "export const add = 1;\n");
    apiRequest.mockResolvedValue({
      problems: [
        {
          id: "q01-add",
          title: "足す",
          status: "passed",
          firstPassedAt: "2026-11-01T00:00:00.000Z",
        },
        { id: "q02-sub", title: "引く", status: "not-submitted", firstPassedAt: null },
      ],
      passedProblems: 1,
      totalProblems: 2,
      taskPassed: false,
    });
    state.activeFile = path.join(problemRoot, "src", "q01-add.ts");
    registerTaskStatus(context);
    await state.editorListener?.(editor(state.activeFile));
    expect(state.items[2]?.visible).toBe(true);
    expect(state.items[2]?.text).toBe("1/2 問");
    startTaskCheck({ root: problemRoot, taskId: "extra/unit/calc", problemId: "q01-add" });
    expect(stateItem()?.visible).toBe(false);
    expect(submitItem()?.visible).toBe(true);
  });

  it("パネルに移っても出したままにし、課題の外のファイルに移ったら隠す", async () => {
    registerTaskStatus(context);
    await state.editorListener?.(editor(path.join(root, "index.html")));
    await state.editorListener?.(undefined);
    expect(state.items[0]?.visible).toBe(true);
    await state.editorListener?.(editor(path.join(workspace, "memo.txt")));
    expect(state.items.every((item) => !item.visible)).toBe(true);
    expect(inTask()).toEqual(["setContext", "stella.inTask", false]);
  });

  it("ワークスペースの外のファイルからは課題を探さない", async () => {
    const outside = await mkdtemp(path.join(tmpdir(), "stella-outside-"));
    try {
      await mkdir(path.join(outside, ".stella"));
      await writeFile(path.join(outside, ".stella", "task.json"), "{}");
      registerTaskStatus(context);
      await state.editorListener?.(editor(path.join(outside, "index.html")));
      expect(state.items.every((item) => !item.visible)).toBe(true);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("課題文のパネルを開いたときは、知らされた課題を出す", () => {
    registerTaskStatus(context);
    setCurrentTask({ root, title: "最初のページを作る" });
    expect(state.items[0]?.visible).toBe(true);
    expect(state.items[0]?.command).toMatchObject({ arguments: [root] });
  });
});

const stateItem = () => state.items.find(({ id }) => id === "stella.taskState");
const submitItem = () => state.items.find(({ id }) => id === "stella.submitTask");

function result(outcome: RunResult["outcome"], passed?: number): RunResult {
  return {
    schemaVersion: 1,
    taskId,
    runner: "static-preview",
    outcome,
    startedAt: "2026-11-01T00:00:00.000Z",
    durationMs: 10,
    platform: "linux",
    toolVersions: {},
    steps: [
      {
        id: "test",
        label: "テスト",
        status: outcome === "cancelled" ? "skipped" : outcome,
        summary: "テスト結果",
        durationMs: 8,
        ...(passed === undefined
          ? {}
          : {
              tests: [
                ...Array.from({ length: 7 }, (_, i) => ({
                  name: `test ${i}`,
                  status: i < passed ? ("passed" as const) : ("failed" as const),
                })),
                { name: "skipped test", status: "skipped" as const },
              ],
            }),
      },
    ],
    files: [],
    protected: [],
    manifestSha256: "ab".repeat(32),
  };
}

async function saveResult(run: RunResult): Promise<void> {
  await writeFile(path.join(root, ".stella", "last-run.json"), JSON.stringify(run));
}

async function distribute(): Promise<void> {
  await writeFile(
    path.join(root, ".stella", "distribution.json"),
    JSON.stringify({
      taskId,
      contentHash: "ab".repeat(32),
    }),
  );
}

async function openTaskEditor(): Promise<void> {
  await state.editorListener?.(editor(path.join(root, "index.html")));
}

describe("ステータスバーの課題の状態", () => {
  it("未確認なら状態は隠し、状態の項目は「提出する」の左に置く", async () => {
    registerTaskStatus(context);
    await openTaskEditor();
    expect(stateItem()).toMatchObject({ name: "STELLA: 課題の状態", visible: false });
    const submit = submitItem();
    expect(submit).toBeDefined();
    if (submit) expect(stateItem()?.priority).toBeGreaterThan(submit.priority);
    expect(submitItem()?.visible).toBe(true);
  });

  it.each([
    ["failed", 1, "$(error) 直すところ 1/7", "テスト 7 件中 1 件が通りました"],
    ["failed", undefined, "$(error) 直すところ", "直すところがあります"],
    ["error", 1, "$(warning) 環境の問題", "環境の問題で確認できませんでした"],
    ["passed", 7, "$(pass) 確認済み 7/7", "テスト 7 件中 7 件が通りました"],
    ["passed", undefined, "$(pass) 確認済み", "確認はすべて通りました"],
  ] as const)(
    "確認中から %s (%s) の保存済みの結果に変わる",
    async (outcome, passed, label, summary) => {
      const loaded = await loadTask(root);
      if (!loaded.ok) throw new Error("課題を読めません");
      registerTaskStatus(context);
      await openTaskEditor();
      startTaskCheck({ root: path.dirname(root), taskId });
      expect(stateItem()?.visible).toBe(false);
      startTaskCheck({ root, taskId });
      expect(stateItem()).toMatchObject({
        visible: true,
        text: "$(sync~spin) 確認中…",
        command: "stella.showRunLog",
      });
      expect(submitItem()?.visible).toBe(true);
      const run = result(outcome, passed);
      await saveResult(run);
      finishTaskCheck({ root, manifest: loaded.manifest, result: run, saved: true });
      await vi.waitFor(() =>
        expect(stateItem()).toMatchObject({
          visible: true,
          text: label,
          tooltip: `「最初のページを作る」の前回の確認: ${summary}`,
          command: { command: "stella.showLastResult", arguments: [root] },
        }),
      );
    },
  );

  it.each([
    ["passed", "failed", "$(pass-filled) 合格", false],
    ["ai-passed", "failed", "$(pass-filled) 合格", false],
    ["submitted", "failed", "$(clock) AI が確認中", false],
    ["instructor-pending", "failed", "$(clock) 講師の確認待ち", false],
    ["resubmit", undefined, "$(error) 再提出", true],
    ["resubmit", "passed", "$(error) 再提出", true],
    ["resubmit", "failed", "$(error) 直すところ 1/7", true],
    ["resubmit", "error", "$(warning) 環境の問題", true],
  ] as const)("%s と手元の %s の優先順位", async (status, outcome, label, submitVisible) => {
    await distribute();
    if (outcome) await saveResult(result(outcome, 1));
    apiRequest.mockResolvedValue({ status });
    registerTaskStatus(context);
    await openTaskEditor();
    const local = status === "resubmit" && (outcome === "failed" || outcome === "error");
    expect(stateItem()).toMatchObject({
      visible: true,
      text: label,
      tooltip: expect.stringContaining("最初のページを作る"),
      command: {
        command: local ? "stella.showLastResult" : "stella.showTaskHelp",
        arguments: [root],
      },
    });
    expect(submitItem()?.visible).toBe(submitVisible);
    startTaskCheck({ root, taskId });
    expect(stateItem()?.text).toBe("$(sync~spin) 確認中…");
    expect(submitItem()?.visible).toBe(submitVisible);
  });

  it("取得中も共有し、ファイルを変えても 30 秒までは問い合わせない", async () => {
    await distribute();
    const now = vi.spyOn(Date, "now").mockReturnValue(100_000);
    try {
      apiRequest.mockResolvedValue({ status: "submitted" });
      registerTaskStatus(context);
      await Promise.all([openTaskEditor(), refreshTaskState(root, taskId)]);
      expect(apiRequest).toHaveBeenCalledOnce();
      apiRequest.mockResolvedValue({ status: "passed" });
      now.mockReturnValue(129_999);
      await openTaskEditor();
      expect(apiRequest).toHaveBeenCalledOnce();
      expect(stateItem()?.text).toBe("$(clock) AI が確認中");
      now.mockReturnValue(130_000);
      await openTaskEditor();
      expect(apiRequest).toHaveBeenCalledTimes(2);
      expect(stateItem()?.text).toBe("$(pass-filled) 合格");
    } finally {
      now.mockRestore();
    }
  });

  it("接続が変わると表示と取得中の結果を捨て、次の接続で取り直す", async () => {
    await distribute();
    apiRequest.mockResolvedValue({ status: "submitted" });
    registerTaskStatus(context);
    await openTaskEditor();
    expect(stateItem()?.text).toBe("$(clock) AI が確認中");
    await auth.clear();
    expect(stateItem()?.visible).toBe(false);
    expect(submitItem()?.visible).toBe(true);
    await auth.setToken("second-token");
    await openTaskEditor();
    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(stateItem()?.text).toBe("$(clock) AI が確認中");
    let respond!: (response: { status: string }) => void;
    apiRequest.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          respond = resolve;
        }),
    );
    const pending = refreshTaskState(root, taskId, { forceLms: true });
    await vi.waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(3));
    await auth.clear();
    expect(stateItem()?.visible).toBe(false);
    expect(submitItem()?.visible).toBe(true);
    respond({ status: "passed" });
    await pending;
    expect(getTaskState(root, taskId)?.lmsStatus).toBeUndefined();
    expect(stateItem()?.visible).toBe(false);
  });
});
