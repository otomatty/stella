import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  handlers: new Map<string, () => Promise<void> | void>(),
  trusted: true,
  activeFile: undefined as string | undefined,
  folders: [] as string[],
  warningChoice: undefined as string | undefined,
  dirtyDocs: [] as {
    isDirty: boolean;
    uri: { scheme: string; fsPath: string };
    save: () => Promise<boolean>;
  }[],
}));

const vscodeMock = vi.hoisted(() => ({
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  executeCommand: vi.fn(),
  showTaskPanel: vi.fn(),
}));

vi.mock("vscode", () => ({
  window: {
    get activeTextEditor() {
      return state.activeFile
        ? { document: { uri: { scheme: "file", fsPath: state.activeFile } } }
        : undefined;
    },
    createOutputChannel: () => ({
      clear: vi.fn(),
      append: vi.fn(),
      appendLine: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn(),
    }),
    showInformationMessage: vscodeMock.showInformationMessage,
    showWarningMessage: (...args: unknown[]) => {
      vscodeMock.showWarningMessage(...args);
      return Promise.resolve(state.warningChoice);
    },
    showErrorMessage: (...args: unknown[]) => {
      vscodeMock.showErrorMessage(...args);
      return Promise.resolve(undefined);
    },
    withProgress: (_options: unknown, task: (p: unknown, t: unknown) => Promise<void>) =>
      task({}, { onCancellationRequested: vi.fn() }),
  },
  workspace: {
    get isTrusted() {
      return state.trusted;
    },
    get workspaceFolders() {
      return state.folders.map((fsPath) => ({ uri: { fsPath } }));
    },
    get textDocuments() {
      return state.dirtyDocs;
    },
  },
  commands: {
    registerCommand: (id: string, handler: () => Promise<void> | void) => {
      state.handlers.set(id, handler);
      return { dispose: vi.fn() };
    },
    executeCommand: vscodeMock.executeCommand,
  },
  ProgressLocation: { Notification: 15 },
}));

vi.mock("./task-panel.js", () => ({ showTaskPanel: vscodeMock.showTaskPanel }));

const { registerTaskCommands } = await import("./task-commands.js");

async function makeTask(
  manifest: Record<string, unknown>,
  files: Record<string, string>,
): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "stella-cmd-"));
  await mkdir(path.join(root, ".stella"), { recursive: true });
  await writeFile(path.join(root, ".stella", "task.json"), JSON.stringify(manifest));
  for (const [rel, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
    await writeFile(path.join(root, rel), content);
  }
  return root;
}

const staticTask = {
  schemaVersion: 1,
  id: "dev-env-basics/u03-first-page/q05",
  title: "見出しを変える",
  kind: "basic",
  runner: "static-preview",
  submit: { files: ["index.html"] },
  static: {
    checks: [{ type: "element-text", path: "index.html", tag: "h1", text: "今日の学習予定" }],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  state.handlers.clear();
  state.trusted = true;
  state.activeFile = undefined;
  state.folders = [];
  state.warningChoice = undefined;
  state.dirtyDocs = [];
  registerTaskCommands({ subscriptions: [] } as never);
});

async function run(command: string): Promise<void> {
  await state.handlers.get(command)?.();
}

describe("stella.runTask", () => {
  it("課題フォルダーが無ければ案内だけ出す", async () => {
    await run("stella.runTask");
    expect(vscodeMock.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining(".stella/task.json がある課題フォルダー"),
    );
    expect(vscodeMock.showTaskPanel).not.toHaveBeenCalled();
  });

  it("HTML の確認は信頼していないフォルダーでも動き、結果を残す", async () => {
    const root = await makeTask(staticTask, { "index.html": "<h1>今日の学習予定</h1>" });
    state.trusted = false;
    state.activeFile = path.join(root, "index.html");
    state.folders = [root];
    await run("stella.runTask");
    expect(vscodeMock.showTaskPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "result",
        result: expect.objectContaining({ outcome: "passed" }),
      }),
    );
    const saved = JSON.parse(await readFile(path.join(root, ".stella", "last-run.json"), "utf8"));
    expect(saved.outcome).toBe("passed");
  });

  it("プロセスを起動する課題は、信頼していないフォルダーでは実行しない", async () => {
    const root = await makeTask(
      { ...staticTask, runner: "node-test", static: undefined },
      { "index.html": "" },
    );
    state.trusted = false;
    state.folders = [root];
    state.warningChoice = "フォルダーを信頼する";
    await run("stella.runTask");
    expect(vscodeMock.showTaskPanel).not.toHaveBeenCalled();
    expect(vscodeMock.executeCommand).toHaveBeenCalledWith("workbench.trust.manage");
  });

  it("保存していないファイルがあれば尋ね、取り消したら実行しない", async () => {
    const root = await makeTask(staticTask, { "index.html": "<h1>x</h1>" });
    state.folders = [root];
    state.dirtyDocs = [
      {
        isDirty: true,
        uri: { scheme: "file", fsPath: path.join(root, "index.html") },
        save: vi.fn(),
      },
    ];
    await run("stella.runTask");
    expect(vscodeMock.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining("保存していないファイルが 1 件"),
      "保存して確認する",
      "保存せずに確認する",
    );
    expect(vscodeMock.showTaskPanel).not.toHaveBeenCalled();
  });

  it("定義の誤りはパネルで知らせる", async () => {
    const root = await makeTask({ ...staticTask, runner: "bash" }, {});
    state.folders = [root];
    await run("stella.runTask");
    expect(vscodeMock.showTaskPanel).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "invalid", root }),
    );
  });
});

describe("stella.diagnoseEnvironment", () => {
  it("信頼していないフォルダーでは実行しない", async () => {
    state.trusted = false;
    await run("stella.diagnoseEnvironment");
    expect(vscodeMock.showTaskPanel).not.toHaveBeenCalled();
  });
});
