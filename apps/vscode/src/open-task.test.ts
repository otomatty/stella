import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ExtensionContext } from "vscode";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskBundle } from "@stella/shared/tasks/catalog";

const state = vi.hoisted(() => ({
  home: "",
  folders: [] as string[],
  activeFile: undefined as string | undefined,
  memento: new Map<string, unknown>(),
  commands: new Map<string, () => Promise<void>>(),
  windowListeners: [] as ((windowState: { focused: boolean }) => void)[],
  apiRequest: vi.fn(),
  executeCommand: vi.fn(async (..._args: unknown[]) => undefined),
  showTextDocument: vi.fn(async (..._args: unknown[]) => undefined),
  showQuickPick: vi.fn(),
  showOpenDialog: vi.fn(),
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  log: [] as string[],
}));

vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return { ...actual, homedir: () => state.home };
});
vi.mock("./api.js", () => ({ apiRequest: state.apiRequest }));
vi.mock("vscode", () => ({
  Uri: { file: (fsPath: string) => ({ scheme: "file", fsPath }) },
  window: {
    get activeTextEditor() {
      return state.activeFile
        ? { document: { uri: { scheme: "file", fsPath: state.activeFile } } }
        : undefined;
    },
    createOutputChannel: () => ({
      appendLine: (line: string) => state.log.push(line),
      show: vi.fn(),
      dispose: vi.fn(),
    }),
    showQuickPick: state.showQuickPick,
    showOpenDialog: state.showOpenDialog,
    showInformationMessage: state.showInformationMessage,
    showWarningMessage: state.showWarningMessage,
    showErrorMessage: state.showErrorMessage,
    showTextDocument: state.showTextDocument,
    onDidChangeWindowState: (listener: (windowState: { focused: boolean }) => void) => {
      state.windowListeners.push(listener);
      return { dispose: vi.fn() };
    },
  },
  workspace: {
    get workspaceFolders() {
      return state.folders.map((fsPath) => ({ uri: { fsPath } }));
    },
    workspaceFile: undefined,
    openTextDocument: async (uri: { fsPath: string }) => ({ uri }),
  },
  commands: {
    executeCommand: state.executeCommand,
    registerCommand: (id: string, handler: () => Promise<void>) => {
      state.commands.set(id, handler);
      return { dispose: vi.fn() };
    },
  },
}));

import {
  openDistributedTask,
  registerTaskOpening,
  resumePendingTaskOpen,
  settledTaskOpening,
  windowShowsFolder,
} from "./open-task.js";
import {
  PENDING_TTL_MS,
  readPendingTaskOpen,
  savePendingTaskOpen,
  takePendingTaskOpen,
} from "./pending-task-open.js";
import { TRAINING_ROOT_KEY, resolveTrainingRoot, trainingRootProblem } from "./training-folder.js";

const taskId = "course/unit/q1";
const bundle: TaskBundle = {
  manifest: {
    schemaVersion: 1,
    id: taskId,
    title: "課題",
    kind: "basic",
    runner: "node-test",
    submit: { files: ["index.js"] },
    protected: [],
    checks: { lint: false, format: false },
  },
  contentHash: "a".repeat(64),
  files: {
    "index.js": Buffer.from("starter").toString("base64"),
    "README.md": Buffer.from("課題文").toString("base64"),
    ".stella/task.json": Buffer.from("{}").toString("base64"),
  },
};
const memento = {
  get: (key: string) => state.memento.get(key),
  update: async (key: string, value: unknown) => {
    if (value === undefined) state.memento.delete(key);
    else state.memento.set(key, value);
  },
};
let training = "";
let pendingDir = "";
let context: ExtensionContext;

beforeEach(async () => {
  vi.clearAllMocks();
  state.memento.clear();
  state.commands.clear();
  state.log = [];
  state.folders = [];
  state.activeFile = undefined;
  state.home = await mkdtemp(path.join(tmpdir(), "stella-home-"));
  training = path.join(state.home, "web-training");
  await mkdir(training);
  state.memento.set(TRAINING_ROOT_KEY, training);
  state.windowListeners = [];
  // globalStorageUri は全ウィンドウで共有される拡張の保存領域。
  pendingDir = path.join(state.home, "global-storage");
  context = {
    globalState: memento,
    globalStorageUri: { fsPath: pendingDir },
    subscriptions: [],
  } as unknown as ExtensionContext;
  state.apiRequest.mockResolvedValue({ bundle, fixedStart: false });
});
afterEach(async () => {
  await rm(state.home, { recursive: true, force: true });
});

const taskRoot = () => path.join(training, "course/unit/q1");
const openedFolder = () =>
  state.executeCommand.mock.calls.find((call) => call[0] === "vscode.openFolder");
const pendingFiles = async () => {
  try {
    return await readdir(pendingDir);
  } catch {
    return [];
  }
};
const readmeOpened = (root: string) =>
  expect(state.showTextDocument).toHaveBeenCalledWith({
    uri: { scheme: "file", fsPath: path.join(root, "README.md") },
  });
/** 学習フォルダーを開いているウィンドウが前面に来る (VS Code が既存のウィンドウへ切り替えた)。 */
const focusWindow = async () => {
  for (const listener of state.windowListeners) listener({ focused: true });
  await settledTaskOpening();
};

describe("学習フォルダー", () => {
  it("ドライブの直下とホームフォルダーそのものは使わない", () => {
    expect(trainingRootProblem(path.parse(state.home).root, state.home)).toContain("直下");
    expect(trainingRootProblem(state.home, state.home)).toContain("ホームフォルダー");
    expect(trainingRootProblem("relative/web-training", state.home)).toContain("絶対パス");
    expect(trainingRootProblem(training, state.home)).toBeUndefined();
  });
  it("初回はホームに web-training を作って覚える (ワークスペース設定には書かない)", async () => {
    state.memento.clear();
    await rm(training, { recursive: true });
    state.showQuickPick.mockImplementation(async (items: { action: string }[]) => items[0]);
    expect(await resolveTrainingRoot(memento)).toBe(training);
    expect(state.memento.get(TRAINING_ROOT_KEY)).toBe(training);
    // 覚えた後は尋ねない。
    state.showQuickPick.mockClear();
    expect(await resolveTrainingRoot(memento)).toBe(training);
    expect(state.showQuickPick).not.toHaveBeenCalled();
  });
  it("既存のフォルダーを選べ、ホームフォルダーそのものは断る", async () => {
    const existing = path.join(state.home, "my-study");
    await mkdir(existing);
    state.showQuickPick.mockImplementation(async (items: { action: string }[]) => items[1]);
    state.showOpenDialog.mockResolvedValueOnce([{ fsPath: existing }]);
    expect(await resolveTrainingRoot(memento, { ask: true })).toBe(existing);
    expect(state.memento.get(TRAINING_ROOT_KEY)).toBe(existing);
    state.showOpenDialog.mockResolvedValueOnce([{ fsPath: state.home }]);
    expect(await resolveTrainingRoot(memento, { ask: true })).toBeUndefined();
    expect(state.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("ホームフォルダー"),
    );
    expect(state.memento.get(TRAINING_ROOT_KEY)).toBe(existing);
  });
  it("消えた学習フォルダーは使わずに尋ね直す", async () => {
    await rm(training, { recursive: true });
    state.showQuickPick.mockResolvedValue(undefined);
    expect(await resolveTrainingRoot(memento)).toBeUndefined();
    expect(state.showQuickPick).toHaveBeenCalled();
  });
});

describe("課題を開く", () => {
  it("空のウィンドウでは学習フォルダーだけを開き、読み込み直したあと課題文を開く", async () => {
    await openDistributedTask(context, taskId);
    expect(await readFile(path.join(taskRoot(), "README.md"), "utf8")).toBe("課題文");
    expect(openedFolder()).toEqual([
      "vscode.openFolder",
      { scheme: "file", fsPath: training },
      { forceReuseWindow: true },
    ]);
    expect(await pendingFiles()).toEqual(["pending-task-open.json"]);
    // 読み込み直したウィンドウ (学習フォルダーが唯一のフォルダー) で拡張が起動する。
    state.folders = [training];
    await resumePendingTaskOpen(pendingDir);
    readmeOpened(taskRoot());
    expect(await pendingFiles()).toEqual([]);
  });
  it("このウィンドウが学習フォルダーを開いていれば、読み込み直さずにそのまま課題文を開く", async () => {
    state.folders = [training];
    await openDistributedTask(context, taskId);
    expect(openedFolder()).toBeUndefined();
    expect(state.showInformationMessage).not.toHaveBeenCalled();
    expect(state.showTextDocument).toHaveBeenCalledTimes(1);
    expect(await pendingFiles()).toEqual([]);
  });
  it("切り替わった先の学習フォルダーのウィンドウが、前面に来たときに 1 回だけ課題文を開く", async () => {
    // 学習フォルダーを開いて起動済みのウィンドウ。起動時には控えが無い。
    state.folders = [training];
    registerTaskOpening(context);
    await settledTaskOpening();
    expect(state.windowListeners).toHaveLength(1);
    // 別のウィンドウ (他のフォルダー) で「VS Code で開く」→ 新しいウィンドウを選ぶ。
    state.folders = [path.join(state.home, "other-project")];
    state.showInformationMessage.mockResolvedValueOnce("新しいウィンドウで開く");
    await openDistributedTask(context, taskId);
    expect(openedFolder()?.[2]).toEqual({ forceNewWindow: true });
    // 元のウィンドウが前面に戻っても、課題フォルダーを含まないので受け取らない。
    await focusWindow();
    expect(state.showTextDocument).not.toHaveBeenCalled();
    expect(await pendingFiles()).toEqual(["pending-task-open.json"]);
    // VS Code は読み込み直さず、学習フォルダーのウィンドウへ切り替える。
    state.folders = [training];
    await focusWindow();
    expect(state.showTextDocument).toHaveBeenCalledTimes(1);
    readmeOpened(taskRoot());
    expect(await pendingFiles()).toEqual([]);
    // 何度前面に来ても開き直さない。
    await focusWindow();
    expect(state.showTextDocument).toHaveBeenCalledTimes(1);
  });
  it("別のフォルダーを開いているときは、どのウィンドウで開くかを尋ねる", async () => {
    state.folders = [path.join(state.home, "other-project")];
    state.showInformationMessage.mockResolvedValueOnce("新しいウィンドウで開く");
    await openDistributedTask(context, taskId);
    expect(state.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining("学習フォルダー"),
      expect.objectContaining({ modal: true }),
      "このウィンドウで開く",
      "新しいウィンドウで開く",
    );
    expect(openedFolder()?.[2]).toEqual({ forceNewWindow: true });
    // 元のウィンドウは課題フォルダーを含まないので、控えを消費しない。
    await resumePendingTaskOpen(pendingDir);
    expect(state.showTextDocument).not.toHaveBeenCalled();
    expect(await pendingFiles()).toEqual(["pending-task-open.json"]);
  });
  it("衝突したら上書きせず、準備先と衝突したファイルを示す", async () => {
    await mkdir(taskRoot(), { recursive: true });
    await writeFile(path.join(taskRoot(), "index.js"), "learner code");
    state.showWarningMessage.mockResolvedValueOnce(undefined);
    await openDistributedTask(context, taskId);
    expect(await readFile(path.join(taskRoot(), "index.js"), "utf8")).toBe("learner code");
    const [message, options] = state.showWarningMessage.mock.calls[0] as [
      string,
      { detail: string },
    ];
    expect(message).toContain("上書きしません");
    expect(options.detail).toContain(`準備先: ${taskRoot()}`);
    expect(options.detail).toContain("・index.js");
    expect(state.log).toContain("  - index.js");
    expect(openedFolder()).toBeUndefined();
  });
  it("期限切れ・学習フォルダーの外を指す・壊れた控えは開かずに捨てる", async () => {
    const now = Date.now();
    const valid = { id: "x", trainingRoot: training, taskRoot: taskRoot(), at: now };
    expect(readPendingTaskOpen(valid, now)).toEqual(valid);
    expect(readPendingTaskOpen({ ...valid, at: now - PENDING_TTL_MS - 1 }, now)).toBeUndefined();
    expect(readPendingTaskOpen({ ...valid, taskRoot: state.home }, now)).toBeUndefined();
    expect(readPendingTaskOpen({ ...valid, id: undefined }, now)).toBeUndefined();
    // 期限切れの控えは、学習フォルダーのウィンドウが前面に来ても開かない。
    await savePendingTaskOpen(
      pendingDir,
      { trainingRoot: training, taskRoot: taskRoot() },
      now - PENDING_TTL_MS - 1,
    );
    state.folders = [training];
    registerTaskOpening(context);
    await focusWindow();
    expect(state.showTextDocument).not.toHaveBeenCalled();
    expect(await pendingFiles()).toEqual([]);
    await writeFile(path.join(pendingDir, "pending-task-open.json"), "{broken");
    await resumePendingTaskOpen(pendingDir);
    expect(state.showTextDocument).not.toHaveBeenCalled();
    expect(await pendingFiles()).toEqual([]);
  });
  it("2 つのウィンドウが同時に受け取ろうとしても、開くのは 1 つだけ", async () => {
    await savePendingTaskOpen(pendingDir, { trainingRoot: training, taskRoot: taskRoot() });
    const taken = await Promise.all([
      takePendingTaskOpen(pendingDir, () => true),
      takePendingTaskOpen(pendingDir, () => true),
      takePendingTaskOpen(pendingDir, () => true),
    ]);
    expect(taken.filter(Boolean)).toHaveLength(1);
    expect(await pendingFiles()).toEqual([]);
  });
  it("付け替えた後で別のウィンドウ向けと分かった控えは元へ戻す", async () => {
    const saved = await savePendingTaskOpen(pendingDir, {
      trainingRoot: training,
      taskRoot: taskRoot(),
    });
    // 読んだ時点では自分向けに見えたが、付け替え後に読み直すと別のウィンドウ向けだった。
    const accepts = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
    expect(await takePendingTaskOpen(pendingDir, accepts)).toBeUndefined();
    expect(await pendingFiles()).toEqual(["pending-task-open.json"]);
    expect(await takePendingTaskOpen(pendingDir, () => true)).toEqual(saved);
  });
  it("ウィンドウのフォルダーが課題フォルダーを含むかで判断する", () => {
    expect(windowShowsFolder([training], taskRoot())).toBe(true);
    expect(windowShowsFolder([path.join(training, "course")], taskRoot())).toBe(true);
    expect(windowShowsFolder([path.join(training, "other")], taskRoot())).toBe(false);
  });
});

describe("固定した開始点から始める", () => {
  const fixedBundle: TaskBundle = {
    ...bundle,
    files: { ...bundle.files, "index.js": Buffer.from("works so far").toString("base64") },
  };
  async function run() {
    registerTaskOpening(context);
    const handler = state.commands.get("stella.startFromFixedStart");
    if (!handler) throw new Error("command not registered");
    await handler();
  }
  beforeEach(async () => {
    state.folders = [training];
    await openDistributedTask(context, taskId);
    await writeFile(path.join(taskRoot(), "index.js"), "broken learner code");
    state.activeFile = path.join(taskRoot(), "README.md");
    state.showTextDocument.mockClear();
  });
  it("確認のうえで隣のフォルダーに準備し、元の課題フォルダーは変えない", async () => {
    state.apiRequest
      .mockResolvedValueOnce({ bundle, fixedStart: true })
      .mockResolvedValueOnce({ bundle: fixedBundle });
    state.showWarningMessage.mockResolvedValueOnce("固定した開始点を使う");
    await run();
    expect(state.apiRequest).toHaveBeenLastCalledWith("/api/tasks/fixed-start", {
      method: "POST",
      body: { taskId },
    });
    const fixed = path.join(training, "course/unit/q1-fixed-start");
    expect(await readFile(path.join(fixed, "index.js"), "utf8")).toBe("works so far");
    expect(JSON.parse(await readFile(path.join(fixed, ".stella/support.json"), "utf8"))).toEqual([
      expect.objectContaining({ kind: "fixed-start" }),
    ]);
    expect(await readFile(path.join(taskRoot(), "index.js"), "utf8")).toBe("broken learner code");
    expect(state.showTextDocument).toHaveBeenCalledWith({
      uri: { scheme: "file", fsPath: path.join(fixed, "README.md") },
    });
  });
  it("取り消したら LMS に記録を求めない", async () => {
    state.apiRequest.mockResolvedValueOnce({ bundle, fixedStart: true });
    state.showWarningMessage.mockResolvedValueOnce(undefined);
    await run();
    expect(state.apiRequest).toHaveBeenCalledTimes(2);
    expect(state.apiRequest).not.toHaveBeenCalledWith("/api/tasks/fixed-start", expect.anything());
  });
  it("開始点の無い課題では案内だけを出す", async () => {
    state.apiRequest.mockResolvedValueOnce({ bundle, fixedStart: false });
    await run();
    expect(state.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining("固定した開始点がありません"),
    );
    expect(state.showWarningMessage).not.toHaveBeenCalled();
  });
});
