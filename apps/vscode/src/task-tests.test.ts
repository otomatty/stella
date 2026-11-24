import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TaskManifest } from "@stella/shared/tasks/manifest";
import type { RunResult, RunStepResult, TestCaseResult } from "@stella/shared/tasks/run-result";
import type { ExtensionContext, TestItem, TestRunRequest, Uri } from "vscode";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  updates: [] as unknown[],
  folders: [] as string[],
  foldersChanged: undefined as (() => void) | undefined,
  taskChanged: undefined as ((root?: string) => unknown) | undefined,
  execute: vi.fn(),
  inform: vi.fn(),
  createController: vi.fn(),
  createRun: vi.fn(),
  createProfile: vi.fn(),
  disposeController: vi.fn(),
  disposeProfile: vi.fn(),
}));

vi.mock("vscode", () => ({
  EventEmitter: class<T> {
    private listeners = new Set<(value: T) => unknown>();
    event = (listener: (value: T) => unknown) => {
      this.listeners.add(listener);
      return { dispose: () => this.listeners.delete(listener) };
    };
    fire(value: T) {
      for (const listener of this.listeners) state.updates.push(listener(value));
    }
  },
  Uri: { file: (fsPath: string) => ({ fsPath, scheme: "file" }) },
  Range: class {
    start: { line: number; character: number };
    end: { line: number; character: number };
    constructor(startLine: number, startColumn: number, endLine: number, endColumn: number) {
      this.start = { line: startLine, character: startColumn };
      this.end = { line: endLine, character: endColumn };
    }
  },
  Location: class {
    constructor(
      readonly uri: Uri,
      readonly range: TestItem["range"],
    ) {}
  },
  TestMessage: class {
    constructor(readonly message: string) {}
    static diff(message: string, expectedOutput: string, actualOutput: string) {
      return Object.assign(new this(message), { expectedOutput, actualOutput });
    }
  },
  TestRunRequest: class {
    constructor(readonly include?: readonly TestItem[]) {}
  },
  TestRunProfileKind: { Run: 1 },
  tests: { createTestController: state.createController },
  commands: { executeCommand: state.execute },
  window: { showInformationMessage: state.inform },
  workspace: {
    getWorkspaceFolder: ({ fsPath }: Uri) =>
      state.folders.find(
        (folder) => fsPath === folder || fsPath.startsWith(`${folder}${path.sep}`),
      ),
    onDidChangeWorkspaceFolders: (listener: () => void) => {
      state.foldersChanged = listener;
      return { dispose: () => (state.foldersChanged = undefined) };
    },
  },
}));

vi.mock("./task-state.js", () => ({
  onDidChangeTaskState: (listener: typeof state.taskChanged) => {
    state.taskChanged = listener;
    return { dispose: () => (state.taskChanged = undefined) };
  },
}));

import { finishTaskCheck } from "./task-run-events.js";
import { registerTaskTests } from "./task-tests.js";

function collection(parent?: TestItem) {
  const entries = new Map<string, TestItem>();
  return {
    get size() {
      return entries.size;
    },
    add(item: TestItem) {
      Object.assign(item, { parent });
      entries.set(item.id, item);
    },
    get: entries.get.bind(entries),
    delete: entries.delete.bind(entries),
    forEach: entries.forEach.bind(entries),
  };
}

function createItem(id: string, label: string, uri?: Uri): TestItem {
  if (id.includes("\0")) throw new Error("Test IDs may not include NUL");
  const item = { id, label, uri } as TestItem;
  return Object.assign(item, { children: collection(item) });
}

function newRun() {
  return {
    passed: vi.fn(),
    failed: vi.fn(),
    skipped: vi.fn(),
    appendOutput: vi.fn(),
    end: vi.fn(),
  };
}

const manifest: TaskManifest = {
  schemaVersion: 1,
  id: "course/unit/task",
  title: "練習課題",
  kind: "basic",
  runner: "ts-test",
  submit: { files: ["src/**/*.ts"] },
  protected: [
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "eslint.config.js",
    "vitest.config.js",
    "tests/**",
  ],
  checks: { lint: true, format: true },
};

let workspace: string;
let root: string;
let context: ExtensionContext;
let items: ReturnType<typeof collection>;
let runs: ReturnType<typeof newRun>[];
let runProfile: (request: Pick<TestRunRequest, "include">) => Promise<void>;

beforeEach(async () => {
  vi.resetAllMocks();
  workspace = await mkdtemp(path.join(tmpdir(), "stella-task-tests-"));
  root = path.join(workspace, "task");
  await mkdir(root);
  state.folders = [workspace];
  state.createRun.mockImplementation(() => {
    const run = newRun();
    runs.push(run);
    return run;
  });
  state.createProfile.mockImplementation((_label, _kind, handler) => {
    runProfile = handler;
    return { dispose: state.disposeProfile };
  });
  items = collection();
  runs = [];
  state.createController.mockReturnValue({
    items,
    createTestItem: createItem,
    createTestRun: state.createRun,
    createRunProfile: state.createProfile,
    dispose: state.disposeController,
  });
  context = { subscriptions: [] } as unknown as ExtensionContext;
  registerTaskTests(context);
});

afterEach(async () => {
  for (const item of context.subscriptions) item.dispose();
  await Promise.all(state.updates.splice(0));
  await rm(workspace, { recursive: true, force: true });
});

function result(steps: RunStepResult[], options: Partial<RunResult> = {}): RunResult {
  return {
    schemaVersion: 1,
    taskId: manifest.id,
    runner: manifest.runner,
    outcome: "failed",
    startedAt: "2026-11-01T00:00:00.000Z",
    durationMs: 1,
    platform: process.platform,
    toolVersions: {},
    steps,
    files: [],
    protected: [],
    manifestSha256: "a".repeat(64),
    ...options,
  };
}

function testStep(tests: TestCaseResult[]): RunStepResult {
  return {
    id: "test",
    label: "テスト (Vitest)",
    status: "failed",
    durationMs: 1,
    summary: "テストの要約",
    tests,
  };
}

function testCase(name: string, file?: string): TestCaseResult {
  return { name, file, status: "passed" };
}

function finish(runResult: RunResult, taskRoot = root, saved = true): Promise<unknown[]> {
  finishTaskCheck({ root: taskRoot, manifest, result: runResult, saved });
  return Promise.all(state.updates.splice(0));
}

function children(item?: TestItem): TestItem[] {
  const result: TestItem[] = [];
  item?.children.forEach((child) => {
    result.push(child);
  });
  return result;
}

async function savePrevious(...runs: (RunResult & { problemId: string })[]) {
  await mkdir(path.join(root, ".stella/problem-runs"), { recursive: true });
  const problems = ["q01", "q02", "q03"].map((id) => ({ id, title: id }));
  await writeFile(path.join(root, ".stella/task.json"), JSON.stringify({ ...manifest, problems }));
  for (const run of runs) {
    await writeFile(
      path.join(root, `.stella/problem-runs/${run.problemId}.json`),
      JSON.stringify(run),
    );
  }
}

function problemRun(problemId: string, tests: TestCaseResult[]) {
  return { ...result([testStep(tests)]), problemId };
}

const noTests: RunStepResult = {
  id: "typecheck",
  label: "型の確認",
  status: "passed",
  summary: "型の確認が通りました",
  durationMs: 1,
};

const sampleFile = "sample.test.ts";

describe("課題のテストビュー", () => {
  it("課題・ファイル・テストを並べ、見つかったテストの行に結果と差分を付ける", async () => {
    const declaration = 'test("add", fn);';
    await writeFile(path.join(root, sampleFile), `// テスト\r\n${declaration}\r\n`);
    await finish(
      result([
        noTests,
        testStep([
          {
            name: "math › integer › add",
            file: sampleFile,
            status: "failed",
            message: "expected 1 to be 2\r\nstack",
          },
          testCase("passed", sampleFile),
          { name: "skipped", file: sampleFile, status: "skipped" },
          { name: "message", status: "failed", message: "first\nsecond" },
          { name: "fallback", status: "failed" },
        ]),
      ]),
    );

    expect(state.createController).toHaveBeenCalledExactlyOnceWith("stella.tasks", "STELLA の課題");
    const task = items.get(root);
    expect(task).toMatchObject({ id: root, label: manifest.title, uri: undefined });
    const [file, message, fallback] = children(task);
    const uri = { fsPath: path.join(root, sampleFile), scheme: "file" };
    expect(file).toMatchObject({ id: JSON.stringify([root, sampleFile]), label: sampleFile, uri });
    const [failed, passed, skipped] = children(file);
    const range = {
      start: { line: 1, character: 0 },
      end: { line: 1, character: declaration.length },
    };
    expect(failed).toMatchObject({
      id: JSON.stringify([root, sampleFile, "math › integer › add"]),
      label: "add",
      description: "math › integer",
      uri,
      range,
    });
    expect(passed).toMatchObject({ label: "passed", uri, range: undefined });
    expect(message).toMatchObject({ label: "message", uri: undefined });
    expect(state.createRun).toHaveBeenCalledExactlyOnceWith(
      { include: [task] },
      "手元の確認",
      false,
    );
    const [run] = runs;
    expect(run.passed).toHaveBeenCalledExactlyOnceWith(passed);
    expect(run.skipped).toHaveBeenCalledExactlyOnceWith(skipped);
    expect(run.failed).toHaveBeenCalledTimes(3);
    expect(run.failed).toHaveBeenCalledWith(failed, {
      message: "expected 1 to be 2",
      expectedOutput: "2",
      actualOutput: "1",
      location: { uri, range },
    });
    expect(run.failed).toHaveBeenCalledWith(message, { message: "first\nsecond" });
    expect(run.failed).toHaveBeenCalledWith(fallback, { message: "このテストは通りませんでした" });
    expect(run.appendOutput.mock.calls).toEqual([
      ["型の確認: 型の確認が通りました\r\n"],
      ["テスト (Vitest): テストの要約\r\n"],
    ]);
    expect(run.end).toHaveBeenCalledTimes(1);
  });

  it("空・絶対・課題外のパスを持つテストはファイルの場所を付けずに出す", async () => {
    const invalid = [
      "",
      ".",
      "../outside.ts",
      path.join(root, "inside.ts"),
      "C:\\src.ts",
      "bad\0path",
    ];
    await finish(result([testStep(invalid.map((file, index) => testCase(`test ${index}`, file)))]));
    const cases = children(items.get(root));
    expect(cases).toHaveLength(invalid.length);
    cases.forEach((item, index) => {
      expect(item).toMatchObject({ label: `test ${index}`, uri: undefined, range: undefined });
    });
  });

  it("課題外へのリンクと 512 KB を超えるファイルは行を読まない", async () => {
    const outside = path.join(workspace, "outside");
    await mkdir(outside);
    await writeFile(path.join(outside, sampleFile), '\ntest("case", fn);');
    await symlink(outside, path.join(root, "linked"), "junction");
    await writeFile(
      path.join(root, "large.test.ts"),
      `\ntest("case", fn);\n${" ".repeat(512 * 1024)}`,
    );
    const files = ["linked/sample.test.ts", "large.test.ts"];
    await finish(result([testStep(files.map((file) => testCase("case", file)))]));
    for (const file of children(items.get(root))) {
      expect(children(file)[0]).toMatchObject({ label: "case", uri: file.uri, range: undefined });
    }
  });

  it("課題ごとに 500 件まで出し、上限に達しても既存の項目を更新できる", async () => {
    const cases = Array.from({ length: 501 }, (_, index) => testCase(`test ${index}`, sampleFile));
    await finish(result([testStep(cases)]));
    const [file] = children(items.get(root));
    const visible = children(file);
    expect(visible).toHaveLength(500);
    expect(runs[0].passed).toHaveBeenCalledTimes(500);
    await finish(
      result([testStep([cases[500], { ...cases[0], status: "skipped" }])], { problemId: "q02" }),
    );
    expect(children(file)).toEqual(visible);
    expect(runs[1].passed).not.toHaveBeenCalled();
    expect(runs[1].skipped).toHaveBeenCalledExactlyOnceWith(visible[0]);
  });

  it("1 問の確認は項目を追加・更新し、課題全体の確認は古いファイルとテストを消す", async () => {
    await writeFile(path.join(root, sampleFile), 'test("keep", fn);');
    await finish(
      result([
        testStep([
          testCase("keep", sampleFile),
          testCase("remove", sampleFile),
          testCase("old", "old.ts"),
        ]),
      ]),
    );
    const task = items.get(root);
    const [file, old] = children(task);
    const [keep, remove] = children(file);
    await writeFile(path.join(root, sampleFile), '\ntest("keep", fn);');
    await finish(
      result([testStep([testCase("keep", sampleFile), testCase("new")])], { problemId: "q01" }),
    );
    const [updated, retained, added] = children(task);
    expect(updated).toBe(file);
    expect(retained).toBe(old);
    expect(added.label).toBe("new");
    expect(children(file)[1]).toBe(remove);
    expect(keep.range?.start.line).toBe(1);
    expect(runs[1].passed.mock.calls).toEqual([[keep], [added]]);
    await finish(result([testStep([testCase("keep", sampleFile)])]));
    expect(children(task)).toEqual([file]);
    expect(children(file)).toEqual([keep]);
  });

  it("テストの無い確認・中断・保存失敗で項目を作らず、既存の項目も変えない", async () => {
    const withTests = result([testStep([testCase("case")])]);
    const ignored = async () => {
      await finish(result([noTests]));
      await finish({ ...withTests, outcome: "cancelled" });
      await finish(withTests, root, false);
    };
    await ignored();
    expect(items.size).toBe(0);
    expect(runs).toHaveLength(0);
    await finish(withTests);
    const original = children(items.get(root));
    await ignored();
    expect(children(items.get(root))).toEqual(original);
    expect(runs).toHaveLength(1);
  });

  it("読める前回の結果から確認済みの 1 問の項目だけを復元する", async () => {
    await state.taskChanged?.(root);
    expect(items.size).toBe(0);
    await savePrevious({ ...result([noTests]), problemId: "q01" });
    await state.taskChanged?.(root);
    expect(items.size).toBe(0);
    await savePrevious(problemRun("q01", [testCase("previous", sampleFile)]));
    await state.taskChanged?.();
    expect(items.size).toBe(0);
    await state.taskChanged?.(root);
    expect(children(children(items.get(root))[0]).map((item) => item.label)).toEqual(["previous"]);
    expect(state.createRun).not.toHaveBeenCalled();
    await savePrevious(problemRun("q01", [testCase("changed")]));
    await state.taskChanged?.(root);
    expect(children(items.get(root)).map((item) => item.label)).toEqual([sampleFile]);
  });

  it("段階がある課題では控えがあっても全問のテスト結果を復元する", async () => {
    await savePrevious(
      problemRun("q01", [testCase("提出済み", "tests/q01.test.ts")]),
      problemRun("q02", [testCase("解ける", "tests/q02.test.ts")]),
      problemRun("q03", [testCase("まだ出さない", "tests/q03.test.ts")]),
    );
    const contentHash = "ab".repeat(32);
    const problems = ["q01", "q02", "q03"].map((id) => ({ id, title: id }));
    await writeFile(
      path.join(root, ".stella/task.json"),
      JSON.stringify({
        ...manifest,
        problemSteps: true,
        problems,
      }),
    );
    await writeFile(
      path.join(root, ".stella/distribution.json"),
      JSON.stringify({
        taskId: manifest.id,
        contentHash,
      }),
    );
    await writeFile(
      path.join(root, ".stella/problem-steps.json"),
      JSON.stringify({
        contentHash,
        server: {
          gated: true,
          totalProblems: 3,
          passedProblems: 1,
          taskPassed: false,
          problems: problems.map((item, index) => ({
            ...item,
            state: ["submitted", "open", "locked-video"][index],
          })),
        },
      }),
    );
    await state.taskChanged?.(root);
    expect(children(items.get(root)).map((item) => item.label)).toEqual([
      "q01.test.ts",
      "q02.test.ts",
      "q03.test.ts",
    ]);
  });

  it("保存済みの問題を合わせて復元し、全体で 500 件まで項目を用意する", async () => {
    await savePrevious(
      problemRun(
        "q01",
        Array.from({ length: 300 }, (_, i) => testCase(`first ${i}`, "tests/q01.test.ts")),
      ),
      problemRun(
        "q02",
        Array.from({ length: 250 }, (_, i) => testCase(`second ${i}`, "tests/q02.test.ts")),
      ),
    );
    await state.taskChanged?.(root);
    const files = children(items.get(root));
    expect(files.map((file) => file.label)).toEqual(["q01.test.ts", "q02.test.ts"]);
    expect(files.map((file) => children(file).length)).toEqual([300, 200]);
    expect(state.createRun).not.toHaveBeenCalled();
  });

  it("選択したテストやファイルの問題を重複なく順に確認し、課題を選んだときは課題を渡す", async () => {
    await savePrevious(
      problemRun("q01", [testCase("first", "tests/q01.test.ts")]),
      problemRun("q02", [testCase("second", "tests/q02.test.ts")]),
    );
    await state.taskChanged?.(root);
    const task = items.get(root);
    if (!task) throw new Error("課題の項目がありません");
    const [first, second] = children(task);
    const [firstTest] = children(first);
    const uri = (id: string) => ({ fsPath: path.join(root, "src", `${id}.ts`), scheme: "file" });

    await runProfile({ include: [firstTest] });
    expect(state.execute).toHaveBeenCalledExactlyOnceWith("stella.runTask", uri("q01"));

    state.execute.mockClear();
    let releaseFirst: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    state.execute.mockReturnValueOnce(pending);
    const running = runProfile({ include: [second, firstTest, first] });
    expect(state.execute).toHaveBeenCalledExactlyOnceWith("stella.runTask", uri("q02"));
    releaseFirst();
    await running;
    expect(state.execute.mock.calls).toEqual([
      ["stella.runTask", uri("q02")],
      ["stella.runTask", uri("q01")],
    ]);
    state.execute.mockClear();
    await runProfile({ include: [task] });
    expect(state.execute).toHaveBeenCalledExactlyOnceWith("stella.runTask", root);
  });

  it("選択されたテストから課題をたどり、課題のパスだけを一度ずつ順に実行する", async () => {
    const other = path.join(workspace, "other");
    const withTests = result([testStep([testCase("case", sampleFile)])]);
    await finish(withTests);
    await finish(withTests, other);
    const task = items.get(root);
    const otherTask = items.get(other);
    const [file] = children(task);
    const [test] = children(file);
    expect(state.createProfile).toHaveBeenCalledExactlyOnceWith(
      "課題を確認する",
      1,
      runProfile,
      true,
    );
    let releaseFirst: () => void = () => undefined;
    const first = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    state.execute.mockReturnValueOnce(first);
    const running = runProfile({ include: [test, file, task as TestItem, otherTask as TestItem] });
    expect(state.execute).toHaveBeenCalledExactlyOnceWith("stella.runTask", root);
    releaseFirst();
    await running;
    expect(state.execute.mock.calls).toEqual([
      ["stella.runTask", root],
      ["stella.runTask", other],
    ]);
    expect(state.createRun).toHaveBeenCalledTimes(2);
  });

  it("すべて実行は課題が 1 つのときだけ使える", async () => {
    await state.taskChanged?.(root);
    await runProfile({ include: undefined });
    expect(state.execute).not.toHaveBeenCalled();
    expect(state.inform).not.toHaveBeenCalled();
    const withTests = result([testStep([testCase("case")])]);
    await finish(withTests);
    await runProfile({ include: undefined });
    expect(state.execute).toHaveBeenCalledExactlyOnceWith("stella.runTask", root);
    await finish(withTests, path.join(workspace, "other"));
    await runProfile({ include: undefined });
    expect(state.execute).toHaveBeenCalledTimes(1);
    expect(state.inform).toHaveBeenCalledExactlyOnceWith(
      "確認する課題を、テストビューで選んでから実行してください",
    );
  });

  it("ワークスペースから外れた課題の項目を消し、読み込み中の項目も追加しない", async () => {
    const other = path.join(workspace, "other");
    const loading = path.join(workspace, "loading");
    await mkdir(loading);
    await writeFile(path.join(loading, sampleFile), 'test("case", fn);');
    const withTests = result([testStep([testCase("case", sampleFile)])]);
    await finish(withTests);
    await finish(withTests, other);
    const finishing = finish(withTests, loading);
    await Promise.resolve();
    state.folders = [other];
    state.foldersChanged?.();
    await finishing;
    expect(items.get(root)).toBeUndefined();
    expect(items.get(other)).toBeDefined();
    expect(items.get(loading)).toBeUndefined();
    expect(runs).toHaveLength(2);
  });

  it("コントローラーと実行プロファイルを拡張の終了時に破棄する", async () => {
    await state.taskChanged?.(root);
    for (const item of context.subscriptions.splice(0)) item.dispose();
    expect(state.disposeController).toHaveBeenCalledTimes(1);
    expect(state.disposeProfile).toHaveBeenCalledTimes(1);
  });
});
