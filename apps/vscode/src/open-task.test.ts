import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
  PENDING_TASK_KEY,
  readPendingTaskOpen,
  registerTaskOpening,
  resumePendingTaskOpen,
  windowShowsFolder,
} from "./open-task.js";
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
const context = { globalState: memento, subscriptions: [] } as unknown as ExtensionContext;
let training = "";

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
  state.apiRequest.mockResolvedValue({ bundle, fixedStart: false });
});
afterEach(async () => {
  await rm(state.home, { recursive: true, force: true });
});

const taskRoot = () => path.join(training, "course/unit/q1");
const openedFolder = () =>
  state.executeCommand.mock.calls.find((call) => call[0] === "vscode.openFolder");

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
    expect(readPendingTaskOpen(state.memento.get(PENDING_TASK_KEY))).toMatchObject({
      trainingRoot: training,
      taskRoot: taskRoot(),
    });
    // 読み込み直したウィンドウ (学習フォルダーが唯一のフォルダー) で拡張が起動する。
    state.folders = [training];
    await resumePendingTaskOpen(memento);
    expect(state.showTextDocument).toHaveBeenCalledWith({
      uri: { scheme: "file", fsPath: path.join(taskRoot(), "README.md") },
    });
    expect(state.memento.has(PENDING_TASK_KEY)).toBe(false);
  });
  it("学習フォルダーを開いているウィンドウでは、そのまま課題文を開く", async () => {
    state.folders = [training];
    await openDistributedTask(context, taskId);
    expect(openedFolder()).toBeUndefined();
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
    await resumePendingTaskOpen(memento);
    expect(state.memento.has(PENDING_TASK_KEY)).toBe(true);
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
  it("期限切れ・学習フォルダーの外を指す控えは捨てる", async () => {
    const now = Date.now();
    expect(
      readPendingTaskOpen({ trainingRoot: training, taskRoot: taskRoot(), at: now }, now),
    ).toBeTruthy();
    expect(
      readPendingTaskOpen(
        { trainingRoot: training, taskRoot: taskRoot(), at: now - 11 * 60_000 },
        now,
      ),
    ).toBeUndefined();
    expect(
      readPendingTaskOpen({ trainingRoot: training, taskRoot: state.home, at: now }, now),
    ).toBeUndefined();
    state.memento.set(PENDING_TASK_KEY, { trainingRoot: training, taskRoot: "x", at: "now" });
    state.folders = [training];
    await resumePendingTaskOpen(memento);
    expect(state.memento.has(PENDING_TASK_KEY)).toBe(false);
    expect(state.showTextDocument).not.toHaveBeenCalled();
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
