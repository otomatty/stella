import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { RunResult } from "@stella/shared/tasks/run-result";
import type { ExtensionContext } from "vscode";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthExpiredError, initApi } from "./api.js";
import { AuthStore } from "./auth.js";
import { hashFile } from "./runner/files.js";
import { buildTaskGuideHtml, type TaskGuideInput } from "./task-guide.js";
import {
  activeTaskCheck,
  onDidFinishTaskCheck,
  onDidProgressTaskCheck,
  onDidStartTaskCheck,
} from "./task-run-events.js";
import { prepareLocalTaskSubmission } from "./task-submission.js";

const state = vi.hoisted(() => ({
  handlers: new Map<string, () => Promise<void> | void>(),
  trusted: true,
  cancelProgress: false,
  activeFile: undefined as string | undefined,
  folders: [] as string[],
  warningChoice: undefined as string | undefined,
  /** 入力欄に順に返す値 (undefined は取り消し)。 */
  inputs: [] as (string | undefined)[],
  /** 課題文のパネルが出している課題フォルダー (taskReadmeRoot)。 */
  readmeRoot: undefined as string | undefined,
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
  showTaskReadme: vi.fn(),
  updateTaskPanelCheck: vi.fn(),
  updateTaskReadmeCheck: vi.fn(),
  onTaskReadmeVisible: vi.fn(),
  refreshLearningSidebar: vi.fn(),
  getSecret: vi.fn(),
  setCurrentTask: vi.fn(),
  showTextDocument: vi.fn(),
  showInputBox: vi.fn(),
  showSubmissionForm: vi.fn(),
  sendTaskSubmission: vi.fn(),
  getCachedCatalog: vi.fn(),
  openExternal: vi.fn(),
  progress: vi.fn(),
  reportProgress: vi.fn(),
}));

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
  Uri: {
    file: (fsPath: string) => ({ scheme: "file", fsPath }),
    parse: (url: string) => ({ scheme: new URL(url).protocol.slice(0, -1), url }),
  },
  env: { openExternal: vscodeMock.openExternal },
  ViewColumn: { One: 1, Two: 2 },
  window: {
    onDidChangeWindowState: () => ({ dispose: () => undefined }),
    showTextDocument: vscodeMock.showTextDocument,
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
    showInputBox: (options: unknown) => {
      vscodeMock.showInputBox(options);
      return Promise.resolve(state.inputs.shift());
    },
    withProgress: (options: unknown, task: (p: unknown, t: unknown) => Promise<unknown>) => {
      vscodeMock.progress(options);
      return task(
        { report: vscodeMock.reportProgress },
        {
          onCancellationRequested: (cancel: () => void) => {
            if (state.cancelProgress) cancel();
          },
        },
      );
    },
  },
  workspace: {
    getConfiguration: () => ({ inspect: () => ({ globalValue: "https://stella.example/" }) }),
    get isTrusted() {
      return state.trusted;
    },
    get workspaceFolders() {
      return state.folders.map((fsPath) => ({ uri: { fsPath } }));
    },
    get textDocuments() {
      return state.dirtyDocs;
    },
    openTextDocument: async (uri: { fsPath: string }) => ({ uri }),
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

vi.mock("./task-panel.js", () => ({
  showTaskPanel: vscodeMock.showTaskPanel,
  showTaskReadme: vscodeMock.showTaskReadme,
  onTaskReadmeVisible: vscodeMock.onTaskReadmeVisible,
  taskReadmeRoot: () => state.readmeRoot,
  updateTaskPanelCheck: vscodeMock.updateTaskPanelCheck,
  updateTaskReadmeCheck: vscodeMock.updateTaskReadmeCheck,
}));
vi.mock("./tree.js", () => ({ refreshLearningSidebar: vscodeMock.refreshLearningSidebar }));
vi.mock("./task-status.js", () => ({ setCurrentTask: vscodeMock.setCurrentTask }));
vi.mock("./submission-form.js", () => ({
  registerSubmissionForms: vi.fn(),
  showSubmissionForm: vscodeMock.showSubmissionForm,
}));
const apiRequest = vi.hoisted(() => vi.fn(async (..._args: unknown[]) => ({})));
vi.mock("./api.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api.js")>()),
  apiRequest,
}));

vi.mock("./task-submission.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./task-submission.js")>()),
  sendTaskSubmission: vscodeMock.sendTaskSubmission,
}));
vi.mock("./catalog.js", () => ({ getCachedCatalog: vscodeMock.getCachedCatalog }));

vi.mock("./runner/run-task.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("./runner/run-task.js")>();
  return {
    ...original,
    runTask: vi.fn(original.runTask),
    saveRunResult: vi.fn(original.saveRunResult),
  };
});
const { loadTask, runTask, saveRunResult } = await import("./runner/run-task.js");
const { registerTaskCommands } = await import("./task-commands.js");

async function makeTask(
  manifest: Record<string, unknown>,
  files: Record<string, string>,
  parent?: string,
): Promise<string> {
  const root = parent
    ? path.join(parent, "course", "unit", "q05")
    : await mkdtemp(path.join(tmpdir(), "stella-cmd-"));
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

let context: ExtensionContext;
let auth: AuthStore;

beforeEach(() => {
  vi.clearAllMocks();
  vscodeMock.showInformationMessage.mockResolvedValue(undefined);
  vscodeMock.getCachedCatalog.mockReturnValue([]);
  vscodeMock.getSecret.mockImplementation(async (key: string) =>
    key === "stella.accessToken" ? "token" : undefined,
  );
  vscodeMock.sendTaskSubmission.mockResolvedValue({ id: "submission", attempt: 1 });
  apiRequest.mockResolvedValue({});
  state.handlers.clear();
  state.trusted = true;
  state.cancelProgress = false;
  state.activeFile = undefined;
  state.folders = [];
  state.warningChoice = undefined;
  state.inputs = [];
  state.dirtyDocs = [];
  state.readmeRoot = undefined;
  auth = new AuthStore({
    get: vscodeMock.getSecret,
    store: async (_key: string, token: string) => {
      vscodeMock.getSecret.mockResolvedValue(token);
    },
    delete: vi.fn(),
  } as never);
  initApi(auth, () => "https://stella.example");
  context = {
    extension: { id: "test-publisher.test-extension" },
    subscriptions: [],
  } as unknown as ExtensionContext;
  registerTaskCommands(context, auth);
});

afterEach(() => {
  for (const item of context.subscriptions) item?.dispose();
  vi.unstubAllGlobals();
});

async function run(command: string, ...args: unknown[]): Promise<void> {
  await (state.handlers.get(command) as ((...a: unknown[]) => Promise<void>) | undefined)?.(
    ...args,
  );
}

const sessionChangedWarning =
  "LMS への接続が変わったため、提出をやめました。もう一度「提出する」を押してください";

async function expectNoSubmissionAfterSwitch() {
  const { apiRequest: realRequest } = await vi.importActual<typeof import("./api.js")>("./api.js");
  const fetch = vi.fn(async () => Response.json({ error: "Unexpected request" }, { status: 500 }));
  vi.stubGlobal("fetch", fetch);
  apiRequest.mockImplementation(async (url, options) =>
    url !== "/api/tasks/local-result" &&
    url !== "/api/tasks/local-runs" &&
    (options as { session?: number } | undefined)?.session !== undefined
      ? realRequest(String(url), options as Parameters<typeof realRequest>[1])
      : {},
  );
  return () => {
    expect(fetch).not.toHaveBeenCalled();
    expect(vscodeMock.showWarningMessage).toHaveBeenCalledWith(sessionChangedWarning);
    expect(vscodeMock.showErrorMessage).not.toHaveBeenCalled();
  };
}

it("stella.openWalkthrough は呼ばれたときに拡張の ID でウォークスルーを開く", async () => {
  expect(vscodeMock.executeCommand).not.toHaveBeenCalledWith(
    "workbench.action.openWalkthrough",
    expect.anything(),
    expect.anything(),
  );
  await run("stella.openWalkthrough");
  expect(vscodeMock.executeCommand).toHaveBeenCalledWith(
    "workbench.action.openWalkthrough",
    "test-publisher.test-extension#stella.gettingStarted",
    false,
  );
});

describe("stella.submitTask", () => {
  const passingHtml = "<h1>今日の学習予定</h1>";
  const failedNotice = "直すところがあります。まだ提出していません。結果のパネルを確認してください";

  async function distributedTask(html = passingHtml): Promise<string> {
    const root = await makeTask(
      { ...staticTask, protected: ["tests/**"] },
      {
        "index.html": html,
        "tests/README.md": "配布したテスト",
        ".stella/distribution.json": JSON.stringify({
          taskId: staticTask.id,
          contentHash: "ab".repeat(32),
        }),
      },
    );
    state.folders = [root];
    return root;
  }

  const localReports = () =>
    apiRequest.mock.calls.filter(
      ([url]) => url === "/api/tasks/local-result" || url === "/api/tasks/local-runs",
    );

  it("初回は確認して振り返りを開き、次は前回の合格を再利用する", async () => {
    const root = await distributedTask();
    await run("stella.submitTask", { scheme: "file", fsPath: path.join(root, "index.html") });
    expect(vscodeMock.progress).toHaveBeenCalledWith(
      expect.objectContaining({ title: "提出の前に確認しています: 見出しを変える" }),
    );
    expect(vscodeMock.showTaskPanel).toHaveBeenCalledWith(
      expect.objectContaining({ result: expect.objectContaining({ outcome: "passed" }) }),
      { reveal: false },
    );
    expect(vscodeMock.showInformationMessage).not.toHaveBeenCalledWith(
      "手元の確認がすべて通りました",
    );
    await run("stella.submitTask", root);
    expect(vscodeMock.showSubmissionForm).toHaveBeenCalledTimes(2);
    expect(vscodeMock.progress).toHaveBeenCalledTimes(1);
    expect(localReports().map(([url]) => url)).toEqual(["/api/tasks/local-result"]);
    expect(vscodeMock.sendTaskSubmission).not.toHaveBeenCalled();
  });

  it("手元の確認の報告が応答しなくても振り返りを開き、提出コマンドは戻る", async () => {
    const root = await distributedTask();
    let releaseReport: () => void = () => undefined;
    apiRequest.mockReturnValueOnce(
      new Promise((resolve) => {
        releaseReport = () => resolve({});
      }),
    );
    const completed = vi.fn();
    const submitting = run("stella.submitTask", root).then(completed);
    try {
      await vi.waitFor(() => expect(completed).toHaveBeenCalledOnce());
      expect(localReports().map(([url]) => url)).toEqual(["/api/tasks/local-result"]);
      expect(vscodeMock.showSubmissionForm).toHaveBeenCalledOnce();
    } finally {
      releaseReport();
      await submitting;
    }
  });

  it("配布記録ができる前の合格は再利用しない", async () => {
    const root = await distributedTask();
    const receiptFile = path.join(root, ".stella", "distribution.json");
    const receipt = await readFile(receiptFile);
    await unlink(receiptFile);
    await run("stella.runTask", root);
    await writeFile(receiptFile, receipt);
    await run("stella.submitTask", root);
    expect(runTask).toHaveBeenCalledTimes(2);
    expect(vscodeMock.showSubmissionForm).toHaveBeenCalledOnce();
  });

  it("確認中に接続が変わると、振り返りフォームから送信しない", async () => {
    const assertBlocked = await expectNoSubmissionAfterSwitch();
    const { sendTaskSubmission } =
      await vi.importActual<typeof import("./task-submission.js")>("./task-submission.js");
    vscodeMock.sendTaskSubmission.mockImplementationOnce(sendTaskSubmission);
    const root = await distributedTask();
    const { runTask: realRunTask } =
      await vi.importActual<typeof import("./runner/run-task.js")>("./runner/run-task.js");
    vi.mocked(runTask).mockImplementationOnce(async (options) => {
      await auth.setToken("another-learner");
      return realRunTask(options);
    });
    await run("stella.submitTask", root);
    expect(vscodeMock.showSubmissionForm).toHaveBeenCalledOnce();
    const actions = vscodeMock.showSubmissionForm.mock.calls[0]?.[1];
    await actions.submit({ explanation: "振り返り" });
    assertBlocked();
  });

  it.each([
    ["index.html", passingHtml + "<p>追記</p>"],
    ["tests/README.md", "変更したテスト"],
    [
      ".stella/task.json",
      JSON.stringify({ ...staticTask, title: "新しい題", protected: ["tests/**"] }),
    ],
    [
      ".stella/distribution.json",
      JSON.stringify({ taskId: staticTask.id, contentHash: "cd".repeat(32) }),
    ],
  ])("%s が変わったら確認をやり直す", async (file, content) => {
    const root = await distributedTask();
    await run("stella.runTask", root);
    expect(vscodeMock.showSubmissionForm).not.toHaveBeenCalled();
    await writeFile(path.join(root, file), content);
    await run("stella.submitTask", root);
    expect(vscodeMock.showSubmissionForm).toHaveBeenCalledTimes(1);
    expect(vscodeMock.progress).toHaveBeenCalledTimes(2);
    expect(localReports().map(([url]) => url)).toEqual([
      "/api/tasks/local-result",
      "/api/tasks/local-result",
    ]);
  });

  it("保存していない変更があれば保存を尋ね、保存した内容を確認する", async () => {
    const root = await distributedTask();
    await run("stella.runTask", root);
    const file = path.join(root, "index.html");
    state.warningChoice = "保存して提出する";
    state.dirtyDocs = [
      {
        isDirty: true,
        uri: { scheme: "file", fsPath: file },
        save: async () => {
          await writeFile(file, "<h1>見直し中</h1>");
          state.dirtyDocs = [];
          return true;
        },
      },
    ];
    await run("stella.submitTask", root);
    expect(vscodeMock.showWarningMessage).toHaveBeenCalledWith(
      "保存していないファイルが 1 件あります。提出するのは保存した内容です。",
      "保存して提出する",
    );
    expect(vscodeMock.showWarningMessage).toHaveBeenCalledWith(failedNotice);
    expect(vscodeMock.showSubmissionForm).not.toHaveBeenCalled();
    expect(localReports().map(([url]) => url)).toEqual([
      "/api/tasks/local-result",
      "/api/tasks/local-runs",
    ]);
  });

  it.each([undefined, "保存して提出する"])(
    "保存の選択が %s で保存できなければ提出前の確認を始めない",
    async (choice) => {
      const root = await distributedTask();
      const save = vi.fn(async () => false);
      state.warningChoice = choice;
      state.dirtyDocs = [
        { isDirty: true, uri: { scheme: "file", fsPath: path.join(root, "index.html") }, save },
      ];
      await run("stella.submitTask", root);
      expect(vscodeMock.showWarningMessage).toHaveBeenNthCalledWith(
        1,
        "保存していないファイルが 1 件あります。提出するのは保存した内容です。",
        "保存して提出する",
      );
      expect(save).toHaveBeenCalledTimes(choice ? 1 : 0);
      if (choice) {
        expect(vscodeMock.showWarningMessage).toHaveBeenNthCalledWith(
          2,
          "index.html を保存できなかったため、提出をやめました。保存してからもう一度実行してください",
        );
      }
      expect(runTask).not.toHaveBeenCalled();
      expect(vscodeMock.showSubmissionForm).not.toHaveBeenCalled();
      expect(apiRequest).not.toHaveBeenCalled();
    },
  );

  it.each(["stella.runTask", "stella.submitTask"])(
    "%s で確認結果を保存できなければ警告を出し、要約を送らない",
    async (command) => {
      const root = await distributedTask();
      await mkdir(path.join(root, ".stella", "last-run.json"));
      await run(command, root);
      expect(runTask).toHaveBeenCalledTimes(1);
      expect(vscodeMock.showWarningMessage).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining("確認の結果を .stella/last-run.json に保存できませんでした"),
      );
      expect(vscodeMock.showInformationMessage).not.toHaveBeenCalled();
      expect(vscodeMock.showTaskPanel).not.toHaveBeenCalled();
      expect(vscodeMock.showSubmissionForm).not.toHaveBeenCalled();
      expect(apiRequest).not.toHaveBeenCalled();
    },
  );

  it.each(["failed", "error", "cancelled"] as const)(
    "確認が %s なら提出に進まない",
    async (outcome) => {
      const root = await distributedTask("<h1>見直し中</h1>");
      const actual =
        await vi.importActual<typeof import("./runner/run-task.js")>("./runner/run-task.js");
      vi.mocked(runTask).mockImplementationOnce(async (options) => ({
        ...(await actual.runTask(options)),
        outcome,
      }));
      await run("stella.submitTask", root);
      expect(vscodeMock.showSubmissionForm).not.toHaveBeenCalled();
      expect(vscodeMock.sendTaskSubmission).not.toHaveBeenCalled();
      expect(apiRequest).not.toHaveBeenCalledWith("/api/submissions", expect.anything());
      if (outcome === "cancelled") {
        expect(vscodeMock.showInformationMessage).toHaveBeenCalledWith("確認を中断しました");
        expect(vscodeMock.showTaskPanel).not.toHaveBeenCalled();
        expect(localReports()).toHaveLength(0);
      } else {
        expect(vscodeMock.showTaskPanel).toHaveBeenCalledWith(
          expect.objectContaining({ result: expect.objectContaining({ outcome }) }),
        );
        expect(localReports().map(([url]) => url)).toEqual(["/api/tasks/local-runs"]);
        if (outcome === "failed") {
          expect(vscodeMock.showWarningMessage).toHaveBeenCalledWith(failedNotice);
        } else {
          expect(vscodeMock.showErrorMessage).toHaveBeenCalledWith(
            "環境の問題で確認できませんでした。まだ提出していません。結果のパネルを確認してください",
            "ログを表示",
          );
        }
      }
    },
  );

  it.each(["stella.runTask", "stella.submitTask"])(
    "%s の確認中に提出を押すと、待つように知らせる",
    async (command) => {
      const root = await distributedTask();
      const actual =
        await vi.importActual<typeof import("./runner/run-task.js")>("./runner/run-task.js");
      let releaseCheck: () => void = () => undefined;
      const pendingCheck = new Promise<void>((resolve) => {
        releaseCheck = resolve;
      });
      vi.mocked(runTask).mockImplementationOnce(async (options) => {
        await pendingCheck;
        return actual.runTask(options);
      });
      const checking = run(command, root);
      try {
        await vi.waitFor(() => expect(runTask).toHaveBeenCalledOnce());
        vscodeMock.showInformationMessage.mockClear();
        await run("stella.submitTask", root);
        expect(vscodeMock.showInformationMessage).toHaveBeenCalledExactlyOnceWith(
          "いま確認しています。終わるまで待ってください",
        );
        await run("stella.runTask", root);
        expect(vscodeMock.progress).toHaveBeenCalledTimes(1);
      } finally {
        releaseCheck();
        await checking;
      }
      expect(vscodeMock.showSubmissionForm).toHaveBeenCalledTimes(
        command === "stella.submitTask" ? 1 : 0,
      );
    },
  );
});

describe("提出の振り返り画面", () => {
  it("提出に入力欄を重ねず、下書きと自動記録した支援を保存する", async () => {
    const root = await makeTask(staticTask, { "index.html": "<h1>今日の学習予定</h1>" });
    state.folders = [root];
    state.activeFile = path.join(root, "index.html");
    await run("stella.runTask");
    const support = [{ kind: "fixed-start", at: "2026-11-03T00:00:00.000Z" }];
    await writeFile(path.join(root, ".stella", "support.json"), JSON.stringify(support));
    await run("stella.submitTask", root);
    expect(vscodeMock.showInputBox).not.toHaveBeenCalled();
    expect(vscodeMock.showSubmissionForm).toHaveBeenCalledWith(
      expect.objectContaining({ title: "見出しを変える", mode: "submit" }),
      expect.anything(),
    );
    const actions = vscodeMock.showSubmissionForm.mock.calls[0]?.[1] as {
      save: (draft: { explanation: string }) => Promise<void>;
      submit: (draft: { explanation: string }) => Promise<void>;
    };
    await actions.save({ explanation: "見出しを変え、表示を確認しました。" });
    const saved = JSON.parse(
      await readFile(path.join(root, ".stella", "submission-notes.json"), "utf8"),
    );
    expect(saved.support).toEqual(support);
    expect(saved.explanation).toBe("見出しを変え、表示を確認しました。");
    state.dirtyDocs = [
      { isDirty: true, uri: { scheme: "file", fsPath: state.activeFile }, save: async () => true },
    ];
    await expect(actions.submit({ explanation: "振り返り" })).rejects.toThrow("保存していない変更");
  });
});

describe("提出後の案内", () => {
  async function submit(
    mode: "submit" | "consult",
    choice?: string | Promise<string | undefined>,
    openReadme = false,
  ): Promise<string> {
    const root = await makeTask(staticTask, {
      "index.html": mode === "submit" ? "<h1>今日の学習予定</h1>" : "<h1>未完成</h1>",
      "README.md": "# 見出しを変える",
    });
    state.folders = [root];
    await run("stella.runTask", root);
    await run(mode === "submit" ? "stella.submitTask" : "stella.consultTask", root);
    const actions = vscodeMock.showSubmissionForm.mock.calls[0]?.[1] as {
      submit: (draft: { explanation: string }) => Promise<void>;
    };
    vscodeMock.showInformationMessage.mockResolvedValueOnce(choice);
    if (openReadme) {
      state.readmeRoot = root;
      await writeDistribution(root);
      apiRequest.mockResolvedValueOnce({ status: "local-passed" });
      await run("stella.showTaskReadme", root);
    }
    await actions.submit({ explanation: "振り返り" });
    return root;
  }

  it.each(["submit", "consult"] as const)(
    "%s 成功後に開いている課題文と学習ガイドを更新する",
    async (mode) => {
      const status = mode === "submit" ? "submitted" : "instructor-pending";
      vscodeMock.sendTaskSubmission.mockImplementationOnce(async () => {
        apiRequest.mockResolvedValue({ status });
        return { id: "submission", attempt: 1 };
      });
      const root = await submit(mode, undefined, true);
      expect(vscodeMock.refreshLearningSidebar).toHaveBeenCalledOnce();
      await vi.waitFor(() =>
        expect(vscodeMock.showTaskReadme).toHaveBeenCalledWith(
          expect.objectContaining({ root, guide: expect.objectContaining({ taskStatus: status }) }),
          { reveal: false },
        ),
      );
      expect(
        apiRequest.mock.calls.filter(([url]) => String(url).startsWith("/api/tasks/help?")),
      ).toHaveLength(2);
    },
  );

  it("提出後に結果を見ると、提出した課題フォルダーで既存のコマンドを実行する", async () => {
    const root = await submit("submit", "結果を見る");
    expect(vscodeMock.showInformationMessage).toHaveBeenLastCalledWith(
      "提出しました。AI が確かめた結果は、ふつう数分で届きます。",
      "結果を見る",
      "Web で開く",
    );
    expect(vscodeMock.executeCommand).toHaveBeenCalledWith("stella.showTaskHelp", root);
    expect(vscodeMock.openExternal).not.toHaveBeenCalled();
  });

  it("通知のボタンを選ぶのを待たずに、提出フォームの処理を完了する", async () => {
    await submit("submit", new Promise<string | undefined>(() => undefined));
    expect(vscodeMock.sendTaskSubmission).toHaveBeenCalledTimes(1);
    expect(vscodeMock.executeCommand).not.toHaveBeenCalled();
  });

  it("課題一覧で分かったステージと課題文の ID をエンコードして Web で開く", async () => {
    vscodeMock.getCachedCatalog.mockReturnValue([
      {
        sections: [
          { lessons: [{ stageId: "stage/1", id: "lesson?2", task: { id: staticTask.id } }] },
        ],
      },
    ]);
    await submit("submit", "Web で開く");
    expect(vscodeMock.openExternal).toHaveBeenCalledWith({
      scheme: "https",
      url: "https://stella.example/stages/stage%2F1/lessons/lesson%3F2",
    });
  });

  it("別の課題の ID しかなければホームを開く", async () => {
    vscodeMock.getCachedCatalog.mockReturnValue([
      { sections: [{ lessons: [{ stageId: "stage", id: "lesson", task: { id: "other" } }] }] },
    ]);
    await submit("submit", "Web で開く");
    expect(vscodeMock.openExternal).toHaveBeenCalledWith({
      scheme: "https",
      url: "https://stella.example/",
    });
  });

  it("相談後は返事が届く場所を示し、Web のボタンだけを出す。ID が無ければホームへ戻る", async () => {
    await submit("consult", "Web で開く");
    expect(vscodeMock.showInformationMessage).toHaveBeenLastCalledWith(
      "相談を送りました。管理者の返事は通知と、Web の教材の画面の『提出・レビューを確認する』に届きます。",
      "Web で開く",
    );
    expect(vscodeMock.openExternal).toHaveBeenCalledWith({
      scheme: "https",
      url: "https://stella.example/",
    });
    expect(vscodeMock.executeCommand).not.toHaveBeenCalled();
  });
});

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

  it.each(["node-test", "git-record"])(
    "%s は信頼していないフォルダーでは実行しない",
    async (runner) => {
      const root = await makeTask(
        {
          ...staticTask,
          runner,
          static: undefined,
          ...(runner === "git-record"
            ? { git: { checks: [{ type: "learning-folder-root" }] } }
            : {}),
        },
        { "index.html": "" },
      );
      state.trusted = false;
      state.folders = [root];
      state.warningChoice = "フォルダーを信頼する";
      await run("stella.runTask");
      expect(vscodeMock.showTaskPanel).not.toHaveBeenCalled();
      expect(vscodeMock.executeCommand).toHaveBeenCalledWith("workbench.trust.manage");
    },
  );

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

  it("保存できなかったファイルがあれば、ディスクの古い内容で確かめない", async () => {
    const root = await makeTask(staticTask, { "index.html": "<h1>今日の学習予定</h1>" });
    state.folders = [root];
    state.warningChoice = "保存して確認する";
    state.dirtyDocs = [
      {
        isDirty: true,
        uri: { scheme: "file", fsPath: path.join(root, "index.html") },
        save: vi.fn(async () => false),
      },
    ];
    await run("stella.runTask");
    expect(vscodeMock.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining("index.html を保存できなかったため"),
    );
    expect(vscodeMock.showTaskPanel).not.toHaveBeenCalled();
    await expect(readFile(path.join(root, ".stella", "last-run.json"), "utf8")).rejects.toThrow();
  });

  it("ワークスペースの外で開いたファイルからは課題を探さない", async () => {
    const outsideTask = await makeTask(staticTask, { "index.html": "<h1>今日の学習予定</h1>" });
    const workspace = await mkdtemp(path.join(tmpdir(), "stella-ws-"));
    state.folders = [workspace];
    state.activeFile = path.join(outsideTask, "index.html");
    await run("stella.runTask");
    expect(vscodeMock.showTaskPanel).not.toHaveBeenCalled();
    expect(vscodeMock.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining(".stella/task.json がある課題フォルダー"),
    );
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

async function writeDistribution(root: string): Promise<void> {
  await writeFile(
    path.join(root, ".stella", "distribution.json"),
    JSON.stringify({ taskId: staticTask.id, contentHash: "ab".repeat(32) }),
  );
}

describe("課題文のパネル・ステータスバー・エディターの右上から", () => {
  /** 学習フォルダー (ワークスペース) の中の課題。 */
  async function trainingTask(): Promise<{ workspace: string; root: string }> {
    const workspace = await mkdtemp(path.join(tmpdir(), "stella-ws-"));
    const root = await makeTask(
      { ...staticTask, protected: ["tests/**"] },
      {
        "index.html": "<h1>今日の学習予定</h1>",
        "README.md": "# 見出しを変える\n\n本文",
        "tests/README.md": "テスト",
      },
      workspace,
    );
    state.folders = [workspace];
    return { workspace, root };
  }

  it("課題フォルダーを受け取り、編集するファイルと前回の結果を進め方に渡す", async () => {
    const { root } = await trainingTask();
    await run("stella.showTaskReadme", root);
    expect(vscodeMock.showTaskReadme).toHaveBeenCalledWith(
      {
        title: "見出しを変える",
        markdown: "# 見出しを変える\n\n本文",
        root,
        guide: {
          root,
          manifest: expect.objectContaining({ id: staticTask.id }),
          edit: { files: ["index.html"], missing: [] },
        },
      },
      {},
    );
    expect(vscodeMock.setCurrentTask).toHaveBeenCalledWith({
      root,
      title: "見出しを変える",
      taskId: staticTask.id,
    });
    expect(apiRequest).not.toHaveBeenCalled();
  });

  const helpEndpoint = `/api/tasks/help?taskId=${encodeURIComponent(staticTask.id)}&contentHash=${"ab".repeat(32)}`;
  const readGuide = () =>
    vscodeMock.showTaskReadme.mock.lastCall?.[0].guide as Omit<TaskGuideInput, "os">;

  it("配布記録の版で取得し、状態だけを進め方に渡す", async () => {
    const { root } = await trainingTask();
    await writeDistribution(root);
    apiRequest.mockResolvedValueOnce({ status: "submitted", notes: "レビューの所見" });
    await run("stella.showTaskReadme", root);
    expect(apiRequest).toHaveBeenCalledWith(helpEndpoint, {
      session: 1,
      signal: expect.any(AbortSignal),
    });
    expect(readGuide()).toHaveProperty("taskStatus", "submitted");
    expect(buildTaskGuideHtml({ ...readGuide(), os: "windows" })).not.toContain("レビューの所見");
  });

  it.each([{ openGuide: true }, { openGuide: false }])(
    "手元で合格しても再提出なら相談を送れる ($openGuide)",
    async ({ openGuide }) => {
      const { root } = await trainingTask();
      await writeDistribution(root);
      await run("stella.runTask", root);
      if (openGuide) {
        apiRequest.mockResolvedValueOnce({ status: "resubmit" });
        await run("stella.showTaskReadme", root);
        expect(readGuide()).toHaveProperty("taskStatus", "resubmit");
      }
      apiRequest.mockResolvedValueOnce({ status: "resubmit" });
      await run("stella.consultTask", root);
      expect(apiRequest.mock.calls.filter(([url]) => url === helpEndpoint)).toHaveLength(
        openGuide ? 2 : 1,
      );
      expect(vscodeMock.showSubmissionForm).toHaveBeenCalledWith(
        expect.objectContaining({ mode: "consult" }),
        expect.anything(),
      );
      const { sendTaskSubmission } =
        await vi.importActual<typeof import("./task-submission.js")>("./task-submission.js");
      vscodeMock.sendTaskSubmission.mockImplementationOnce(sendTaskSubmission);
      apiRequest
        .mockResolvedValueOnce({
          bundle: { manifest: staticTask, files: {}, contentHash: "ab".repeat(32) },
        })
        .mockResolvedValueOnce({ row: { id: "consultation", attempt: 2 } });
      const actions = vscodeMock.showSubmissionForm.mock.calls[0]?.[1];
      await actions.submit({ explanation: "再提出の理由を確認したいです。" });
      expect(apiRequest).toHaveBeenCalledWith(
        "/api/submissions",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            mode: "consult",
            localResult: expect.objectContaining({ outcome: "passed" }),
            support: [expect.objectContaining({ kind: "instructor" })],
          }),
        }),
      );
    },
  );

  it.each(["passed", "offline"])(
    "手元で合格し、再提出の状態が取れなければ相談を開かない (%s)",
    async (status) => {
      const { root } = await trainingTask();
      await writeDistribution(root);
      await run("stella.runTask", root);
      if (status === "offline") apiRequest.mockRejectedValueOnce(new Error("offline"));
      else apiRequest.mockResolvedValueOnce({ status });
      await run("stella.consultTask", root);
      expect(vscodeMock.showSubmissionForm).not.toHaveBeenCalled();
      expect(vscodeMock.showErrorMessage).toHaveBeenCalledWith(
        "手元の確認が通っています。「提出」を使ってください",
      );
    },
  );

  it.each(["resubmit", "passed"])(
    "手元で合格した課題の相談はキャッシュの submitted に代えて最新の %s で判定する",
    async (status) => {
      const { root } = await trainingTask();
      await writeDistribution(root);
      await run("stella.runTask", root);
      apiRequest.mockResolvedValueOnce({ status: "submitted" });
      await run("stella.showTaskReadme", root);
      expect(readGuide()).toHaveProperty("taskStatus", "submitted");

      apiRequest.mockResolvedValueOnce({ status });
      await run("stella.consultTask", root);
      expect(apiRequest.mock.calls.filter(([url]) => url === helpEndpoint)).toHaveLength(2);
      if (status === "resubmit") {
        expect(vscodeMock.showSubmissionForm).toHaveBeenCalledWith(
          expect.objectContaining({ mode: "consult" }),
          expect.anything(),
        );
      } else {
        expect(vscodeMock.showSubmissionForm).not.toHaveBeenCalled();
        expect(vscodeMock.showErrorMessage).toHaveBeenCalledWith(
          "手元の確認が通っています。「提出」を使ってください",
        );
      }
    },
  );

  it("明示的に課題文を開くと 30 秒以内でも状態を取得し直す", async () => {
    const { root } = await trainingTask();
    await writeDistribution(root);
    apiRequest.mockResolvedValueOnce({ status: "submitted" });
    await run("stella.showTaskReadme", root);
    expect(readGuide()).toHaveProperty("taskStatus", "submitted");
    apiRequest.mockResolvedValueOnce({ status: "passed" });
    await run("stella.showTaskReadme", root);
    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(readGuide()).toHaveProperty("taskStatus", "passed");
  });

  it.each(["未接続", "通信失敗", "認証切れ", "未知の状態"] as const)(
    "%s でも手元で合格したときの表示を出す",
    async (failure) => {
      const { root } = await trainingTask();
      await run("stella.runTask", root);
      await writeDistribution(root);
      apiRequest.mockClear();
      if (failure === "未接続") vscodeMock.getSecret.mockResolvedValue(undefined);
      if (failure === "通信失敗") apiRequest.mockRejectedValueOnce(new Error("offline"));
      if (failure === "認証切れ") apiRequest.mockRejectedValueOnce(new AuthExpiredError());
      if (failure === "未知の状態") apiRequest.mockResolvedValueOnce({ status: "unexpected" });
      vscodeMock.showInformationMessage.mockClear();
      await run("stella.showTaskReadme", root);
      const guide = readGuide();
      expect(guide).not.toHaveProperty("taskStatus");
      expect(buildTaskGuideHtml({ ...guide, os: "windows" })).toContain("確認はすべて通りました");
      expect(vscodeMock.showErrorMessage).not.toHaveBeenCalled();
      expect(vscodeMock.showInformationMessage).not.toHaveBeenCalled();
      expect(apiRequest).toHaveBeenCalledTimes(failure === "未接続" ? 0 : 1);
    },
  );

  it("状態の取得が終わらなければ 4 秒で打ち切って課題文を表示する", async () => {
    const { root } = await trainingTask();
    await writeDistribution(root);
    let started!: (signal: AbortSignal) => void;
    const requestStarted = new Promise<AbortSignal>((resolve) => {
      started = resolve;
    });
    apiRequest.mockImplementationOnce(async (_url, options) => {
      started((options as { signal: AbortSignal }).signal);
      return new Promise(() => undefined);
    });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const rendering = run("stella.showTaskReadme", root);
      const signal = await requestStarted;
      await vi.advanceTimersByTimeAsync(3_999);
      expect(vscodeMock.showTaskReadme).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await rendering;
      expect(signal.aborted).toBe(true);
      expect(readGuide()).not.toHaveProperty("taskStatus");
      expect(vscodeMock.showErrorMessage).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("課題文のパネルが再び見えたら、フォーカスを動かさず描き直す", async () => {
    const { root } = await trainingTask();
    await writeDistribution(root);
    state.readmeRoot = root;
    apiRequest.mockResolvedValueOnce({ status: "passed" });
    const listener = vscodeMock.onTaskReadmeVisible.mock.lastCall?.[0];
    listener(root);
    await vi.waitFor(() =>
      expect(vscodeMock.showTaskReadme).toHaveBeenCalledWith(
        expect.objectContaining({ root, guide: expect.objectContaining({ taskStatus: "passed" }) }),
        { reveal: false },
      ),
    );
    expect(vscodeMock.setCurrentTask).not.toHaveBeenCalled();
  });

  it("開いているファイルが無くても、受け取った課題フォルダーで確認し、開いている課題文を描き直す", async () => {
    const { root } = await trainingTask();
    state.readmeRoot = root;
    await run("stella.runTask", root);
    expect(vscodeMock.showTaskPanel).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "result", root }),
    );
    await vi.waitFor(() =>
      expect(vscodeMock.showTaskReadme).toHaveBeenCalledWith(
        expect.objectContaining({
          guide: expect.objectContaining({
            lastRun: {
              outcome: "passed",
              steps: [
                { label: "HTML の確認", status: "passed", tests: { passed: 1, total: 1 } },
                { label: "提出するファイルの確認", status: "passed" },
              ],
              tests: { passed: 1, total: 1 },
            },
          }),
        }),
        { reveal: false },
      ),
    );
    // 描き直しはステータスバーの課題を変えない (確認の間に別の課題へ移っているかもしれない)。
    expect(vscodeMock.setCurrentTask).not.toHaveBeenCalled();
  });

  it("エディターの右上のボタンはファイルの URI を渡す", async () => {
    const { root } = await trainingTask();
    await run("stella.runTask", { scheme: "file", fsPath: path.join(root, "index.html") });
    expect(vscodeMock.showTaskPanel).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "result", root }),
    );
    // 課題文のパネルを開いていなければ描かない。
    expect(vscodeMock.showTaskReadme).not.toHaveBeenCalled();
  });

  it("課題フォルダーでない場所・ワークスペースの外は受け取らない", async () => {
    const { workspace } = await trainingTask();
    const outside = await makeTask(staticTask, { "README.md": "x" });
    for (const requested of [path.join(workspace, "course"), outside]) {
      await run("stella.showTaskReadme", requested);
      await run("stella.runTask", requested);
      await run("stella.submitTask", requested);
    }
    await run("stella.submitTask", { scheme: "file", fsPath: path.join(outside, "README.md") });
    expect(vscodeMock.showSubmissionForm).not.toHaveBeenCalled();
    expect(vscodeMock.showErrorMessage).toHaveBeenCalledTimes(3);
    expect(vscodeMock.showTaskReadme).not.toHaveBeenCalled();
    expect(vscodeMock.showTaskPanel).not.toHaveBeenCalled();
    expect(vscodeMock.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining(".stella/task.json がある課題フォルダー"),
    );
  });

  it("進め方のリンクは、編集するファイルだけを左の列で開く", async () => {
    const { root, workspace } = await trainingTask();
    await run("stella.openTaskFile", root, "index.html");
    const opens = () =>
      vscodeMock.executeCommand.mock.calls.filter((call) => call[0] === "vscode.open");
    // 画像などテキストでないファイルも開けるよう vscode.open で開く。
    expect(opens()).toEqual([
      [
        "vscode.open",
        { scheme: "file", fsPath: path.join(root, "index.html") },
        { viewColumn: 1, preview: false },
      ],
    ]);
    // 配布したテスト・課題の外・課題フォルダーでない場所は開かない。
    for (const [requested, rel] of [
      [root, "tests/README.md"],
      [root, "../q04/index.html"],
      [root, ".stella/task.json"],
      [workspace, "course/unit/q05/index.html"],
      [root, 1],
    ] as const) {
      await run("stella.openTaskFile", requested, rel);
    }
    expect(opens()).toHaveLength(1);
    expect(vscodeMock.showErrorMessage).toHaveBeenCalledTimes(5);
  });
});

describe("stella.runTask (CI と公開の課題)", () => {
  const WORKFLOW = ".github/workflows/deploy.yml";
  const ciTask = {
    schemaVersion: 1,
    id: "deploy-ops-basics/u05-ci/q01",
    title: "テストが通ってから公開する",
    kind: "basic",
    runner: "ci-deploy",
    submit: { files: [WORKFLOW] },
    ci: { workflow: WORKFLOW },
  };
  const runUrl = "https://github.com/yamada/web-deploy/actions/runs/123456";
  const deployUrl = "https://yamada.github.io/web-deploy/";
  type InputOptions = {
    value?: string;
    validateInput?: (value: string) => string | undefined;
  };
  const inputOptions = (index: number) =>
    vscodeMock.showInputBox.mock.calls[index]?.[0] as InputOptions;

  it("信頼していないフォルダーでは、URL を尋ねず Git も起動しない", async () => {
    const root = await makeTask(ciTask, { [WORKFLOW]: "name: Deploy\n" });
    state.trusted = false;
    state.folders = [root];
    await run("stella.runTask");
    expect(vscodeMock.showInputBox).not.toHaveBeenCalled();
    expect(vscodeMock.showTaskPanel).not.toHaveBeenCalled();
  });

  it("実行の URL と公開先の URL を形だけ確かめて尋ね、取り消したら確認しない", async () => {
    const root = await makeTask(ciTask, { [WORKFLOW]: "name: Deploy\n" });
    state.folders = [root];
    state.inputs = [runUrl, undefined];
    await run("stella.runTask");
    expect(vscodeMock.showInputBox).toHaveBeenCalledTimes(2);
    const first = inputOptions(0);
    expect(first.validateInput?.(runUrl)).toBeUndefined();
    expect(first.validateInput?.(` ${runUrl} `)).toBeUndefined();
    expect(first.validateInput?.(`${runUrl}?x=1`)).toContain("https://github.com/");
    expect(
      first.validateInput?.("https://github.com@evil.example/a/b/actions/runs/1"),
    ).toBeTruthy();
    const second = inputOptions(1);
    expect(second.validateInput?.(deployUrl)).toBeUndefined();
    expect(second.validateInput?.("http://localhost:3000")).toBeTruthy();
    expect(vscodeMock.showTaskPanel).not.toHaveBeenCalled();
  });

  it("入力した URL を結果に残し、次の確認の初期値にする", async () => {
    const root = await makeTask(ciTask, { [WORKFLOW]: "name: Deploy\n" });
    state.folders = [root];
    state.inputs = [` ${runUrl} `, deployUrl];
    await run("stella.runTask");
    // Git のリポジトリではないので要修正になるが、形を確かめた URL は控える。
    expect(vscodeMock.showTaskPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "result",
        result: expect.objectContaining({ outcome: "failed", ci: { runUrl, deployUrl } }),
      }),
    );
    const saved = JSON.parse(await readFile(path.join(root, ".stella", "last-run.json"), "utf8"));
    expect(saved.ci).toEqual({ runUrl, deployUrl });
    vscodeMock.showInputBox.mockClear();
    state.inputs = [undefined];
    await run("stella.runTask");
    expect(inputOptions(0).value).toBe(runUrl);
  });

  it.each(["ci-deploy", "git-record"] as const)(
    "%s の提出はファイルが変わっていなくても確認を実行する",
    async (runner) => {
      const task =
        runner === "ci-deploy"
          ? ciTask
          : {
              ...ciTask,
              runner,
              ci: undefined,
              git: { checks: [{ type: "learning-folder-root" }] },
            };
      const contentHash = "ab".repeat(32);
      const root = await makeTask(task, {
        [WORKFLOW]: "name: Deploy\n",
        ".stella/distribution.json": JSON.stringify({ taskId: task.id, contentHash }),
      });
      state.folders = [root];
      const previous: RunResult = {
        schemaVersion: 1,
        taskId: task.id,
        runner,
        outcome: "passed",
        startedAt: "2026-11-01T00:00:00.000Z",
        durationMs: 1,
        platform: process.platform,
        toolVersions: {},
        steps: [],
        files: [await hashFile(root, WORKFLOW)],
        protected: [],
        manifestSha256: (await hashFile(root, ".stella/task.json")).sha256,
        taskContentHash: contentHash,
        ...(runner === "ci-deploy" ? { ci: { runUrl, deployUrl, commit: "a".repeat(40) } } : {}),
      };
      await saveRunResult(root, previous);
      const loaded = await loadTask(root);
      if (!loaded.ok) throw new Error(loaded.errors.join("\n"));
      await expect(prepareLocalTaskSubmission(loaded, "submit")).resolves.toMatchObject({
        localResult: previous,
      });

      const newRunUrl = "https://github.com/yamada/web-deploy/actions/runs/123457";
      state.inputs = [newRunUrl, deployUrl];
      vi.mocked(runTask).mockImplementationOnce(async ({ ci }) => ({
        ...previous,
        ...(ci ? { ci: { ...ci, commit: "b".repeat(40) } } : {}),
      }));
      await run("stella.submitTask", root);

      expect(runTask).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          root,
          ci: runner === "ci-deploy" ? { runUrl: newRunUrl, deployUrl } : undefined,
        }),
      );
      if (runner === "ci-deploy") {
        expect(vscodeMock.showInputBox).toHaveBeenCalledTimes(2);
        expect(inputOptions(0).value).toBe(runUrl);
        expect(inputOptions(1).value).toBe(deployUrl);
      } else {
        expect(vscodeMock.showInputBox).not.toHaveBeenCalled();
      }
      expect(vscodeMock.showSubmissionForm).toHaveBeenCalledTimes(1);
    },
  );
});

const problemTask = {
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
  protected: ["tests/**"],
  checks: { lint: false, format: false },
};

describe("問題つきの課題", () => {
  async function problemRoot(
    source = "export const add = 1;\n",
    outcome: "passed" | "failed" = "passed",
    staged = false,
  ): Promise<string> {
    const root = await makeTask(
      { ...problemTask, ...(staged ? { problemSteps: true } : {}) },
      {
        "src/q01-add.ts": source,
        "src/q02-sub.ts": "export const sub = 1;\n",
        "README.md": "# 計算",
      },
    );
    const hashed = await hashFile(root, "src/q01-add.ts");
    const taskJson = await hashFile(root, ".stella/task.json");
    const run = {
      schemaVersion: 1,
      taskId: problemTask.id,
      runner: "node-test",
      outcome,
      startedAt: "2026-11-06T00:00:00.000Z",
      durationMs: 10,
      platform: "win32",
      toolVersions: {},
      steps: [
        {
          id: "test",
          label: "テスト",
          status: outcome,
          durationMs: 10,
          summary: outcome === "passed" ? "通りました" : "通りませんでした",
        },
      ],
      files: [hashed],
      protected: [],
      manifestSha256: taskJson.sha256,
      problemId: "q01-add",
      taskContentHash: "ab".repeat(32),
    };
    await mkdir(path.join(root, ".stella", "problem-runs"));
    await writeFile(
      path.join(root, ".stella", "problem-runs", "q01-add.json"),
      JSON.stringify(run),
    );
    await writeFile(
      path.join(root, ".stella", "distribution.json"),
      JSON.stringify({ taskId: problemTask.id, contentHash: "ab".repeat(32) }),
    );
    state.folders = [root];
    state.activeFile = path.join(root, "src", "q01-add.ts");
    return root;
  }

  it.each([
    ["問題のファイル URI", "src/q01-add.ts", "src/q02-sub.ts", "q01-add"],
    ["テストファイル URI", "tests/q01-add.test.ts", "src/q02-sub.ts", "q01-add"],
    ["課題フォルダーのパス", null, "src/q01-add.ts", "q01-add"],
    ["課題フォルダーの URI", ".", "tests/q01-add.test.ts", "q01-add"],
    ["問題と無関係なファイル URI", "README.md", "src/q01-add.ts", "q02-sub"],
    ["課題フォルダーで対象のエディターが無い", null, undefined, "q02-sub"],
    ["引数なし", undefined, "src/q01-add.ts", "q02-sub"],
    ["前回の結果が無い問題の URI", "src/q02-sub.ts", "src/q01-add.ts", undefined],
  ])("前回の結果を %s から開く", async (_label, uriPath, activePath, expectedProblem) => {
    const root = await problemRoot();
    await mkdir(path.join(root, "tests"));
    await writeFile(path.join(root, "tests", "q01-add.test.ts"), "");
    const runs = path.join(root, ".stella", "problem-runs");
    if (expectedProblem) {
      const older = JSON.parse(await readFile(path.join(runs, "q01-add.json"), "utf8"));
      await writeFile(
        path.join(runs, "q02-sub.json"),
        JSON.stringify({ ...older, problemId: "q02-sub", startedAt: "2026-11-07T00:00:00Z" }),
      );
    }
    state.activeFile = activePath ? path.join(root, activePath) : undefined;
    const requested = uriPath
      ? { scheme: "file", fsPath: path.join(root, uriPath) }
      : uriPath === null
        ? root
        : undefined;
    await run("stella.showLastResult", requested);
    if (expectedProblem) {
      expect(vscodeMock.showTaskPanel).toHaveBeenCalledExactlyOnceWith({
        kind: "result",
        root,
        manifest: expect.objectContaining({ id: problemTask.id }),
        result: expect.objectContaining({ problemId: expectedProblem }),
      });
    } else {
      expect(vscodeMock.showTaskPanel).not.toHaveBeenCalled();
      expect(vscodeMock.showInformationMessage).toHaveBeenCalledWith(
        "まだ確認していません。「提出する」か「課題を確認する」を実行してください",
      );
    }
    expect(runTask).not.toHaveBeenCalled();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("Web の課題リンクは設定のオリジンと ID から開く", async () => {
    await run("stella.openTaskWebPage", "stage-1", "lesson-2");
    await run("stella.openTaskWebPage", "stage-1");
    await run("stella.openTaskWebPage", "..");
    await run("stella.openTaskWebPage", "stage-1", "https://example.org");
    expect(vscodeMock.openExternal.mock.calls).toEqual([
      [{ scheme: "https", url: "https://stella.example/stages/stage-1/lessons/lesson-2" }],
      [{ scheme: "https", url: "https://stella.example/stages/stage-1" }],
    ]);
  });

  const problemHelpEndpoint = `/api/tasks/help?taskId=${encodeURIComponent(problemTask.id)}&contentHash=${"ab".repeat(32)}`;

  it("課題文は問題ごとの状態と、配布した版のヒント・解答の状態を取得する", async () => {
    const root = await problemRoot();
    await unlink(path.join(root, "README.md"));
    await run("stella.showTaskReadme", root);
    expect(apiRequest.mock.calls).toHaveLength(2);
    expect(apiRequest).toHaveBeenCalledWith(
      `/api/tasks/problem-results?taskId=${encodeURIComponent(problemTask.id)}`,
    );
    expect(apiRequest).toHaveBeenCalledWith(
      problemHelpEndpoint,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(vscodeMock.showTaskReadme.mock.lastCall?.[0].guide).toMatchObject({
      problems: [
        expect.objectContaining({ id: "q01-add" }),
        expect.objectContaining({ id: "q02-sub" }),
      ],
    });
  });

  const notOffered = { state: "locked", reason: "not-offered" };
  it.each([
    ["ヒントあり", [{ state: "available", level: 1 }], notOffered, notOffered, "ヒント・解答"],
    [
      "合格後に解答例と解説を表示",
      [],
      { state: "locked", reason: "passed" },
      { state: "locked", reason: "passed" },
      "解答・解説",
    ],
    ["素材なし", [], notOffered, notOffered, undefined],
    ["通信失敗", undefined, notOffered, notOffered, undefined],
    ["未接続", undefined, notOffered, notOffered, undefined],
  ] as const)(
    "%s の課題パネルにヒント・解答の入口を出し分ける",
    async (scenario, hints, solution, explanation, label) => {
      const root = await problemRoot();
      if (scenario === "未接続") vscodeMock.getSecret.mockResolvedValue(undefined);
      apiRequest.mockImplementation(async (url) => {
        if (url !== problemHelpEndpoint) return {};
        if (!hints) throw new Error("offline");
        return { hints, solution, explanation };
      });
      await run("stella.showTaskReadme", root);
      const html = buildTaskGuideHtml({
        ...vscodeMock.showTaskReadme.mock.lastCall?.[0].guide,
        os: "windows",
      });
      if (label) {
        const href = `command:stella.showTaskHelp?${encodeURIComponent(JSON.stringify([root]))}`;
        expect(html).toContain(`<footer><p class="help"><a href="${href}">${label}</a>`);
      } else {
        expect(html).not.toContain("command:stella.showTaskHelp");
      }
      expect(html).toContain("管理者に相談");
      expect(html).toContain("実行ログ");

      state.readmeRoot = root;
      const onVisible = vscodeMock.onTaskReadmeVisible.mock.lastCall?.[0];
      onVisible(root);
      await vi.waitFor(() => expect(vscodeMock.showTaskReadme).toHaveBeenCalledTimes(2));
      expect(apiRequest.mock.calls.filter(([url]) => url === problemHelpEndpoint)).toHaveLength(
        scenario === "未接続" ? 0 : 1,
      );
    },
  );

  it("接続が切り替わると、問題つきの課題のヒント・解答の状態を取り直す", async () => {
    const root = await problemRoot();
    apiRequest.mockImplementation(async (url) =>
      url === problemHelpEndpoint ? { hints: [{ state: "available", level: 1 }] } : {},
    );
    await run("stella.showTaskReadme", root);
    expect(vscodeMock.showTaskReadme.mock.lastCall?.[0].guide.helpLabel).toBe("ヒント・解答");

    state.readmeRoot = root;
    apiRequest.mockResolvedValue({ hints: [], solution: notOffered, explanation: notOffered });
    await auth.setToken("new-token");
    await vi.waitFor(() => expect(vscodeMock.showTaskReadme).toHaveBeenCalledTimes(2));
    expect(vscodeMock.showTaskReadme.mock.lastCall?.[0].guide).not.toHaveProperty("helpLabel");

    const onVisible = vscodeMock.onTaskReadmeVisible.mock.lastCall?.[0];
    onVisible(root);
    await vi.waitFor(() => expect(vscodeMock.showTaskReadme).toHaveBeenCalledTimes(3));
    expect(vscodeMock.showTaskReadme.mock.lastCall?.[0].guide).not.toHaveProperty("helpLabel");
    expect(apiRequest.mock.calls.filter(([url]) => url === problemHelpEndpoint)).toHaveLength(2);
  });

  it("refs の無い応答でも、未解放の問題を課題パネルに渡す", async () => {
    const root = await problemRoot(undefined, "passed", true);
    apiRequest.mockResolvedValue({
      gated: true,
      passedProblems: 1,
      totalProblems: 2,
      taskPassed: false,
      problems: [
        { id: "q01-add", status: "passed", state: "submitted" },
        { id: "q02-sub", state: "locked-video", afterLessonId: "video-2", afterTitle: "引き算" },
      ],
    });
    await run("stella.showTaskReadme", root);
    expect(vscodeMock.showTaskReadme.mock.lastCall?.[0].guide).toMatchObject({
      problems: [
        expect.objectContaining({ id: "q01-add", status: "submitted" }),
        expect.objectContaining({
          id: "q02-sub",
          status: "not-submitted",
          lockReason: "「引き算」を終えると解けます",
        }),
      ],
      problemResults: { problems: [expect.anything(), { id: "q02-sub", state: "locked-video" }] },
    });
  });

  it("信頼していないフォルダーでは確認しない", async () => {
    const root = await problemRoot();
    state.trusted = false;
    state.warningChoice = "フォルダーを信頼する";
    state.folders = [root];
    await run("stella.runTask");
    expect(vscodeMock.showTaskPanel).not.toHaveBeenCalled();
    expect(vscodeMock.executeCommand).toHaveBeenCalledWith("workbench.trust.manage");
  });

  it("説明欄を出さず、提出したら件数を出して次の問題を開く", async () => {
    const root = await problemRoot();
    apiRequest.mockImplementation(async (...args: unknown[]) => {
      if (args[0] === "/api/submissions") {
        return { problemId: "q01-add", passedProblems: 1, totalProblems: 2, taskPassed: false };
      }
      return {
        problems: [],
        passedProblems: 0,
        totalProblems: 2,
        taskPassed: false,
      };
    });
    await run("stella.submitTask", root);
    expect(runTask).not.toHaveBeenCalled();
    expect(vscodeMock.showSubmissionForm).not.toHaveBeenCalled();
    expect(vscodeMock.showInformationMessage).toHaveBeenCalledWith("提出しました (1/2 問)");
    expect(vscodeMock.showTextDocument).toHaveBeenCalledWith(
      { uri: { scheme: "file", fsPath: path.join(root, "src", "q02-sub.ts") } },
      { viewColumn: 1, preview: false },
    );
    const body = apiRequest.mock.calls.find((call) => call[0] === "/api/submissions")?.[1] as {
      body: { problemId: string; files: { path: string }[]; explanation: string };
    };
    expect(body.body.problemId).toBe("q01-add");
    expect(body.body.files.map((file) => file.path)).toEqual(["src/q01-add.ts"]);
    expect(body.body.explanation).toBe("");
  });

  it("問題の提出前の確認では問番号と題名、そのまま提出する案内を出す", async () => {
    const root = await problemRoot();
    vi.mocked(runTask).mockRejectedValueOnce(new Error("テストを開始できません"));
    await run("stella.submitTask", root, "q02-sub");
    expect(vscodeMock.updateTaskReadmeCheck).toHaveBeenNthCalledWith(
      1,
      root,
      {
        progress: { steps: [] },
        target: "問2 引く",
        note: "すべて通ると、そのまま提出します。",
      },
      { rerender: true },
    );
    expect(vscodeMock.updateTaskReadmeCheck).toHaveBeenLastCalledWith(root, undefined, {
      rerender: true,
    });
  });

  it("ロック中の問題は確認でき、提出はその理由で止める", async () => {
    const root = await problemRoot(undefined, "passed", true);
    apiRequest.mockResolvedValue({
      gated: true,
      passedProblems: 0,
      totalProblems: 2,
      taskPassed: false,
      problems: [
        { id: "q01-add", state: "open" },
        { id: "q02-sub", state: "locked-video", afterTitle: "引き算" },
      ],
    });
    const reason = "「引き算」を終えると解けます";
    vi.mocked(runTask).mockResolvedValueOnce({
      schemaVersion: 1,
      taskId: problemTask.id,
      runner: "node-test",
      outcome: "failed",
      startedAt: "2026-11-06T00:00:00.000Z",
      durationMs: 1,
      platform: process.platform,
      toolVersions: {},
      steps: [],
      files: [],
      protected: [],
      manifestSha256: "ab".repeat(32),
      problemId: "q02-sub",
    });
    await run("stella.runTask", root, "q02-sub");
    expect(runTask).toHaveBeenCalledWith(expect.objectContaining({ problem: "q02-sub" }));
    expect(vscodeMock.showErrorMessage).not.toHaveBeenCalled();
    await run("stella.submitTask", root, "q02-sub");
    expect(vscodeMock.showErrorMessage).toHaveBeenLastCalledWith(reason);
    expect(apiRequest).not.toHaveBeenCalledWith("/api/submissions", expect.anything());
  });

  it("控えたファイルの書き出しが終わっていない間は、確認も提出も止める", async () => {
    const root = await problemRoot(undefined, "passed", true);
    await unlink(path.join(root, "src/q02-sub.ts"));
    const receipt = JSON.parse(
      await readFile(path.join(root, ".stella/distribution.json"), "utf8"),
    ) as { deferred?: unknown };
    await writeFile(
      path.join(root, ".stella/distribution.json"),
      JSON.stringify({ ...receipt, deferred: { "src/q02-sub.ts": null } }),
    );
    const reason = "教材を取得できません";
    apiRequest.mockImplementation(async (url: unknown) => {
      if (String(url).includes("/api/tasks/bundle")) throw new Error(reason);
      return {
        gated: true,
        passedProblems: 0,
        totalProblems: 2,
        taskPassed: false,
        problems: [
          { id: "q01-add", state: "open" },
          { id: "q02-sub", state: "open" },
        ],
      };
    });
    await run("stella.runTask", root, "q01-add");
    expect(vscodeMock.showErrorMessage).toHaveBeenLastCalledWith(
      `確認を実行できませんでした: ${reason}`,
    );
    expect(runTask).not.toHaveBeenCalled();
    await run("stella.submitTask", root, "q01-add");
    expect(vscodeMock.showErrorMessage).toHaveBeenLastCalledWith(reason);
    expect(apiRequest).not.toHaveBeenCalledWith("/api/submissions", expect.anything());
    await expect(readFile(path.join(root, "src/q02-sub.ts"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("提出のあと問題の状態を取り直せなくても、提出済みの数を戻さない", async () => {
    const root = await problemRoot(undefined, "passed", true);
    let submitted = false;
    apiRequest.mockImplementation(async (url: unknown) => {
      if (url === "/api/submissions") {
        submitted = true;
        return { problemId: "q01-add", passedProblems: 1, totalProblems: 2, taskPassed: false };
      }
      if (submitted) throw new Error("問題の状態を読み出せません");
      return {
        gated: true,
        passedProblems: 0,
        totalProblems: 2,
        taskPassed: false,
        problems: [
          { id: "q01-add", state: "open" },
          { id: "q02-sub", state: "locked-previous", afterTitle: "足す" },
        ],
      };
    });

    await run("stella.submitTask", root);

    expect(vscodeMock.showInformationMessage).toHaveBeenCalledWith(
      "提出しました (1/2 問)",
      "Web で開く",
    );
    const published = vscodeMock.setCurrentTask.mock.lastCall?.[0] as {
      problemProgress?: { passed: number; total: number };
      currentProblem?: { id: string };
    };
    expect(published.problemProgress).toEqual({ passed: 1, total: 2 });
    expect(published.currentProblem).toBeUndefined();
  });

  it("段階のある課題の提出は控えを書かず、件数だけ知らせる", async () => {
    const root = await problemRoot(undefined, "passed", true);
    vscodeMock.getCachedCatalog.mockReturnValue([
      {
        sections: [
          {
            lessons: [
              {
                stageId: "stage",
                id: "problem-add",
                problem: { taskId: problemTask.id, id: "q01-add" },
              },
            ],
          },
        ],
      },
    ]);
    let submitted = false;
    apiRequest.mockImplementation(async (url: unknown) => {
      if (url === "/api/submissions") {
        submitted = true;
        return { problemId: "q01-add", passedProblems: 1, totalProblems: 2, taskPassed: false };
      }
      return {
        gated: true,
        passedProblems: submitted ? 1 : 0,
        totalProblems: 2,
        taskPassed: false,
        problems: [
          { id: "q01-add", state: submitted ? "submitted" : "open" },
          { id: "q02-sub", state: "open" },
        ],
      };
    });
    vscodeMock.showInformationMessage.mockImplementation(async (...args: string[]) => args[1]);
    await run("stella.submitTask", root);
    expect(vscodeMock.showInformationMessage).toHaveBeenCalledWith(
      "提出しました (1/2 問)",
      "Web で開く",
    );
    expect(vscodeMock.openExternal).toHaveBeenCalledWith({
      scheme: "https",
      url: "https://stella.example/stages/stage/lessons/problem-add",
    });
    expect(
      vscodeMock.showInformationMessage.mock.calls.some((call) =>
        String(call[0]).includes("出ました"),
      ),
    ).toBe(false);
    await expect(readFile(path.join(root, ".stella/submitted-q01-add.json"))).rejects.toMatchObject(
      {
        code: "ENOENT",
      },
    );
    await expect(readFile(path.join(root, ".stella/problem-steps.json"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it.each([
    { label: "次が解ける", nextState: "open", opens: true },
    { label: "次の動画が未視聴", nextState: "locked-video", opens: false },
    { label: "次に前の問題が必要", nextState: "locked-previous", opens: false },
    { label: "課題外のファイルに移った", activePath: "../src/q01-add.ts", opens: false },
    { label: "同じ問題のテストに移った", activePath: "tests/q01-add.test.ts", opens: true },
    { label: "次の問題のファイルに移った", activePath: "src/q02-sub.ts", opens: true },
    { label: "エディターがない", activePath: null, opens: true },
    { label: "提出済みの問題を解き直した", resubmission: true, opens: false },
    { label: "次のファイルがない", missing: true, opens: false },
    { label: "取り直せないが次は解ける", refreshFailed: true, opens: true },
  ])("段階のある課題で提出したあと $label", async (scenario) => {
    const {
      nextState = "open",
      activePath = "src/q01-add.ts",
      resubmission = false,
      missing = false,
      refreshFailed = false,
      opens,
    } = scenario;
    const root = await problemRoot(undefined, "passed", true);
    const nextFile = path.join(root, "src", "q02-sub.ts");
    let submitted = false;
    apiRequest.mockImplementation(async (url: unknown) => {
      if (url === "/api/submissions") {
        submitted = true;
        state.activeFile = activePath === null ? undefined : path.join(root, activePath);
        if (missing) await unlink(nextFile);
        return { problemId: "q01-add", passedProblems: 1, totalProblems: 2, taskPassed: false };
      }
      if (submitted && refreshFailed) throw new Error("問題の状態を読み出せません");
      return {
        gated: true,
        passedProblems: submitted || resubmission ? 1 : 0,
        totalProblems: 2,
        taskPassed: false,
        problems: [
          { id: "q01-add", state: submitted || resubmission ? "submitted" : "open" },
          {
            id: "q02-sub",
            state: submitted || refreshFailed || resubmission ? nextState : "locked-previous",
          },
        ],
      };
    });

    await run("stella.submitTask", root);

    expect(vscodeMock.showInformationMessage).toHaveBeenCalledWith(
      "提出しました (1/2 問)",
      "Web で開く",
    );
    expect(vscodeMock.showErrorMessage).not.toHaveBeenCalled();
    if (opens) {
      expect(vscodeMock.showTextDocument).toHaveBeenCalledExactlyOnceWith(
        { uri: { scheme: "file", fsPath: nextFile } },
        { viewColumn: 1, preview: false },
      );
    } else {
      expect(vscodeMock.showTextDocument).not.toHaveBeenCalled();
    }
  });

  it("API の提出拒否の理由をそのまま表示する", async () => {
    const root = await problemRoot(undefined, "passed", true);
    const reason = "この問題はまだ解けません。先に前の問題を提出してください。";
    apiRequest.mockImplementation(async (url: unknown) => {
      if (url === "/api/submissions") throw new Error(reason);
      return {
        gated: true,
        passedProblems: 0,
        totalProblems: 2,
        taskPassed: false,
        problems: [
          { id: "q01-add", state: "open" },
          { id: "q02-sub", state: "locked-video" },
        ],
      };
    });
    await run("stella.submitTask", root);
    expect(vscodeMock.showErrorMessage).toHaveBeenCalledWith(reason);
    expect(vscodeMock.showInformationMessage).not.toHaveBeenCalled();
  });

  it("提出する問題の引数を、開いている別の問題のファイルより優先する", async () => {
    const root = await problemRoot();
    state.activeFile = path.join(root, "src", "q02-sub.ts");
    apiRequest.mockImplementation(async (...args: unknown[]) => {
      if (args[0] === "/api/submissions") {
        return { problemId: "q01-add", passedProblems: 1, totalProblems: 2, taskPassed: false };
      }
      return {
        problems: [],
        passedProblems: 0,
        totalProblems: 2,
        taskPassed: false,
      };
    });
    await run("stella.submitTask", root, "q01-add");
    expect(runTask).not.toHaveBeenCalled();
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/submissions",
      expect.objectContaining({
        body: expect.objectContaining({
          problemId: "q01-add",
          files: [expect.objectContaining({ path: "src/q01-add.ts" })],
        }),
      }),
    );
    expect(vscodeMock.showInformationMessage).toHaveBeenCalledWith("提出しました (1/2 問)");

    vi.mocked(runTask).mockRejectedValueOnce(new Error("実行できません"));
    await run("stella.submitTask", root);
    expect(runTask).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ problem: "q02-sub" }),
    );
  });

  it("配布版を記録していない問題の合格は再利用しない", async () => {
    const root = await problemRoot();
    const resultFile = path.join(root, ".stella", "problem-runs", "q01-add.json");
    const passed = JSON.parse(await readFile(resultFile, "utf8")) as RunResult;
    delete passed.taskContentHash;
    await writeFile(resultFile, JSON.stringify(passed));
    vi.mocked(runTask).mockResolvedValueOnce(passed);
    apiRequest.mockResolvedValue({ passedProblems: 2, totalProblems: 2, taskPassed: true });
    await run("stella.submitTask", root);
    expect(runTask).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ problem: "q01-add" }),
    );
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/submissions",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          localResult: expect.objectContaining({ taskContentHash: "ab".repeat(32) }),
        }),
      }),
    );
  });

  it("問題の確認中に接続が変わると自動提出しない", async () => {
    const assertBlocked = await expectNoSubmissionAfterSwitch();
    const root = await problemRoot();
    const resultFile = path.join(root, ".stella", "problem-runs", "q01-add.json");
    const passed = JSON.parse(await readFile(resultFile, "utf8")) as RunResult;
    await unlink(resultFile);
    vi.mocked(runTask).mockImplementationOnce(async () => {
      await auth.setToken("another-learner");
      return passed;
    });
    await run("stella.submitTask", root);
    assertBlocked();
    expect(vscodeMock.showSubmissionForm).not.toHaveBeenCalled();
  });

  it("相談の準備中に接続が変わると、相談フォームから送信しない", async () => {
    const assertBlocked = await expectNoSubmissionAfterSwitch();
    const root = await problemRoot(undefined, "failed");
    apiRequest.mockImplementationOnce(async () => {
      await auth.setToken("another-learner");
      return {};
    });
    await run("stella.consultTask", root, "q01-add");
    expect(vscodeMock.showSubmissionForm).toHaveBeenCalledOnce();
    const actions = vscodeMock.showSubmissionForm.mock.calls[0]?.[1];
    await actions.submit({ explanation: "足す処理のテストが通りません。" });
    assertBlocked();
  });

  it.each(["stella.runTask", "stella.submitTask", "問題 ID を指定した提出"])(
    "%s で対象の問題だけを確認する",
    async (command) => {
      const root = await problemRoot();
      const problemId = "q02-sub";
      const testFile = "tests/q02-sub.test.ts";
      await mkdir(path.join(root, "tests"));
      await writeFile(path.join(root, testFile), "");
      const passed = JSON.parse(
        await readFile(path.join(root, ".stella", "problem-runs", "q01-add.json"), "utf8"),
      ) as RunResult;
      vi.mocked(runTask).mockResolvedValueOnce({
        ...passed,
        problemId,
        files: [await hashFile(root, "src/q02-sub.ts")],
        protected: [await hashFile(root, testFile)],
      });
      apiRequest.mockResolvedValue({
        problemId,
        passedProblems: 2,
        totalProblems: 2,
        taskPassed: true,
      });
      if (command === "問題 ID を指定した提出") {
        expect(state.activeFile).toBe(path.join(root, "src/q01-add.ts"));
        await run("stella.submitTask", root, problemId);
      } else {
        state.activeFile = path.join(root, testFile);
        await run(command, { scheme: "file", fsPath: state.activeFile });
      }
      expect(runTask).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ problem: problemId }),
      );
      const posts = apiRequest.mock.calls.filter(([url]) => url === "/api/submissions");
      expect(posts).toEqual(
        command === "stella.runTask"
          ? []
          : [
              [
                "/api/submissions",
                expect.objectContaining({
                  method: "POST",
                  body: expect.objectContaining({ problemId }),
                }),
              ],
            ],
      );
    },
  );

  it.each(["missing", { id: "q01-add" }])("未定義の問題 ID %j は提出しない", async (id) => {
    const root = await problemRoot();
    await run("stella.submitTask", root, id);
    expect(vscodeMock.showErrorMessage).toHaveBeenCalledWith("提出する問題がありません");
    expect(runTask).not.toHaveBeenCalled();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("最後の問題では課題に合格しました、と出す", async () => {
    const root = await problemRoot();
    apiRequest.mockResolvedValue({
      problemId: "q01-add",
      passedProblems: 2,
      totalProblems: 2,
      taskPassed: true,
    });
    await run("stella.submitTask", root);
    expect(vscodeMock.showInformationMessage).toHaveBeenCalledWith("課題に合格しました");
    expect(vscodeMock.showTextDocument).not.toHaveBeenCalled();
  });

  it("未確認の問題を実行し、編集中のファイルが変わっても確認した問題を送る", async () => {
    const root = await problemRoot();
    const started = vi.fn();
    const finished = vi.fn();
    context.subscriptions.push(onDidStartTaskCheck(started), onDidFinishTaskCheck(finished));
    const resultFile = path.join(root, ".stella", "problem-runs", "q01-add.json");
    const passed = JSON.parse(await readFile(resultFile, "utf8"));
    await unlink(resultFile);
    const source = state.activeFile;
    vi.mocked(runTask).mockImplementationOnce(async () => {
      state.activeFile = path.join(root, "src", "q02-sub.ts");
      return passed;
    });
    apiRequest.mockImplementation(async (url) => {
      if (url === "/api/submissions")
        return { problemId: "q01-add", passedProblems: 1, totalProblems: 2, taskPassed: false };
      return {};
    });
    await run("stella.submitTask", { scheme: "file", fsPath: source });
    expect(runTask).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ problem: "q01-add" }),
    );
    expect(started).toHaveBeenCalledExactlyOnceWith({
      root,
      taskId: passed.taskId,
      title: problemTask.title,
      problemId: "q01-add",
      forSubmission: true,
      target: "問1 足す",
      note: "すべて通ると、そのまま提出します。",
    });
    expect(finished).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        root,
        result: expect.objectContaining({ problemId: "q01-add" }),
        saved: true,
      }),
    );
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/submissions",
      expect.objectContaining({
        body: expect.objectContaining({ problemId: "q01-add" }),
      }),
    );
    expect(apiRequest.mock.calls.filter(([url]) => url === "/api/tasks/local-result")).toHaveLength(
      1,
    );
    expect(vscodeMock.showSubmissionForm).not.toHaveBeenCalled();
    expect(vscodeMock.showTextDocument).toHaveBeenCalledWith(
      { uri: { scheme: "file", fsPath: state.activeFile } },
      { viewColumn: 1, preview: false },
    );
  });

  it("ファイルが変わっていて確認に通らなければ問題を送らない", async () => {
    const root = await problemRoot(undefined, "failed");
    apiRequest.mockImplementation(async (url) =>
      url === problemHelpEndpoint ? { hints: [{ state: "available", level: 1 }] } : {},
    );
    const failed = JSON.parse(
      await readFile(path.join(root, ".stella", "problem-runs", "q01-add.json"), "utf8"),
    );
    await writeFile(path.join(root, "src", "q01-add.ts"), "export const add = 9;\n");
    await writeFile(
      path.join(root, ".stella", "problem-runs", "q01-add.json"),
      JSON.stringify({
        ...failed,
        outcome: "passed",
        steps: [{ ...failed.steps[0], status: "passed" }],
      }),
    );
    vi.mocked(runTask).mockResolvedValueOnce(failed);
    await run("stella.submitTask", root);
    expect(runTask).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ problem: "q01-add" }),
    );
    expect(vscodeMock.showTaskReadme).toHaveBeenCalledWith(
      expect.objectContaining({
        guide: expect.objectContaining({
          problemRun: expect.objectContaining({ outcome: "failed", problemId: "q01-add" }),
          helpLabel: "ヒント・解答",
        }),
      }),
      {},
    );
    expect(apiRequest.mock.calls.filter(([url]) => url === "/api/tasks/local-runs")).toHaveLength(
      1,
    );
    expect(apiRequest).not.toHaveBeenCalledWith("/api/submissions", expect.anything());
  });

  it("API の 400 は理由をそのまま出す", async () => {
    const root = await problemRoot();
    apiRequest.mockRejectedValue(new Error("拡張を更新してください"));
    await run("stella.submitTask", root);
    expect(vscodeMock.showErrorMessage).toHaveBeenCalledWith("拡張を更新してください");
  });

  it("相談は説明の入力のまま", async () => {
    const root = await problemRoot(undefined, "failed");
    const session = auth.currentSession();
    apiRequest.mockResolvedValue({ row: { id: "consultation", attempt: 1 } });
    await run("stella.consultTask", root);
    expect(vscodeMock.showSubmissionForm).toHaveBeenCalledWith(
      expect.objectContaining({ title: "計算 (足す)", mode: "consult" }),
      expect.anything(),
    );
    const actions = vscodeMock.showSubmissionForm.mock.calls[0]?.[1] as {
      submit: (draft: { explanation: string }) => Promise<void>;
    };
    await actions.submit({ explanation: "足す処理のテストが通りません。" });
    expect(apiRequest).toHaveBeenCalledWith("/api/submissions", {
      method: "POST",
      session,
      body: expect.objectContaining({
        mode: "consult",
        problemId: "q01-add",
        files: [{ path: "src/q01-add.ts", content: expect.any(String) }],
        localResult: expect.objectContaining({ outcome: "failed", problemId: "q01-add" }),
        explanation: "足す処理のテストが通りません。",
        support: [expect.objectContaining({ kind: "instructor" })],
      }),
    });
    expect(vscodeMock.sendTaskSubmission).not.toHaveBeenCalled();
    expect(vscodeMock.showErrorMessage).not.toHaveBeenCalled();
  });

  it.each([
    { problemIds: ["q02-sub", "q01-add"], lessonId: "problem-q01-add" },
    { problemIds: ["q02-sub", "q03-other"], lessonId: "problem-q02-sub" },
    { problemIds: [], lessonId: "task-lesson" },
  ])("問題の相談後に Web の $lessonId を開く", async ({ problemIds, lessonId }) => {
    const root = await problemRoot(undefined, "failed");
    const stageId = "stage";
    vscodeMock.getCachedCatalog.mockReturnValue([
      {
        sections: [
          {
            lessons: [
              ...(problemIds.length === 0
                ? [{ stageId, id: "task-lesson", task: { id: problemTask.id } }]
                : []),
              { stageId, id: "other-lesson", problem: { taskId: "other-task", id: "q01-add" } },
              ...problemIds.map((id) => ({
                stageId,
                id: `problem-${id}`,
                problem: { taskId: problemTask.id, id },
              })),
            ],
          },
        ],
      },
    ]);
    vscodeMock.showInformationMessage.mockResolvedValue("Web で開く");
    apiRequest.mockResolvedValue({ row: { id: "consultation", attempt: 1 } });

    await run("stella.consultTask", root, "q01-add");
    const actions = vscodeMock.showSubmissionForm.mock.calls[0]?.[1] as {
      submit: (draft: { explanation: string }) => Promise<void>;
    };
    await actions.submit({ explanation: "足す処理を相談します。" });

    expect(vscodeMock.openExternal).toHaveBeenCalledWith({
      scheme: "https",
      url: `https://stella.example/stages/${stageId}/lessons/${lessonId}`,
    });
  });

  it("相談する問題が手元で合格していたら、提出を案内して入力欄を出さない", async () => {
    const root = await problemRoot();
    await run("stella.consultTask", root);
    expect(vscodeMock.showSubmissionForm).not.toHaveBeenCalled();
    expect(vscodeMock.showErrorMessage).toHaveBeenCalledWith(
      "手元の確認が通っています。「提出」を使ってください",
    );
    expect(apiRequest).not.toHaveBeenCalledWith("/api/submissions", expect.anything());
  });

  it("相談する問題の実行結果がなければ、その問題の確認を案内する", async () => {
    const root = await problemRoot();
    await unlink(path.join(root, ".stella", "problem-runs", "q01-add.json"));
    await run("stella.consultTask", root);
    expect(vscodeMock.showSubmissionForm).not.toHaveBeenCalled();
    expect(vscodeMock.showErrorMessage).toHaveBeenCalledWith("先にこの問題を確認してください");
    expect(apiRequest).not.toHaveBeenCalledWith("/api/submissions", expect.anything());
  });

  it("相談する問題の引数を、開いている別の問題のファイルより優先する", async () => {
    const root = await problemRoot(undefined, "failed");
    state.activeFile = path.join(root, "src", "q02-sub.ts");
    apiRequest.mockResolvedValue({ row: { id: "consultation", attempt: 1 } });
    await run("stella.consultTask", root, "q01-add");
    expect(vscodeMock.showSubmissionForm).toHaveBeenCalledWith(
      expect.objectContaining({ title: "計算 (足す)", mode: "consult" }),
      expect.anything(),
    );
    const actions = vscodeMock.showSubmissionForm.mock.calls[0]?.[1] as {
      submit: (draft: { explanation: string }) => Promise<void>;
    };
    await actions.submit({ explanation: "足す処理を相談します。" });
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/submissions",
      expect.objectContaining({ body: expect.objectContaining({ problemId: "q01-add" }) }),
    );
  });

  it("古い last-run.json の合格は使わず、その問題の失敗した結果で相談する", async () => {
    const root = await problemRoot(undefined, "failed");
    const local = JSON.parse(
      await readFile(path.join(root, ".stella", "problem-runs", "q01-add.json"), "utf8"),
    );
    await writeFile(
      path.join(root, ".stella", "last-run.json"),
      JSON.stringify({
        ...local,
        outcome: "passed",
        problemId: undefined,
        steps: [
          { id: "test", label: "テスト", status: "passed", durationMs: 10, summary: "通りました" },
        ],
      }),
    );
    apiRequest.mockResolvedValue({ row: { id: "consultation", attempt: 1 } });
    await run("stella.consultTask", root);
    expect(vscodeMock.showSubmissionForm).toHaveBeenCalledWith(
      expect.objectContaining({ title: "計算 (足す)", mode: "consult" }),
      expect.anything(),
    );
    const actions = vscodeMock.showSubmissionForm.mock.calls[0]?.[1] as {
      submit: (draft: { explanation: string }) => Promise<void>;
    };
    await actions.submit({ explanation: "この問題の失敗を相談します。" });
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/submissions",
      expect.objectContaining({ body: expect.objectContaining({ localResult: local }) }),
    );
    expect(vscodeMock.showErrorMessage).not.toHaveBeenCalled();
  });
});

describe("stella.diagnoseEnvironment", () => {
  it("信頼していないフォルダーでは実行しない", async () => {
    state.trusted = false;
    await run("stella.diagnoseEnvironment");
    expect(vscodeMock.showTaskPanel).not.toHaveBeenCalled();
  });
});

describe("確認の開始と終了のイベント", () => {
  async function taskRoot(): Promise<string> {
    const root = await makeTask(staticTask, { "index.html": "<h1>今日の学習予定</h1>" });
    state.folders = [root];
    return root;
  }

  function observe(root: string) {
    const start = vi.fn();
    const finish = vi.fn(() => ({
      panelOpened: vscodeMock.showTaskPanel.mock.calls.length > 0,
      savedOnDisk: existsSync(path.join(root, ".stella", "last-run.json")),
    }));
    context.subscriptions.push(
      onDidStartTaskCheck(() => {
        throw new Error("リスナーのエラー");
      }),
      onDidStartTaskCheck(start),
      onDidFinishTaskCheck(() => {
        throw new Error("リスナーのエラー");
      }),
      onDidFinishTaskCheck(finish),
    );
    return { start, finish };
  }

  it.each(["stella.runTask", "stella.submitTask"])(
    "%s は実行前と保存直後に発火する",
    async (command) => {
      const root = await taskRoot();
      await writeDistribution(root);
      const { start, finish } = observe(root);
      await run(command, root);
      const note =
        command === "stella.submitTask"
          ? "すべて通ると、振り返りを書いて提出します。"
          : "確認だけを行います。まだ提出しません。";
      expect(start).toHaveBeenCalledExactlyOnceWith({
        root,
        taskId: staticTask.id,
        title: staticTask.title,
        forSubmission: command === "stella.submitTask" ? true : undefined,
        target: undefined,
        note,
      });
      const check = { progress: { steps: [] }, target: undefined, note };
      expect(vscodeMock.updateTaskReadmeCheck).toHaveBeenNthCalledWith(1, root, check, {
        rerender: true,
      });
      expect(vscodeMock.updateTaskPanelCheck).toHaveBeenNthCalledWith(1, root, {
        ...check,
        title: staticTask.title,
      });
      expect(vscodeMock.updateTaskReadmeCheck).toHaveBeenCalledBefore(vi.mocked(runTask));
      expect(vscodeMock.updateTaskPanelCheck).toHaveBeenCalledBefore(vi.mocked(runTask));
      expectPanelsCleared(root);
      expect(start).toHaveBeenCalledBefore(vi.mocked(runTask));
      expect(finish).toHaveBeenCalledExactlyOnceWith({
        root,
        manifest: expect.objectContaining({ id: staticTask.id }),
        result: expect.objectContaining({ outcome: "passed" }),
        saved: true,
      });
      expect(finish).toHaveReturnedWith({ panelOpened: false, savedOnDisk: true });
      expect(vscodeMock.showTaskPanel).toHaveBeenCalledOnce();
      expect(vscodeMock.showErrorMessage).not.toHaveBeenCalled();
    },
  );

  it("確認の手順を通知と実行中の状態に反映する", async () => {
    const root = await taskRoot();
    const progress = vi.fn();
    context.subscriptions.push(onDidProgressTaskCheck(progress));
    await run("stella.runTask", root);
    expect(vscodeMock.progress).toHaveBeenCalledWith(
      expect.objectContaining({ title: "課題を確認しています: 見出しを変える" }),
    );
    expect(vscodeMock.reportProgress.mock.calls).toEqual([
      [{ message: "1/2 HTML の確認" }],
      [{ increment: 50 }],
      [{ message: "2/2 提出するファイルの確認" }],
      [{ increment: 50 }],
    ]);
    expect(progress).toHaveBeenCalledTimes(5);
    expect(progress).toHaveBeenLastCalledWith({
      root,
      taskId: staticTask.id,
      title: staticTask.title,
      note: "確認だけを行います。まだ提出しません。",
      progress: {
        steps: [
          { label: "HTML の確認", status: "passed", durationMs: expect.any(Number) },
          { label: "提出するファイルの確認", status: "passed", durationMs: expect.any(Number) },
        ],
      },
    });
    const check = expect.objectContaining({
      progress: {
        steps: [
          { label: "HTML の確認", status: "running" },
          { label: "提出するファイルの確認", status: "pending" },
        ],
      },
    });
    expect(vscodeMock.updateTaskReadmeCheck).toHaveBeenNthCalledWith(3, root, check);
    expect(vscodeMock.updateTaskPanelCheck).toHaveBeenNthCalledWith(3, root, check);
    expectPanelsCleared(root);
  });

  function expectPanelsCleared(root: string) {
    expect(vscodeMock.updateTaskReadmeCheck).toHaveBeenLastCalledWith(root, undefined, {
      rerender: true,
    });
    expect(vscodeMock.updateTaskPanelCheck).toHaveBeenLastCalledWith(root, undefined);
    expect(activeTaskCheck()).toBeUndefined();
  }

  it("中断は保存せずに終了を知らせる", async () => {
    const root = await taskRoot();
    const { start, finish } = observe(root);
    state.cancelProgress = true;
    await run("stella.runTask", root);
    expect(start).toHaveBeenCalledOnce();
    expect(saveRunResult).not.toHaveBeenCalled();
    expect(finish).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        root,
        result: expect.objectContaining({ outcome: "cancelled" }),
        saved: false,
      }),
    );
    expect(finish).toHaveBeenCalledBefore(vscodeMock.showInformationMessage);
    expectPanelsCleared(root);
  });

  it("保存失敗でも通知より前に終了を知らせる", async () => {
    const root = await taskRoot();
    const { finish } = observe(root);
    vi.mocked(saveRunResult).mockRejectedValueOnce(new Error("書き込めません"));
    await run("stella.runTask", root);
    expect(finish).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        root,
        result: expect.objectContaining({ outcome: "passed" }),
        saved: false,
      }),
    );
    expect(finish).toHaveReturnedWith({ panelOpened: false, savedOnDisk: false });
    expect(finish).toHaveBeenCalledBefore(vscodeMock.showWarningMessage);
    expectPanelsCleared(root);
  });

  it("実行が予期せず失敗したときも終了を知らせる", async () => {
    const root = await taskRoot();
    const { finish } = observe(root);
    vi.mocked(runTask).mockRejectedValueOnce(new Error("実行できません"));
    await run("stella.runTask", root);
    expect(finish).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        root,
        result: expect.objectContaining({ outcome: "error" }),
        saved: false,
      }),
    );
    expect(finish).toHaveBeenCalledBefore(vscodeMock.showErrorMessage);
    expectPanelsCleared(root);
  });

  it("環境診断では発火しない", async () => {
    const root = await taskRoot();
    const { start, finish } = observe(root);
    const progress = vi.fn();
    context.subscriptions.push(onDidProgressTaskCheck(progress));
    state.cancelProgress = true;
    await run("stella.diagnoseEnvironment");
    expect(runTask).toHaveBeenCalledOnce();
    expect(start).not.toHaveBeenCalled();
    expect(progress).not.toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalled();
    expect(vscodeMock.reportProgress).toHaveBeenCalledExactlyOnceWith({ increment: 100 });
  });
});

describe("stella.showLastResult", () => {
  const noRun = "まだ確認していません。「提出する」か「課題を確認する」を実行してください";

  it.each(["課題フォルダー", "開いているファイル"])(
    "%s から保存済みの結果を開く",
    async (source) => {
      const root = await makeTask(staticTask, { "index.html": "<h1>今日の学習予定</h1>" });
      state.folders = [root];
      await run("stella.runTask", root);
      const saved = JSON.parse(await readFile(path.join(root, ".stella", "last-run.json"), "utf8"));
      await writeFile(
        path.join(root, ".stella", "task.json"),
        JSON.stringify({ ...staticTask, title: "新しい題名" }),
      );
      vscodeMock.showTaskPanel.mockClear();
      vi.mocked(runTask).mockClear();
      state.activeFile =
        source === "開いているファイル" ? path.join(root, "index.html") : undefined;
      await run("stella.showLastResult", state.activeFile ? undefined : root);
      expect(vscodeMock.showTaskPanel).toHaveBeenCalledExactlyOnceWith({
        kind: "result",
        root,
        manifest: expect.objectContaining({ title: "新しい題名" }),
        result: saved,
      });
      expect(runTask).not.toHaveBeenCalled();
    },
  );

  it.each(["未確認", "別の課題", "不正な形式", "不正な表示項目", "ワークスペースの外"])(
    "%s なら案内だけ出す",
    async (reason) => {
      const root = await makeTask(staticTask, { "index.html": "<h1>今日の学習予定</h1>" });
      state.folders = [root];
      if (reason === "別の課題" || reason === "不正な表示項目" || reason === "ワークスペースの外") {
        await run("stella.runTask", root);
        const file = path.join(root, ".stella", "last-run.json");
        if (reason === "ワークスペースの外") {
          state.folders = [];
        } else {
          const saved = JSON.parse(await readFile(file, "utf8"));
          if (reason === "別の課題") saved.taskId = "different/task";
          else saved.steps[0].logTail = { invalid: true };
          await writeFile(file, JSON.stringify(saved));
        }
      }
      if (reason === "不正な形式")
        await writeFile(path.join(root, ".stella", "last-run.json"), "{}");
      vscodeMock.showTaskPanel.mockClear();
      vi.mocked(runTask).mockClear();
      await run("stella.showLastResult", root);
      expect(vscodeMock.showInformationMessage).toHaveBeenLastCalledWith(noRun);
      expect(vscodeMock.showTaskPanel).not.toHaveBeenCalled();
      expect(runTask).not.toHaveBeenCalled();
    },
  );
});
