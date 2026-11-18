import { mkdir, mkdtemp, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashFile } from "./runner/files.js";

const state = vi.hoisted(() => ({
  handlers: new Map<string, () => Promise<void> | void>(),
  trusted: true,
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
  setCurrentTask: vi.fn(),
  showTextDocument: vi.fn(),
  showInputBox: vi.fn(),
  showSubmissionForm: vi.fn(),
  sendTaskSubmission: vi.fn(),
  getCachedCatalog: vi.fn(),
  openExternal: vi.fn(),
  progress: vi.fn(),
}));

vi.mock("vscode", () => ({
  Uri: { file: (fsPath: string) => ({ scheme: "file", fsPath }), parse: (url: string) => url },
  env: { openExternal: vscodeMock.openExternal },
  ViewColumn: { One: 1, Two: 2 },
  window: {
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
      return task({}, { onCancellationRequested: vi.fn() });
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
  taskReadmeRoot: () => state.readmeRoot,
}));
vi.mock("./task-status.js", () => ({ setCurrentTask: vscodeMock.setCurrentTask }));
vi.mock("./submission-form.js", () => ({
  registerSubmissionForms: vi.fn(),
  showSubmissionForm: vscodeMock.showSubmissionForm,
}));
const apiRequest = vi.hoisted(() => vi.fn(async (..._args: unknown[]) => ({})));
vi.mock("./api.js", () => ({ apiRequest, apiSession: () => 1 }));

vi.mock("./task-submission.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./task-submission.js")>()),
  sendTaskSubmission: vscodeMock.sendTaskSubmission,
}));
vi.mock("./catalog.js", () => ({ getCachedCatalog: vscodeMock.getCachedCatalog }));

vi.mock("./runner/run-task.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("./runner/run-task.js")>();
  return { ...original, runTask: vi.fn(original.runTask) };
});
const { runTask } = await import("./runner/run-task.js");
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

beforeEach(() => {
  vi.clearAllMocks();
  vscodeMock.showInformationMessage.mockResolvedValue(undefined);
  vscodeMock.getCachedCatalog.mockReturnValue([]);
  vscodeMock.sendTaskSubmission.mockResolvedValue({ id: "submission", attempt: 1 });
  apiRequest.mockResolvedValue({});
  state.handlers.clear();
  state.trusted = true;
  state.activeFile = undefined;
  state.folders = [];
  state.warningChoice = undefined;
  state.inputs = [];
  state.dirtyDocs = [];
  state.readmeRoot = undefined;
  registerTaskCommands({ subscriptions: [] } as never);
});

async function run(command: string, ...args: unknown[]): Promise<void> {
  await (state.handlers.get(command) as ((...a: unknown[]) => Promise<void>) | undefined)?.(
    ...args,
  );
}

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
      let releaseReport: () => void = () => undefined;
      apiRequest.mockReturnValueOnce(
        new Promise((resolve) => {
          releaseReport = () => resolve({});
        }),
      );
      const checking = run(command, root);
      try {
        await vi.waitFor(() => expect(localReports()).toHaveLength(1));
        vscodeMock.showInformationMessage.mockClear();
        await run("stella.submitTask", root);
        expect(vscodeMock.showInformationMessage).toHaveBeenCalledExactlyOnceWith(
          "いま確認しています。終わるまで待ってください",
        );
        await run("stella.runTask", root);
        expect(vscodeMock.progress).toHaveBeenCalledTimes(1);
      } finally {
        releaseReport();
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
  ): Promise<string> {
    const root = await makeTask(staticTask, {
      "index.html": mode === "submit" ? "<h1>今日の学習予定</h1>" : "<h1>未完成</h1>",
    });
    state.folders = [root];
    await run("stella.runTask", root);
    await run(mode === "submit" ? "stella.submitTask" : "stella.consultTask", root);
    const actions = vscodeMock.showSubmissionForm.mock.calls[0]?.[1] as {
      submit: (draft: { explanation: string }) => Promise<void>;
    };
    vscodeMock.showInformationMessage.mockResolvedValueOnce(choice);
    await actions.submit({ explanation: "振り返り" });
    return root;
  }

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
    expect(vscodeMock.openExternal).toHaveBeenCalledWith(
      "https://stella.example/stages/stage%2F1/lessons/lesson%3F2",
    );
  });

  it("別の課題の ID しかなければホームを開く", async () => {
    vscodeMock.getCachedCatalog.mockReturnValue([
      { sections: [{ lessons: [{ stageId: "stage", id: "lesson", task: { id: "other" } }] }] },
    ]);
    await submit("submit", "Web で開く");
    expect(vscodeMock.openExternal).toHaveBeenCalledWith("https://stella.example/");
  });

  it("相談後は返事が届く場所を示し、Web のボタンだけを出す。ID が無ければホームへ戻る", async () => {
    await submit("consult", "Web で開く");
    expect(vscodeMock.showInformationMessage).toHaveBeenLastCalledWith(
      "相談を送りました。講師の返事は通知と、Web のレッスン画面の『提出・添削を確認する』に届きます。",
      "Web で開く",
    );
    expect(vscodeMock.openExternal).toHaveBeenCalledWith("https://stella.example/");
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
    expect(vscodeMock.setCurrentTask).toHaveBeenCalledWith({ root, title: "見出しを変える" });
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
  ): Promise<string> {
    const root = await makeTask(problemTask, {
      "src/q01-add.ts": source,
      "src/q02-sub.ts": "export const sub = 1;\n",
      "README.md": "# 計算",
    });
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
    expect(vscodeMock.showTaskPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        result: expect.objectContaining({ outcome: "failed", problemId: "q01-add" }),
      }),
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
      session: 1,
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
