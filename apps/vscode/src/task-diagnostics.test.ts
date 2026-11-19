import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TaskManifest } from "@stella/shared/tasks/manifest";
import type { LintFinding, RunResult, RunStepResult } from "@stella/shared/tasks/run-result";
import type { Diagnostic, ExtensionContext, TextDocumentChangeEvent, Uri } from "vscode";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  updates: [] as unknown[],
  diagnostics: new Map<string, readonly Diagnostic[]>(),
  edit: undefined as ((event: TextDocumentChangeEvent) => void) | undefined,
  created: vi.fn(),
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
  Diagnostic: class {
    constructor(
      readonly range: Diagnostic["range"],
      readonly message: string,
      readonly severity: Diagnostic["severity"],
    ) {}
  },
  DiagnosticSeverity: { Error: 0, Warning: 1 },
  languages: {
    createDiagnosticCollection: (name: string) => {
      state.created(name);
      return {
        set(entries: [Uri, readonly Diagnostic[] | undefined][]) {
          for (const [uri, diagnostics] of entries) {
            if (diagnostics) state.diagnostics.set(uri.fsPath, diagnostics);
            else state.diagnostics.delete(uri.fsPath);
          }
        },
        forEach(callback: (uri: { fsPath: string; scheme: string }) => void) {
          for (const fsPath of state.diagnostics.keys()) callback({ fsPath, scheme: "file" });
        },
        has: (uri: Uri) => state.diagnostics.has(uri.fsPath),
        delete: (uri: Uri) => state.diagnostics.delete(uri.fsPath),
        dispose: () => state.diagnostics.clear(),
      };
    },
  },
  workspace: {
    onDidChangeTextDocument: (listener: typeof state.edit) => {
      state.edit = listener;
      return { dispose: () => (state.edit = undefined) };
    },
  },
}));

import { registerTaskDiagnostics } from "./task-diagnostics.js";
import { finishTaskCheck, startTaskCheck } from "./task-run-events.js";

const manifest: TaskManifest = {
  schemaVersion: 1,
  id: "course/unit/task",
  title: "課題",
  kind: "basic",
  runner: "ts-test",
  submit: { files: ["src.ts"] },
  protected: [],
  checks: { lint: true, format: true },
};

let workspace: string;
let root: string;
let context: ExtensionContext;

beforeEach(async () => {
  vi.clearAllMocks();
  workspace = await mkdtemp(path.join(tmpdir(), "stella-diagnostics-"));
  root = path.join(workspace, "task");
  await mkdir(root);
  context = { subscriptions: [] } as unknown as ExtensionContext;
  registerTaskDiagnostics(context);
});

afterEach(async () => {
  for (const item of context.subscriptions) item.dispose();
  await Promise.all(state.updates.splice(0));
  await rm(workspace, { recursive: true, force: true });
});

function finish(
  steps: RunStepResult[],
  outcome: RunResult["outcome"] = "failed",
  saved = true,
  taskRoot = root,
  problemId?: string,
): Promise<unknown[]> {
  finishTaskCheck({
    root: taskRoot,
    manifest,
    saved,
    result: {
      schemaVersion: 1,
      taskId: manifest.id,
      runner: manifest.runner,
      outcome,
      startedAt: "2026-11-01T00:00:00.000Z",
      durationMs: 1,
      platform: process.platform,
      toolVersions: {},
      steps,
      files: [],
      protected: [],
      manifestSha256: "hash",
      problemId,
    },
  });
  return Promise.all(state.updates.splice(0));
}

function step(
  id: RunStepResult["id"],
  label: string,
  details: Partial<RunStepResult>,
): RunStepResult {
  return { id, label, status: "failed", durationMs: 1, summary: "", ...details };
}

function lint(file: string, details: Partial<LintFinding> = {}): LintFinding {
  return { file, line: 3, column: 4, message: "指摘", severity: "error", ruleId: null, ...details };
}

function forFile(file: string): readonly Diagnostic[] | undefined {
  return state.diagnostics.get(path.join(root, file));
}

function edit(file: string, contentChanged: boolean): void {
  state.edit?.({
    document: { uri: { scheme: "file", fsPath: path.join(root, file) } },
    contentChanges: contentChanged ? [{ text: "new" }] : [],
  } as unknown as TextDocumentChangeEvent);
}

const fileStart = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };

describe("確認結果の診断", () => {
  it("lint・型・コンパイルの位置、重要度、短い手順名、ルールを出す", async () => {
    await finish([
      step("lint", "lint (ESLint)", {
        lint: [lint("src.ts", { severity: "warning", ruleId: "no-unused-vars" })],
      }),
      step("typecheck", "型の確認 (TypeScript)", {
        lint: [lint("src.ts", { line: -3, column: 1.5, message: "型エラー" })],
      }),
      step("build", "ビルド (.NET)", {
        lint: [lint("src.cs", { line: 2, column: 0, ruleId: "CS1002" })],
      }),
    ]);
    expect(state.created).toHaveBeenCalledExactlyOnceWith("stella");
    expect(forFile("src.ts")).toMatchObject([
      {
        source: "STELLA (lint)",
        code: "no-unused-vars",
        message: "指摘",
        severity: 1,
        range: {
          start: { line: 2, character: 3 },
          end: { line: 2, character: Number.MAX_SAFE_INTEGER },
        },
      },
      {
        source: "STELLA (型の確認)",
        message: "型エラー",
        severity: 0,
        range: { start: { line: 0, character: 0 } },
      },
    ]);
    expect(forFile("src.ts")?.[1]?.code).toBeUndefined();
    expect(forFile("src.cs")).toMatchObject([
      {
        source: "STELLA (ビルド)",
        code: "CS1002",
        range: { start: { line: 1, character: 0 } },
      },
    ]);
  });

  it("失敗した整形のファイルの先頭だけに整形の警告を出す", async () => {
    await finish([
      step("files", "提出物", { files: ["missing.ts"] }),
      step("format", "整形 (Prettier)", { status: "error", files: ["error.ts"] }),
      step("format", "整形 (Prettier)", { files: ["src.ts"] }),
    ]);
    expect(state.diagnostics.size).toBe(1);
    expect(forFile("src.ts")).toMatchObject([
      {
        source: "STELLA (整形)",
        message: "整形が必要です。保存時の整形か「ドキュメントのフォーマット」で直してください",
        severity: 1,
        range: fileStart,
      },
    ]);
  });

  it("失敗したテストの行と期待・実際を出し、行が分からない場合は先頭に出す", async () => {
    await writeFile(path.join(root, "sample.test.ts"), '// テスト\ntest("add", fn);');
    await finish([
      step("test", "テスト (Vitest)", {
        tests: [
          {
            name: "suite › add",
            file: "sample.test.ts",
            status: "failed",
            message: "expected 1 to be 2",
          },
          { name: "missing", file: "sample.test.ts", status: "failed", message: "first\r\nsecond" },
          { name: "no message", file: "missing.test.ts", status: "failed" },
          { name: "passed", file: "sample.test.ts", status: "passed" },
          { name: "skipped", file: "sample.test.ts", status: "skipped" },
          { name: "no file", status: "failed" },
        ],
      }),
    ]);
    expect(forFile("sample.test.ts")).toMatchObject([
      {
        source: "STELLA (テスト)",
        severity: 0,
        message: "suite › add: 期待 2 / 実際 1",
        range: { start: { line: 1, character: 0 } },
      },
      { message: "missing: first", range: fileStart },
    ]);
    expect(forFile("missing.test.ts")).toMatchObject([{ message: "no message", range: fileStart }]);
  });

  it("絶対パス・空・課題の外を指すパスを捨てる", async () => {
    const invalid = ["", ".", "../task-other/src.ts", path.join(root, "inside.ts"), "C:\\src.ts"];
    await finish([
      step("lint", "lint", { lint: [...invalid.map((file) => lint(file)), lint("src.ts")] }),
      step("format", "整形", { files: invalid }),
      step("test", "テスト", {
        tests: invalid.map((file) => ({ name: "outside", file, status: "failed" })),
      }),
    ]);
    expect([...state.diagnostics.keys()]).toEqual([path.join(root, "src.ts")]);
  });

  it("大きすぎるファイルや外へのリンクの先を読まず、診断は先頭に出す", async () => {
    const external = path.join(workspace, "external");
    await mkdir(external);
    await writeFile(path.join(external, "case.test.ts"), '\ntest("case", fn);');
    await symlink(external, path.join(root, "linked"), "junction");
    await writeFile(
      path.join(root, "large.test.ts"),
      `\ntest("case", fn);\n${" ".repeat(512 * 1024)}`,
    );
    const files = ["linked/case.test.ts", "large.test.ts"];
    await finish([
      step("test", "テスト", {
        tests: files.map((file) => ({ name: "case", file, status: "failed" })),
      }),
    ]);
    for (const file of files) expect(forFile(file)).toMatchObject([{ range: fileStart }]);
  });

  it("テスト全体で 50 件、診断全体で 300 件、テストのメッセージは 300 文字に制限する", async () => {
    const tests = Array.from({ length: 40 }, () => ({
      status: "failed" as const,
      name: "test",
      message: "あ".repeat(350),
      file: "case.test.ts",
    }));
    await finish([
      step("test", "テスト", { tests }),
      step("e2e", "テスト", { tests }),
      step("lint", "lint", { lint: Array.from({ length: 260 }, () => lint("src.ts")) }),
    ]);
    expect(forFile("case.test.ts")).toHaveLength(50);
    expect(forFile("case.test.ts")?.[0]?.message).toBe(`test: ${"あ".repeat(294)}`);
    expect(forFile("src.ts")).toHaveLength(250);
  });

  it("確認の結果を課題フォルダー単位で置き換え、通った課題の診断だけを消す", async () => {
    const other = path.join(workspace, "task-other");
    await finish([step("lint", "lint", { lint: [lint("src.ts")] })], "failed", true, other);
    await finish([step("lint", "lint", { lint: [lint("src.ts"), lint("old.ts")] })]);
    await finish([step("lint", "lint", { lint: [lint("src.ts", { message: "新しい指摘" })] })]);
    expect(forFile("src.ts")).toMatchObject([{ message: "新しい指摘" }]);
    expect(forFile("old.ts")).toBeUndefined();
    await finish(
      [step("lint", "lint", { lint: [lint("src.ts", { severity: "warning" })] })],
      "passed",
    );
    expect([...state.diagnostics.keys()]).toEqual([path.join(other, "src.ts")]);
    expect(state.created).toHaveBeenCalledTimes(1);
  });

  it("別の問題の合格では診断を残し、同じ問題の合格ではソース・テスト・結果にあるファイルの診断を消す", async () => {
    const source = "src/q01.ts";
    const test = "tests/q01.test.ts";
    const shared = "src/shared.ts";
    const steps = [
      step("typecheck", "型の確認", { lint: [lint(source), lint(test), lint(shared)] }),
    ];
    await finish(steps, "failed", true, root, "q01");
    await finish([], "passed", true, root, "q02");
    expect(forFile(source)).toHaveLength(1);
    expect(forFile(test)).toHaveLength(1);
    expect(forFile(shared)).toHaveLength(1);
    await finish(
      [step("format", "整形", { files: [shared], status: "passed" })],
      "passed",
      true,
      root,
      "q01",
    );
    expect(state.diagnostics.size).toBe(0);
  });

  it("診断の読み込み中に別の問題の結果が届いても、元の問題の診断を残す", async () => {
    const test = "tests/q01.test.ts";
    const steps = [
      step("test", "テスト", { tests: [{ name: "case", file: test, status: "failed" }] }),
    ];
    await Promise.all([
      finish(steps, "failed", true, root, "q01"),
      finish([], "passed", true, root, "q02"),
    ]);
    expect(forFile(test)).toHaveLength(1);
  });

  it("開始・中断・保存に失敗した確認では診断を変えない", async () => {
    const original = step("lint", "lint", { lint: [lint("src.ts")] });
    await finish([original]);
    const previous = forFile("src.ts");
    startTaskCheck({ root, taskId: manifest.id });
    expect(forFile("src.ts")).toBe(previous);
    await finish([], "cancelled");
    expect(forFile("src.ts")).toBe(previous);
    await finish([], "passed", false);
    expect(forFile("src.ts")).toBe(previous);
  });

  it("内容を変更したファイルの診断だけを消す", async () => {
    await finish([
      step("lint", "lint", { lint: [lint("src.ts")] }),
      step("test", "テスト", { tests: [{ name: "case", file: "case.test.ts", status: "failed" }] }),
    ]);
    edit("src.ts", false);
    expect(forFile("src.ts")).toHaveLength(1);
    edit("src.ts", true);
    expect(forFile("src.ts")).toBeUndefined();
    expect(forFile("case.test.ts")).toHaveLength(1);
  });

  it("ファイルを読んでいる間の編集や新しい結果を反映する", async () => {
    const stepWithTest = step("test", "テスト", {
      tests: [{ name: "case", file: "case.test.ts", status: "failed" }],
    });
    await writeFile(path.join(root, "case.test.ts"), '\ntest("case", fn);');
    const beforeEdit = finish([stepWithTest]);
    edit("case.test.ts", true);
    await beforeEdit;
    expect(forFile("case.test.ts")).toBeUndefined();
    await Promise.all([finish([stepWithTest]), finish([], "passed")]);
    expect(forFile("case.test.ts")).toBeUndefined();
  });
});
