import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
  dirtyFile: undefined as string | undefined,
  saveListener: undefined as
    | ((document: { uri: { scheme: string; fsPath: string } }) => void | Promise<void>)
    | undefined,
  focusListener: undefined as ((state: { focused: boolean }) => void) | undefined,
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
    onDidChangeWindowState: (listener: (event: { focused: boolean }) => void) => {
      state.focusListener = listener;
      return {
        dispose: () => {
          state.focusListener = undefined;
        },
      };
    },
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
    get textDocuments() {
      return state.dirtyFile
        ? [{ isDirty: true, uri: { scheme: "file", fsPath: state.dirtyFile } }]
        : [];
    },
    onDidSaveTextDocument: (listener: NonNullable<typeof state.saveListener>) => {
      state.saveListener = listener;
      return {
        dispose: () => {
          state.saveListener = undefined;
        },
      };
    },
    onDidChangeWorkspaceFolders: () => ({ dispose: () => undefined }),
  },
  commands: { executeCommand: state.executeCommand },
}));

import { AuthStore } from "./auth.js";
import { loadTask } from "./runner/run-task.js";
import { installTask } from "./task-distribution.js";
import type { TaskManifest } from "@stella/shared/tasks/manifest";
import {
  finishTaskCheck,
  progressTaskCheck,
  setTaskBusy,
  startTaskCheck,
} from "./task-run-events.js";
import {
  getTaskState,
  onDidChangeTaskState,
  refreshTaskState,
  registerTaskState,
} from "./task-state.js";
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
  state.dirtyFile = undefined;
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
  setTaskBusy(undefined);
  for (const item of context.subscriptions) item.dispose();
  await rm(workspace, { recursive: true, force: true });
});

const editor = (file: string | undefined) =>
  file ? { document: { uri: { scheme: "file", fsPath: file } } } : undefined;
const inTask = () => state.executeCommand.mock.calls.at(-1);

describe("ステータスバーの課題のボタン", () => {
  it("処理中は提出ボタンを押せなくする", () => {
    registerTaskStatus(context);
    setCurrentTask({ root, title: "最初のページを作る", taskId });
    setTaskBusy("check");
    expect(submitItem()).toMatchObject({
      visible: true,
      text: "$(sync~spin) 確認中…",
      tooltip: "いま処理しています。終わるまで待ってください",
      command: "stella.showRunLog",
    });
    setTaskBusy("diagnose");
    expect(submitItem()?.text).toBe("$(sync~spin) 開発環境を診断中…");
    setTaskBusy("submit");
    expect(submitItem()).toMatchObject({
      text: "$(sync~spin) 提出中…",
      command: undefined,
    });
    setTaskBusy(undefined);
    expect(submitItem()).toMatchObject({
      text: "$(cloud-upload) 提出する",
      command: { command: "stella.submitTask", arguments: [root] },
    });
  });

  it.each([
    ["linux", "Ctrl+Alt+Enter"],
    ["darwin", "⌘⌥Enter"],
  ])("%s では提出ボタンの tooltip に %s を表示する", (platform, shortcut) => {
    registerTaskStatus(context);
    const [submit] = state.items;
    vi.stubGlobal("process", Object.create(process, { platform: { value: platform } }));
    try {
      const task = { root, title: "最初のページを作る" };
      setCurrentTask(task);
      expect(submit?.tooltip).toBe(
        `「最初のページを作る」を確認して提出します。通らなければ何も送りません (${shortcut})`,
      );

      setCurrentTask({
        ...task,
        problemProgress: { passed: 0, total: 1 },
        currentProblem: { id: "q01", label: "問1" },
      });
      expect(submit?.tooltip).toBe(`問1を確認して提出します (${shortcut})`);
    } finally {
      vi.unstubAllGlobals();
    }
  });

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

  it("解ける問題が無い (すべてロック中) あいだは提出を隠し、解ける問題があれば『確認して提出』を出す。ウィンドウに戻ると件数を更新する", async () => {
    await writeFile(
      path.join(root, ".stella/task.json"),
      JSON.stringify({
        schemaVersion: 1,
        id: taskId,
        title: "計算",
        kind: "basic",
        runner: "node-test",
        problemSteps: true,
        problems: [
          { id: "q01", title: "問1" },
          { id: "q02", title: "問2" },
        ],
        submit: { files: ["src/**/*.ts"] },
        checks: { lint: false, format: false },
      }),
    );
    let watched = false;
    apiRequest.mockImplementation(async () => ({
      gated: true,
      passedProblems: watched ? 1 : 0,
      totalProblems: 2,
      taskPassed: false,
      problems: watched
        ? [
            { id: "q01", state: "submitted" },
            { id: "q02", state: "open" },
          ]
        : [
            { id: "q01", state: "locked-video" },
            { id: "q02", state: "locked-video" },
          ],
    }));
    state.activeFile = path.join(root, "index.html");
    registerTaskStatus(context);
    await state.editorListener?.(editor(state.activeFile));
    expect(state.items[0]?.visible).toBe(false);
    expect(state.items[1]?.visible).toBe(true);
    expect(stateItem()?.text).toBe("$(star) q01 ・ 提出 0/2");
    watched = true;
    state.focusListener?.({ focused: true });
    await vi.waitFor(() => {
      expect(state.items[0]?.visible).toBe(true);
      expect(state.items[0]?.text).toBe("$(play) 確認して提出");
      expect(stateItem()?.text).toBe("$(star) q01 問2 ・ 提出 1/2");
    });
    expect(state.items[0]?.command).toMatchObject({
      command: "stella.submitTask",
      arguments: [root, "q02"],
    });
  });

  it("古い deferred の書き出しが未保存で止まったら提出を隠し、保存すると出す", async () => {
    await rm(root, { recursive: true });
    const manifest: TaskManifest = {
      schemaVersion: 1,
      id: taskId,
      title: "計算",
      kind: "basic",
      runner: "node-test",
      problemSteps: true,
      problems: [{ id: "q01", title: "問1" }],
      submit: { files: ["src/**/*.ts"] },
      protected: ["tests/**"],
      checks: { lint: false, format: false },
    };
    const bundle = {
      manifest,
      contentHash: "a".repeat(64),
      files: Object.fromEntries(
        Object.entries({
          ".stella/task.json": JSON.stringify(manifest),
          "README.md": "問題文",
          "src/q01.ts": "starter",
          "tests/q01.test.ts": "test",
        }).map(([rel, data]) => [rel, Buffer.from(data).toString("base64")]),
      ),
    };
    const installed = await installTask(workspace, bundle);
    await rm(path.join(installed, "src/q01.ts"));
    await rm(path.join(installed, "tests/q01.test.ts"));
    const receipt = JSON.parse(
      await readFile(path.join(installed, ".stella/distribution.json"), "utf8"),
    ) as { files: Record<string, string> };
    delete receipt.files["src/q01.ts"];
    delete receipt.files["tests/q01.test.ts"];
    await writeFile(
      path.join(installed, ".stella/distribution.json"),
      JSON.stringify({
        ...receipt,
        deferred: { "src/q01.ts": null, "tests/q01.test.ts": null },
      }),
    );
    apiRequest.mockImplementation(async (...args: unknown[]) =>
      typeof args[0] === "string" && args[0].startsWith("/api/tasks/bundle")
        ? { bundle }
        : {
            gated: true,
            passedProblems: 0,
            totalProblems: 1,
            taskPassed: false,
            problems: [{ id: "q01", state: "open" }],
          },
    );
    state.activeFile = path.join(root, "README.md");
    state.dirtyFile = state.activeFile;
    registerTaskStatus(context);
    await state.editorListener?.(editor(state.activeFile));
    expect(state.items[0]?.visible).toBe(false);

    const requestCount = apiRequest.mock.calls.length;
    await state.saveListener?.({
      uri: { scheme: "file", fsPath: path.join(workspace, "memo.txt") },
    });
    expect(apiRequest).toHaveBeenCalledTimes(requestCount);
    state.dirtyFile = undefined;
    const saved = { uri: { scheme: "file", fsPath: state.activeFile } };
    await state.saveListener?.(saved);
    expect(apiRequest.mock.calls.length).toBeGreaterThan(requestCount);
    expect(state.items[0]?.visible).toBe(true);

    const preparedRequestCount = apiRequest.mock.calls.length;
    await state.saveListener?.(saved);
    expect(apiRequest).toHaveBeenCalledTimes(preparedRequestCount);
    expect(state.items[0]?.visible).toBe(true);
  });

  it("問題つきの課題は保存済みの結果の読み込みを知らせ、提出済みの件数を出す", async () => {
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
    const taskChanged = vi.fn();
    context.subscriptions.push(onDidChangeTaskState(taskChanged));
    registerTaskStatus(context);
    await state.editorListener?.(editor(state.activeFile));
    expect(taskChanged).toHaveBeenCalledExactlyOnceWith(problemRoot);
    expect(state.items[2]?.visible).toBe(true);
    expect(stateItem()?.text).toBe("$(star) calc 問2 ・ 提出 1/2");
    expect(stateItem()?.command).toMatchObject({
      command: "stella.showTaskReadme",
      arguments: [problemRoot],
    });
    expect(state.items[1]?.text).toBe("$(book) 課題");
    expect(submitItem()?.text).toBe("$(play) 確認して提出");
    expect(submitItem()?.command).toMatchObject({
      command: "stella.submitTask",
      arguments: [problemRoot, "q02-sub"],
    });
    expect(state.executeCommand).toHaveBeenCalledWith("setContext", "stella.problemTask", true);
    startTaskCheck({ root: problemRoot, taskId: "extra/unit/calc", problemId: "q01-add" });
    expect(stateItem()?.text).toBe("$(star) calc 問2 ・ 提出 1/2");
    expect(submitItem()?.visible).toBe(true);
  });

  async function problemFolder() {
    const problemRoot = path.join(workspace, "extra", "unit", "calc");
    await mkdir(path.join(problemRoot, ".stella"), { recursive: true });
    await mkdir(path.join(problemRoot, "src"), { recursive: true });
    await writeFile(
      path.join(problemRoot, ".stella", "task.json"),
      JSON.stringify({
        schemaVersion: 1,
        id: "extra/unit/calc",
        title: "計算",
        kind: "basic",
        runner: "node-test",
        problemSteps: true,
        problems: [{ id: "q01", title: "問1" }],
        submit: { files: ["src/**/*.ts"] },
        checks: { lint: false, format: false },
      }),
    );
    await writeFile(path.join(problemRoot, "src", "q01.ts"), "export const value = 1;\n");
    return problemRoot;
  }

  function openProblemResult() {
    return {
      gated: true,
      passedProblems: 0,
      totalProblems: 1,
      taskPassed: false,
      problems: [{ id: "q01", state: "open" }],
    };
  }

  it("課題の読み込み中に保存したら、状態を公開したあとで取り直す", async () => {
    const problemRoot = await problemFolder();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    let publishedAtSecond = "";
    apiRequest.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) await gate;
      else publishedAtSecond = stateItem()?.text ?? "";
      return openProblemResult();
    });
    registerTaskStatus(context);
    state.activeFile = path.join(problemRoot, "src", "q01.ts");
    const opening = state.editorListener?.(editor(state.activeFile));
    await vi.waitFor(() => expect(calls).toBe(1));
    await state.saveListener?.({
      uri: { scheme: "file", fsPath: path.join(problemRoot, "src", "q01.ts") },
    });
    release();
    await opening;
    expect(calls).toBe(2);
    expect(publishedAtSecond).toContain("提出");
  });

  it("読み込み中でも、課題の外の保存では問題の状態を取り直さない", async () => {
    const problemRoot = await problemFolder();
    let release: () => void = () => undefined;
    let started = false;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    apiRequest.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) {
        started = true;
        await gate;
      }
      return openProblemResult();
    });
    registerTaskStatus(context);
    state.activeFile = path.join(problemRoot, "src", "q01.ts");
    const opening = state.editorListener?.(editor(state.activeFile));
    await vi.waitFor(() => expect(started).toBe(true));
    await state.saveListener?.({
      uri: { scheme: "file", fsPath: path.join(workspace, "memo.txt") },
    });
    release();
    await opening;
    expect(calls).toBe(1);
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
  it.each([true, false])(
    "処理中でも実行中の手順の表示を優先する (問題つき: %s)",
    async (hasProblems) => {
      const loaded = await loadTask(root);
      if (!loaded.ok) throw new Error("課題を読めません");
      registerTaskStatus(context);
      setCurrentTask({
        root,
        title: "計算",
        ...(hasProblems
          ? {
              problemProgress: { passed: 0, total: 1 },
              currentProblem: { id: "q01", label: "問1" },
            }
          : {}),
      });
      startTaskCheck({ root, taskId });
      try {
        progressTaskCheck({ type: "plan", steps: [{ id: "test", label: "テスト" }] });
        progressTaskCheck({ type: "step-start", index: 0 });
        setTaskBusy("submit");
        expect(hasProblems ? submitItem() : stateItem()).toMatchObject({
          visible: true,
          text: "$(sync~spin) 確認中 1/1 テスト",
          command: "stella.showRunLog",
        });
        expect(submitItem()?.visible).toBe(hasProblems);
        expect(
          state.items.filter((item) => item.visible && item.text.startsWith("$(sync~spin) 確認中")),
        ).toHaveLength(1);
      } finally {
        finishTaskCheck({
          root,
          manifest: loaded.manifest,
          result: result("passed"),
          saved: false,
        });
      }
      expect(submitItem()).toMatchObject({
        visible: true,
        text: "$(sync~spin) 提出中…",
        command: undefined,
      });
    },
  );

  it("問題つきでない課題は共有状態の running だけでも確認中を1つにし、終了後に提出を戻す", async () => {
    const taskState = await import("./task-state.js");
    const getState = vi.spyOn(taskState, "getTaskState").mockReturnValue({ running: true });
    try {
      registerTaskStatus(context);
      setCurrentTask({ root, title: "最初のページを作る", taskId });
      for (const busy of [undefined, "check", "submit", "diagnose"] as const) {
        setTaskBusy(busy);
        expect(stateItem()).toMatchObject({
          visible: true,
          text: "$(sync~spin) 確認中…",
          command: "stella.showRunLog",
        });
        expect(submitItem()?.visible).toBe(false);
        expect(
          state.items.filter((item) => item.visible && item.text.startsWith("$(sync~spin) 確認中")),
        ).toHaveLength(1);
      }
      getState.mockReturnValue({ running: false });
      setTaskBusy("submit");
      expect(submitItem()).toMatchObject({
        visible: true,
        text: "$(sync~spin) 提出中…",
        command: undefined,
      });
      setTaskBusy(undefined);
      expect(submitItem()).toMatchObject({
        visible: true,
        text: "$(cloud-upload) 提出する",
        command: { command: "stella.submitTask", arguments: [root] },
      });
    } finally {
      getState.mockRestore();
    }
  });

  it.each([false, true])(
    "処理中でも解ける問題がなければ提出を隠す (配布待ち: %s)",
    (releasePending) => {
      registerTaskStatus(context);
      setCurrentTask({
        root,
        title: "計算",
        problemProgress: { passed: 0, total: 1 },
        currentProblem: releasePending ? { id: "q01", label: "問1" } : undefined,
        problemActionsAvailable: !releasePending,
      });
      for (const busy of ["check", "submit", "diagnose"] as const) {
        setTaskBusy(busy);
        expect(submitItem()?.visible).toBe(false);
      }
    },
  );

  it.each([true, false])("問題つきの課題で確認の進捗を表示する (提出可: %s)", async (canSubmit) => {
    const loaded = await loadTask(root);
    if (!loaded.ok) throw new Error("課題を読めません");
    registerTaskStatus(context);
    setCurrentTask({
      root,
      title: "計算",
      problemProgress: { passed: 1, total: 2 },
      currentProblem: canSubmit ? { id: "q02", label: "問2" } : undefined,
    });
    expect(submitItem()?.visible).toBe(canSubmit);
    startTaskCheck({ root, taskId, problemId: "q02", forSubmission: true });
    expect(submitItem()).toMatchObject({ visible: true, text: "$(sync~spin) 確認中…" });
    progressTaskCheck({ type: "plan", steps: [{ id: "test", label: "テスト (Vitest)" }] });
    progressTaskCheck({ type: "step-start", index: 0 });
    expect(submitItem()).toMatchObject({
      visible: true,
      text: "$(sync~spin) 確認中 1/1 テスト",
      tooltip: "「計算」を確認しています: 1/1 テスト (Vitest)",
      command: "stella.showRunLog",
    });
    finishTaskCheck({ root, manifest: loaded.manifest, result: result("passed"), saved: false });
    expect(submitItem()?.visible).toBe(canSubmit);
    if (canSubmit) {
      expect(submitItem()).toMatchObject({
        text: "$(play) 確認して提出",
        command: { command: "stella.submitTask", arguments: [root, "q02"] },
      });
    }
  });

  it.each([
    ["C:\\a\\b", "c:\\a\\b"],
    ["c:\\a\\b", "C:\\a\\b"],
  ])(
    "ドライブ文字の大小が違っても確認イベントで表示を更新する (%s / %s)",
    async (editorRoot, checkRoot) => {
      const loaded = await loadTask(root);
      if (!loaded.ok) throw new Error("課題を読めません");
      const platform = process.platform;
      registerTaskStatus(context);
      setCurrentTask({ root: editorRoot, title: loaded.manifest.title });
      Object.defineProperty(process, "platform", { value: "win32" });
      try {
        startTaskCheck({ root: checkRoot, taskId });
        expect(stateItem()).toMatchObject({ visible: true, text: "$(sync~spin) 確認中…" });
        progressTaskCheck({ type: "plan", steps: [{ id: "test", label: "テスト (Vitest)" }] });
        progressTaskCheck({ type: "step-start", index: 0 });
        expect(stateItem()).toMatchObject({
          visible: true,
          text: "$(sync~spin) 確認中 1/1 テスト",
        });
      } finally {
        try {
          finishTaskCheck({
            root: checkRoot,
            manifest: loaded.manifest,
            result: result("cancelled"),
            saved: false,
          });
        } finally {
          Object.defineProperty(process, "platform", { value: platform });
        }
      }
      expect(stateItem()?.visible).toBe(false);
    },
  );

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
      expect(submitItem()?.visible).toBe(false);
      progressTaskCheck({ type: "plan", steps: [{ id: "test", label: "テスト (Vitest)" }] });
      progressTaskCheck({ type: "step-start", index: 0 });
      expect(stateItem()).toMatchObject({
        text: "$(sync~spin) 確認中 1/1 テスト",
        tooltip: "「最初のページを作る」を確認しています: 1/1 テスト (Vitest)",
        command: "stella.showRunLog",
      });
      expect(submitItem()?.visible).toBe(false);
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
      expect(submitItem()?.visible).toBe(true);
    },
  );

  it.each([
    ["passed", "failed", "$(pass-filled) 合格", false],
    ["ai-passed", "failed", "$(pass-filled) 合格", false],
    ["submitted", "failed", "$(clock) AI が確認中", false],
    ["instructor-pending", "failed", "$(clock) 管理者の確認待ち", false],
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
    expect(submitItem()?.visible).toBe(false);
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
