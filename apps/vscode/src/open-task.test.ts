import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ExtensionContext } from "vscode";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskBundle } from "@stella/shared/tasks/catalog";
import { version as extensionVersion } from "../package.json";
import { setTaskBundleExtensionVersion } from "./task-bundle-url.js";
import { requireSavedTaskFile } from "./task-update-guard.js";

const state = vi.hoisted(() => ({
  home: "",
  folders: [] as string[],
  activeFile: undefined as string | undefined,
  dirtyFiles: [] as string[],
  memento: new Map<string, unknown>(),
  commands: new Map<string, () => Promise<void>>(),
  windowListeners: [] as ((windowState: { focused: boolean }) => void)[],
  apiRequest: vi.fn(),
  isCompactTaskLayout: vi.fn(() => false),
  executeCommand: vi.fn(async (..._args: unknown[]) => undefined),
  showTextDocument: vi.fn(async (..._args: unknown[]) => undefined),
  showQuickPick: vi.fn(),
  showOpenDialog: vi.fn(),
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  log: [] as string[],
  /** テキストとして開けない (openTextDocument が失敗する) ファイル。 */
  unopenable: new Set<string>(),
}));

vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return { ...actual, homedir: () => state.home };
});
vi.mock("./api.js", () => ({ apiRequest: state.apiRequest, apiSession: () => undefined }));
vi.mock("./task-panel.js", () => ({ isCompactTaskLayout: state.isCompactTaskLayout }));
vi.mock("vscode", () => ({
  Uri: { file: (fsPath: string) => ({ scheme: "file", fsPath }) },
  ViewColumn: { One: 1, Two: 2 },
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
    get textDocuments() {
      return state.dirtyFiles.map((fsPath) => ({ isDirty: true, uri: { scheme: "file", fsPath } }));
    },
    get workspaceFolders() {
      return state.folders.map((fsPath) => ({ uri: { fsPath } }));
    },
    workspaceFile: undefined,
    openTextDocument: async (uri: { fsPath: string }) => {
      if (state.unopenable.has(uri.fsPath)) throw new Error("File seems to be binary");
      return { uri };
    },
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
  windowIsTrainingRoot,
} from "./open-task.js";
import {
  PENDING_TTL_MS,
  readPendingTaskOpen,
  savePendingTaskOpen,
  takePendingTaskOpen,
} from "./pending-task-open.js";
import {
  TRAINING_ROOT_KEY,
  resolveTrainingRoot,
  samePath,
  trainingRootProblem,
} from "./training-folder.js";

const taskId = "course/unit/q1";
const manifest: TaskBundle["manifest"] = {
  schemaVersion: 1,
  id: taskId,
  title: "課題",
  kind: "basic",
  runner: "node-test",
  submit: { files: ["index.js"] },
  protected: ["tests/**"],
  checks: { lint: false, format: false },
};
const bundle: TaskBundle = {
  manifest,
  contentHash: "a".repeat(64),
  files: {
    "index.js": Buffer.from("starter").toString("base64"),
    "tests/index.test.js": Buffer.from("test").toString("base64"),
    "README.md": Buffer.from("課題文").toString("base64"),
    ".stella/task.json": Buffer.from(JSON.stringify(manifest)).toString("base64"),
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
  setTaskBundleExtensionVersion(extensionVersion);
  state.memento.clear();
  state.commands.clear();
  state.log = [];
  state.folders = [];
  state.activeFile = undefined;
  state.dirtyFiles = [];
  state.unopenable.clear();
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
/** 課題を開いた画面: 左に編集するファイル、右に課題文のパネル (進め方つき)。 */
const readmeOpened = (root: string) => {
  expect(state.showTextDocument).toHaveBeenCalledWith(
    { uri: { scheme: "file", fsPath: path.join(root, "index.js") } },
    { viewColumn: 1, preview: false },
  );
  // 課題文は OS のタブ付きのパネルで読む (#30)。README.md はテキストとしては開かない。
  expect(state.executeCommand).toHaveBeenCalledWith("stella.showTaskReadme", root);
  expect(state.showTextDocument).not.toHaveBeenCalledWith(
    { uri: { scheme: "file", fsPath: path.join(root, "README.md") } },
    expect.anything(),
  );
};
/** 学習フォルダーを開いているウィンドウが前面に来る (VS Code が既存のウィンドウへ切り替えた)。 */
const focusWindow = async () => {
  for (const listener of state.windowListeners) listener({ focused: true });
  await settledTaskOpening();
};

describe("学習フォルダー", () => {
  it("ドライブの直下とホームフォルダーそのものは使わない", async () => {
    expect(await trainingRootProblem(path.parse(state.home).root, state.home)).toContain("直下");
    expect(await trainingRootProblem(state.home, state.home)).toContain("ホームフォルダー");
    expect(await trainingRootProblem("relative/web-training", state.home)).toContain("絶対パス");
    expect(await trainingRootProblem(training, state.home)).toBeUndefined();
    // ホームを指すリンクも、ホームそのものとみなす。
    const link = path.join(path.dirname(state.home), `${path.basename(state.home)}-link`);
    await symlink(state.home, link);
    try {
      expect(await trainingRootProblem(link, state.home)).toContain("ホームフォルダー");
    } finally {
      await rm(link, { force: true });
    }
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
  it("Web から課題を開く初回は、尋ねずにホームに web-training を作って覚える", async () => {
    state.memento.clear();
    await rm(training, { recursive: true });
    expect(await resolveTrainingRoot(memento, { auto: true })).toBe(training);
    expect(state.memento.get(TRAINING_ROOT_KEY)).toBe(training);
    expect(state.showQuickPick).not.toHaveBeenCalled();
    expect(state.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining("学習フォルダーを選ぶ"),
    );
  });
  it("覚えた学習フォルダーが消えていたら、auto でもホームへ分けずに尋ね直す", async () => {
    const elsewhere = path.join(state.home, "external-drive", "study");
    state.memento.set(TRAINING_ROOT_KEY, elsewhere);
    state.showQuickPick.mockResolvedValue(undefined);
    expect(await resolveTrainingRoot(memento, { auto: true })).toBeUndefined();
    expect(state.showQuickPick).toHaveBeenCalled();
    expect(state.memento.get(TRAINING_ROOT_KEY)).toBe(elsewhere);
  });
  it("消えた学習フォルダーは使わずに尋ね直す", async () => {
    await rm(training, { recursive: true });
    state.showQuickPick.mockResolvedValue(undefined);
    expect(await resolveTrainingRoot(memento)).toBeUndefined();
    expect(state.showQuickPick).toHaveBeenCalled();
  });
});

describe("課題を開く", () => {
  it("拡張の版をクエリで申告して配布を受け取る", async () => {
    await openDistributedTask(context, taskId);
    expect(state.apiRequest).toHaveBeenCalledWith(
      `/api/tasks/bundle?taskId=course%2Funit%2Fq1&extension=${extensionVersion}`,
    );
  });
  it.each([undefined, null, "", 82])("版を取得できない場合 (%s) は申告を省く", async (version) => {
    setTaskBundleExtensionVersion(version);
    await openDistributedTask(context, taskId);
    expect(state.apiRequest).toHaveBeenCalledWith("/api/tasks/bundle?taskId=course%2Funit%2Fq1");
  });
  it("初めてでも学習フォルダーを尋ねずに準備して開く (Web のボタンから課題文まで止めない)", async () => {
    state.memento.clear();
    await rm(training, { recursive: true });
    await openDistributedTask(context, taskId);
    expect(state.showQuickPick).not.toHaveBeenCalled();
    expect(await readFile(path.join(taskRoot(), "README.md"), "utf8")).toBe("課題文");
    expect(openedFolder()).toEqual([
      "vscode.openFolder",
      { scheme: "file", fsPath: training },
      { forceReuseWindow: true },
    ]);
  });
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
  it("学習フォルダーだけを開いているウィンドウかで判断する", async () => {
    expect(await windowIsTrainingRoot([training], training)).toBe(true);
    expect(await windowIsTrainingRoot([state.home], training)).toBe(false);
    expect(await windowIsTrainingRoot([path.join(training, "course")], training)).toBe(false);
    expect(await windowIsTrainingRoot([training, state.home], training)).toBe(false);
    expect(await windowIsTrainingRoot([], training)).toBe(false);
  });
  it("同じ場所かは、あればファイルシステムの実体で比べる", async () => {
    // 大文字と小文字だけが違う別々のフォルダー (大文字小文字を区別するボリューム)。
    // macOS として比べても、実体が違えば別の場所とみなす。
    const upper = path.join(state.home, "Case-Folder");
    const lower = path.join(state.home, "case-folder-link");
    await mkdir(upper);
    // 大文字小文字を区別しないボリューム (macOS の既定など) では作れないので、確かめない。
    const caseSensitive = await mkdir(path.join(state.home, "case-Folder")).then(
      () => true,
      () => false,
    );
    if (caseSensitive)
      expect(await samePath(upper, path.join(state.home, "case-Folder"), "darwin")).toBe(false);
    // 表記が違っても同じ実体なら同じ場所 (大文字小文字を区別しないボリュームやリンク)。
    await symlink(upper, lower);
    expect(await samePath(upper, lower, "darwin")).toBe(true);
    expect(await windowIsTrainingRoot([lower], upper)).toBe(true);
    // どちらかが無ければ表記で比べ、大文字と小文字を区別しないのは Windows だけ。
    const missing = path.join(state.home, "missing", "Web");
    const missingLower = path.join(state.home, "missing", "web");
    expect(await samePath(missing, missingLower, "win32")).toBe(true);
    expect(await samePath(missing, missingLower, "darwin")).toBe(false);
    expect(await samePath(missing, missingLower, "linux")).toBe(false);
    expect(await samePath(missing, `${missing}${path.sep}`, "linux")).toBe(true);
  });
  it("古い配布記録を API で照合し、新しいバージョンと写しの場所を知らせる", async () => {
    state.folders = [training];
    await openDistributedTask(context, taskId);
    const task = taskRoot();
    const receipt = path.join(task, ".stella/distribution.json");
    const old = JSON.parse(await readFile(receipt, "utf8"));
    await writeFile(receipt, JSON.stringify({ taskId, contentHash: old.contentHash }));
    await writeFile(path.join(task, "index.js"), "learner code");
    await writeFile(path.join(task, "README.md"), "learner notes");
    state.apiRequest
      .mockResolvedValueOnce({
        bundle: {
          ...bundle,
          contentHash: "b".repeat(64),
          files: { ...bundle.files, "README.md": Buffer.from("new readme").toString("base64") },
        },
      })
      .mockResolvedValueOnce({ files: old.files });
    await openDistributedTask(context, taskId);
    expect(state.apiRequest).toHaveBeenLastCalledWith(
      `/api/tasks/revision-files?${new URLSearchParams({ taskId, contentHash: bundle.contentHash, extension: extensionVersion })}`,
      { signal: expect.any(AbortSignal) },
    );
    const backup = path.join(task, ".stella/previous", bundle.contentHash.slice(0, 12));
    expect(await readFile(path.join(task, "index.js"), "utf8")).toBe("learner code");
    expect(await readFile(path.join(backup, "README.md"), "utf8")).toBe("learner notes");
    expect(state.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining(
        `課題を新しいバージョンにしました。あなたのコードはそのまま残しています。 編集した配布ファイルの写しは ${backup} にあります。`,
      ),
    );
  });

  it("別のパスで開いた未保存の文書も、実体が置き換え対象なら止める", async () => {
    const folder = path.join(state.home, "task");
    await mkdir(folder);
    await writeFile(path.join(folder, "index.js"), "starter");
    await writeFile(path.join(folder, "other.js"), "other");
    const alias = path.join(state.home, "alias");
    await symlink(folder, alias, "junction");
    state.dirtyFiles = [path.join(alias, "index.js")];

    await expect(requireSavedTaskFile(folder, "other.js")).resolves.toBeUndefined();
    await expect(requireSavedTaskFile(folder, "index.js")).rejects.toMatchObject({
      reason: "unsaved",
      files: ["index.js"],
    });
  });

  it("課題フォルダーに未保存の文書があれば保存を案内し、保存後は更新できる", async () => {
    state.folders = [training];
    await openDistributedTask(context, taskId);
    const task = taskRoot();
    const code = path.join(task, "index.js");
    const readme = path.join(task, "README.md");
    const outside = path.join(`${task}-other`, "index.js");
    const updated = {
      ...bundle,
      contentHash: "b".repeat(64),
      files: { ...bundle.files, "README.md": Buffer.from("new readme").toString("base64") },
    };
    state.apiRequest.mockResolvedValue({ bundle: updated });
    state.dirtyFiles = [code, outside];

    await openDistributedTask(context, taskId);

    expect(state.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining("未保存のファイル"),
      expect.objectContaining({ detail: expect.stringContaining("保存してから、もう一度") }),
      "一覧を表示",
      "準備先を表示",
    );
    expect(await readFile(readme, "utf8")).toBe("課題文");
    expect(await readFile(path.join(task, ".stella/distribution.json"), "utf8")).toContain(
      bundle.contentHash,
    );
    expect(state.showTextDocument).toHaveBeenCalledTimes(1);

    await writeFile(code, "saved learner code");
    state.dirtyFiles = [outside];
    await openDistributedTask(context, taskId);
    expect(await readFile(code, "utf8")).toBe("saved learner code");
    expect(await readFile(readme, "utf8")).toBe("new readme");
  });

  it("課題文が消えた課題フォルダーを「今のフォルダーを開く」ときは、フォルダーを示す", async () => {
    state.folders = [training];
    await openDistributedTask(context, taskId);
    expect(state.showTextDocument).toHaveBeenCalledTimes(1);
    await rm(path.join(taskRoot(), "README.md"));
    state.showWarningMessage.mockResolvedValueOnce("今のフォルダーを開く");
    await openDistributedTask(context, taskId);
    expect(state.showWarningMessage.mock.calls[0]?.[1]).toMatchObject({
      detail: expect.stringContaining("・README.md"),
    });
    expect(state.executeCommand).toHaveBeenCalledWith("revealInExplorer", {
      scheme: "file",
      fsPath: taskRoot(),
    });
    expect(state.showTextDocument).toHaveBeenCalledTimes(1);
    expect(state.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining("README.md) が見つからない"),
    );
    expect(openedFolder()).toBeUndefined();
  });
});

describe("学習フォルダーを唯一のフォルダーにする", () => {
  const others = () => ({
    ancestor: [state.home],
    course: [path.join(training, "course")],
    multiRoot: [training, path.join(state.home, "other-project")],
  });
  it.each(["ancestor", "course", "multiRoot"] as const)(
    "%s のウィンドウでは課題文をその場で開かず、学習フォルダーを開く",
    async (kind) => {
      state.folders = others()[kind];
      state.showInformationMessage.mockResolvedValueOnce("このウィンドウで開く");
      await openDistributedTask(context, taskId);
      expect(openedFolder()).toEqual([
        "vscode.openFolder",
        { scheme: "file", fsPath: training },
        { forceReuseWindow: true },
      ]);
      expect(state.showTextDocument).not.toHaveBeenCalled();
      // そのウィンドウが前面に来ても、控えは受け取らない。
      registerTaskOpening(context);
      await focusWindow();
      expect(state.showTextDocument).not.toHaveBeenCalled();
      expect(await pendingFiles()).toEqual(["pending-task-open.json"]);
      // 学習フォルダーだけのウィンドウが受け取る。
      state.folders = [training];
      await focusWindow();
      expect(state.showTextDocument).toHaveBeenCalledTimes(1);
      readmeOpened(taskRoot());
    },
  );
  it("学習フォルダーだけを開いているウィンドウでは、その場で課題文を開く", async () => {
    state.folders = [training];
    await openDistributedTask(context, taskId);
    expect(openedFolder()).toBeUndefined();
    readmeOpened(taskRoot());
  });
});

describe("課題を開いた画面", () => {
  it.each([
    ["q01", "q01", undefined],
    ["q02", "q02", undefined],
    ["q03", "q02", "次の問題は「値と型」の動画を見ると出ます"],
  ])("問題 %s のリンクをウィンドウの切り替え先で開く", async (requested, opened, notice) => {
    const problems = ["q01", "q02", "q03"].map((id) => ({ id, title: id }));
    const problemManifest = {
      ...manifest,
      problems,
      problemSteps: true as const,
      submit: { files: ["src/**/*.ts"] },
    };
    const files = {
      ...bundle.files,
      ".stella/task.json": Buffer.from(JSON.stringify(problemManifest)).toString("base64"),
      ...Object.fromEntries(
        problems.flatMap(({ id }) =>
          [`src/${id}.ts`, `tests/${id}.test.ts`].map((rel) => [
            rel,
            Buffer.from(id).toString("base64"),
          ]),
        ),
      ),
    };
    state.apiRequest.mockImplementation(async (url: string) =>
      url.includes("problem-results")
        ? {
            gated: true,
            totalProblems: 3,
            passedProblems: 1,
            taskPassed: false,
            problems: [
              { id: "q01", state: "submitted" },
              { id: "q02", state: "open" },
              { id: "q03", state: "locked-video", afterTitle: "値と型" },
            ],
          }
        : { bundle: { ...bundle, manifest: problemManifest, files } },
    );
    await openDistributedTask(context, taskId, requested);
    expect(openedFolder()).toBeDefined();
    expect((await readdir(path.join(taskRoot(), "src"))).sort()).toEqual(["q01.ts", "q02.ts"]);
    expect((await readdir(path.join(taskRoot(), "tests"))).sort()).toEqual([
      "index.test.js",
      "q01.test.ts",
      "q02.test.ts",
    ]);
    registerTaskOpening(context);
    state.folders = [training];
    await focusWindow();
    expect(state.showTextDocument).toHaveBeenCalledWith(
      { uri: { scheme: "file", fsPath: path.join(taskRoot(), "src", `${opened}.ts`) } },
      expect.anything(),
    );
    if (notice) expect(state.showWarningMessage).toHaveBeenCalledWith(notice);
    else expect(state.showWarningMessage).not.toHaveBeenCalled();
    expect(state.executeCommand).toHaveBeenCalledWith("stella.showTaskReadme", taskRoot());
  });

  it.each([
    { lastState: "locked-video", opened: undefined },
    { lastState: "submitted", opened: "q01" },
  ])("問題を指定せずに開く (最後の問題: $lastState)", async ({ lastState, opened }) => {
    const problems = [
      { id: "q01", title: "問1" },
      { id: "q02", title: "問2" },
    ];
    const problemManifest = {
      ...manifest,
      problems,
      problemSteps: true as const,
      submit: { files: ["src/**/*.ts"] },
    };
    const files = {
      ...bundle.files,
      ".stella/task.json": Buffer.from(JSON.stringify(problemManifest)).toString("base64"),
      ...Object.fromEntries(
        problems.flatMap(({ id }) =>
          [`src/${id}.ts`, `tests/${id}.test.ts`].map((rel) => [
            rel,
            Buffer.from(id).toString("base64"),
          ]),
        ),
      ),
    };
    state.folders = [training];
    state.apiRequest.mockImplementation(async (url: string) =>
      url.includes("problem-results")
        ? {
            gated: true,
            totalProblems: 2,
            passedProblems: lastState === "submitted" ? 2 : 1,
            taskPassed: lastState === "submitted",
            problems: [
              { id: "q01", state: "submitted" },
              { id: "q02", state: lastState, afterTitle: "計算の順番" },
            ],
          }
        : { bundle: { ...bundle, manifest: problemManifest, files } },
    );
    await openDistributedTask(context, taskId);
    const openedFiles = state.showTextDocument.mock.calls.map(
      (call) => (call[0] as { uri: { fsPath: string } }).uri.fsPath,
    );
    expect(openedFiles).toEqual(opened ? [path.join(taskRoot(), "src", `${opened}.ts`)] : []);
    expect(state.executeCommand).toHaveBeenCalledWith("stella.showTaskReadme", taskRoot());
  });

  it("準備後に動画を見終えたら、ウィンドウを開くときに問題のファイルを足す", async () => {
    const problemManifest = {
      ...manifest,
      problems: [{ id: "q01", title: "問1" }],
      problemSteps: true as const,
      submit: { files: ["src/**/*.ts"] },
    };
    let videoCompleted = false;
    state.apiRequest.mockImplementation(async (url: string) =>
      url.includes("problem-results")
        ? {
            gated: true,
            totalProblems: 1,
            passedProblems: 0,
            taskPassed: false,
            problems: [
              {
                id: "q01",
                state: videoCompleted ? "open" : "locked-video",
                afterTitle: "導入",
              },
            ],
          }
        : {
            bundle: {
              ...bundle,
              manifest: problemManifest,
              files: {
                ...bundle.files,
                "src/q01.ts": Buffer.from("starter").toString("base64"),
                "tests/q01.test.ts": Buffer.from("test").toString("base64"),
                ".stella/task.json": Buffer.from(JSON.stringify(problemManifest)).toString(
                  "base64",
                ),
              },
            },
          },
    );
    await openDistributedTask(context, taskId, "q01");
    await expect(readFile(path.join(taskRoot(), "src/q01.ts"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    videoCompleted = true;
    registerTaskOpening(context);
    state.folders = [training];
    await focusWindow();
    expect(await readFile(path.join(taskRoot(), "src/q01.ts"), "utf8")).toBe("starter");
    expect(await readFile(path.join(taskRoot(), "tests/q01.test.ts"), "utf8")).toBe("test");
    expect(state.showTextDocument).toHaveBeenCalledWith(
      { uri: { scheme: "file", fsPath: path.join(taskRoot(), "src/q01.ts") } },
      expect.anything(),
    );
  });

  it("最初の動画を見ていない場合はファイルを開かず課題文を出す", async () => {
    const problemManifest = {
      ...manifest,
      problems: [{ id: "q01", title: "問1" }],
      problemSteps: true as const,
      submit: { files: ["src/**/*.ts"] },
    };
    state.folders = [training];
    state.apiRequest.mockImplementation(async (url: string) =>
      url.includes("problem-results")
        ? {
            gated: true,
            totalProblems: 1,
            passedProblems: 0,
            taskPassed: false,
            problems: [{ id: "q01", state: "locked-video", afterTitle: "導入" }],
          }
        : {
            bundle: {
              ...bundle,
              manifest: problemManifest,
              files: {
                ...bundle.files,
                "src/q01.ts": Buffer.from("starter").toString("base64"),
                ".stella/task.json": Buffer.from(JSON.stringify(problemManifest)).toString(
                  "base64",
                ),
              },
            },
          },
    );
    await openDistributedTask(context, taskId, "q01");
    expect(state.showTextDocument).not.toHaveBeenCalled();
    expect(state.showWarningMessage).toHaveBeenCalledWith("次の問題は「導入」の動画を見ると出ます");
    expect(state.executeCommand).toHaveBeenCalledWith("stella.showTaskReadme", taskRoot());
  });

  it.each([undefined, "q01-add"])(
    "段階なしの課題は問題指定 %s から従来どおり次の未提出を開く",
    async (requested) => {
      const problems = [
        { id: "q01-add", title: "足す" },
        { id: "q02-sub", title: "引く" },
      ];
      const problemManifest = {
        ...manifest,
        problems,
        submit: { files: ["src/**/*.ts"] },
      };
      const problemBundle: TaskBundle = {
        ...bundle,
        manifest: problemManifest,
        files: {
          "src/q01-add.ts": Buffer.from("a").toString("base64"),
          "src/q02-sub.ts": Buffer.from("b").toString("base64"),
          "tests/q01-add.test.ts": Buffer.from("t").toString("base64"),
          ".stella/task.json": Buffer.from(JSON.stringify(problemManifest)).toString("base64"),
        },
      };
      state.apiRequest.mockImplementation(async (requestPath: string) => {
        if (String(requestPath).includes("problem-results")) {
          return {
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
          };
        }
        return { bundle: problemBundle, fixedStart: false };
      });
      state.folders = [training];
      await openDistributedTask(context, taskId, requested);
      const opened = state.showTextDocument.mock.calls.map(
        (call) => (call[0] as { uri: { fsPath: string } }).uri.fsPath,
      );
      expect(opened).toEqual([path.join(taskRoot(), "src", "q02-sub.ts")]);
      await expect(readFile(path.join(taskRoot(), "README.md"))).rejects.toMatchObject({
        code: "ENOENT",
      });
      expect(state.executeCommand).toHaveBeenCalledWith("stella.showTaskReadme", taskRoot());
    },
  );

  it("編集するファイルを左に並べ (最初のファイルを前に)、テストと課題文はテキストで開かない", async () => {
    const many: TaskBundle = {
      ...bundle,
      manifest: { ...manifest, submit: { files: ["src/**/*.js"] } },
      files: {
        ...Object.fromEntries(
          ["a", "b", "c", "d"].map((name) => [
            `src/${name}.js`,
            Buffer.from(name).toString("base64"),
          ]),
        ),
        "tests/index.test.js": bundle.files["tests/index.test.js"] ?? "",
        "README.md": bundle.files["README.md"] ?? "",
        ".stella/task.json": Buffer.from(
          JSON.stringify({ ...manifest, submit: { files: ["src/**/*.js"] } }),
        ).toString("base64"),
      },
    };
    state.apiRequest.mockResolvedValue({ bundle: many, fixedStart: false });
    state.folders = [training];
    await openDistributedTask(context, taskId);
    const opened = state.showTextDocument.mock.calls.map(
      (call) => (call[0] as { uri: { fsPath: string } }).uri.fsPath,
    );
    // 最初の 3 件を開き、最後に最初のファイルを前に戻す。
    expect(opened).toEqual(
      ["a", "b", "c", "a"].map((name) => path.join(taskRoot(), "src", `${name}.js`)),
    );
    expect(state.executeCommand).toHaveBeenCalledWith("stella.showTaskReadme", taskRoot());
    // 学習ガイドの現在地を更新し、サイドバーを開かずに編集を始める。
    expect(state.executeCommand.mock.calls[0]).toEqual(["stella.revealTask", taskId]);
    expect(state.executeCommand).not.toHaveBeenCalledWith("stella.lessons.focus");
    expect(state.executeCommand).not.toHaveBeenCalledWith("revealInExplorer", expect.anything());
  });

  it("画像は自動では開かず、開けないファイルがあっても課題文は開く", async () => {
    const files = ["assets/logo.png", "index.js", "notes.js"];
    const withImage: TaskBundle = {
      ...bundle,
      manifest: { ...manifest, submit: { files } },
      files: {
        ...bundle.files,
        "assets/logo.png": Buffer.from([0x89, 0x50, 0x4e, 0x47, 0]).toString("base64"),
        "notes.js": Buffer.from("notes").toString("base64"),
        ".stella/task.json": Buffer.from(
          JSON.stringify({ ...manifest, submit: { files } }),
        ).toString("base64"),
      },
    };
    state.apiRequest.mockResolvedValue({ bundle: withImage, fixedStart: false });
    state.folders = [training];
    state.unopenable.add(path.join(taskRoot(), "index.js"));
    await openDistributedTask(context, taskId);
    const opened = state.showTextDocument.mock.calls.map(
      (call) => (call[0] as { uri: { fsPath: string } }).uri.fsPath,
    );
    expect(opened).toEqual([path.join(taskRoot(), "notes.js")]);
    expect(state.executeCommand).toHaveBeenCalledWith("stella.showTaskReadme", taskRoot());
  });

  it.each([true, false])(
    "課題文を開いたあとの編集ファイルの表示 (compact: %s)",
    async (compact) => {
      state.isCompactTaskLayout.mockReturnValueOnce(compact);
      state.folders = [training];
      await openDistributedTask(context, taskId);

      const readmeCallIndex = state.executeCommand.mock.calls.findIndex(
        ([command]) => command === "stella.showTaskReadme",
      );
      const readmeCallOrder = state.executeCommand.mock.invocationCallOrder[readmeCallIndex];
      const editorCallOrder = state.showTextDocument.mock.invocationCallOrder;
      readmeOpened(taskRoot());
      expect(editorCallOrder).toHaveLength(compact ? 2 : 1);
      expect(editorCallOrder[0]).toBeLessThan(readmeCallOrder);
      if (compact) {
        expect(editorCallOrder[1]).toBeGreaterThan(readmeCallOrder);
        expect(state.showTextDocument).toHaveBeenNthCalledWith(
          2,
          { uri: { scheme: "file", fsPath: path.join(taskRoot(), "index.js") } },
          { viewColumn: 1, preview: false },
        );
      }
    },
  );

  it("課題の定義を読めなければ、課題文のパネルだけを開く", async () => {
    state.apiRequest.mockResolvedValue({
      bundle: {
        ...bundle,
        files: { ...bundle.files, ".stella/task.json": Buffer.from("{}").toString("base64") },
      },
      fixedStart: false,
    });
    state.folders = [training];
    await openDistributedTask(context, taskId);
    expect(state.showTextDocument).not.toHaveBeenCalled();
    expect(state.executeCommand).toHaveBeenCalledWith("stella.showTaskReadme", taskRoot());
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
    expect(state.apiRequest).toHaveBeenNthCalledWith(
      2,
      `/api/tasks/bundle?taskId=course%2Funit%2Fq1&extension=${extensionVersion}`,
    );
    expect(state.apiRequest).toHaveBeenLastCalledWith(
      `/api/tasks/fixed-start?extension=${extensionVersion}`,
      {
        method: "POST",
        body: { taskId },
      },
    );
    const fixed = path.join(training, "course/unit/q1-fixed-start");
    expect(await readFile(path.join(fixed, "index.js"), "utf8")).toBe("works so far");
    expect(JSON.parse(await readFile(path.join(fixed, ".stella/support.json"), "utf8"))).toEqual([
      expect.objectContaining({ kind: "fixed-start" }),
    ]);
    expect(await readFile(path.join(taskRoot(), "index.js"), "utf8")).toBe("broken learner code");
    readmeOpened(fixed);
  });
  it("取り消したら LMS に記録を求めない", async () => {
    state.apiRequest.mockResolvedValueOnce({ bundle, fixedStart: true });
    state.showWarningMessage.mockResolvedValueOnce(undefined);
    await run();
    expect(state.apiRequest).toHaveBeenCalledTimes(2);
    expect(state.apiRequest).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/tasks/fixed-start"),
      expect.anything(),
    );
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
