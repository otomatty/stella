import type { TaskManifest } from "@stella/shared/tasks/manifest";
import type { CodeLensProvider, ExtensionContext, TextDocument } from "vscode";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerTaskCodeLens } from "./task-code-lens.js";
import { finishTaskCheck, progressTaskCheck, startTaskCheck } from "./task-run-events.js";

const state = vi.hoisted(() => ({
  trusted: true,
  provider: undefined as CodeLensProvider | undefined,
  taskRootOf: vi.fn(),
  loadTask: vi.fn(),
}));

vi.mock("vscode", () => ({
  EventEmitter: class<T> {
    private listeners = new Set<(value: T) => void>();
    event = (listener: (value: T) => void) => {
      this.listeners.add(listener);
      return { dispose: () => this.listeners.delete(listener) };
    };
    fire(value: T) {
      for (const listener of this.listeners) listener(value);
    }
    dispose() {
      this.listeners.clear();
    }
  },
  workspace: {
    get isTrusted() {
      return state.trusted;
    },
    onDidGrantWorkspaceTrust: () => ({ dispose: vi.fn() }),
  },
  languages: {
    registerCodeLensProvider: (_selector: unknown, provider: CodeLensProvider) => {
      state.provider = provider;
      return { dispose: vi.fn() };
    },
  },
  Range: class {
    constructor(public startLine: number) {}
  },
  CodeLens: class {
    constructor(
      public range: unknown,
      public command: unknown,
    ) {}
  },
}));

vi.mock("./task-commands.js", () => ({ taskRootOf: state.taskRootOf }));
vi.mock("./runner/run-task.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./runner/run-task.js")>()),
  loadTask: state.loadTask,
}));

const root = "/workspace/q01";
const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() };
const manifest: TaskManifest = {
  schemaVersion: 1,
  id: "course/unit/q01",
  title: "計算",
  kind: "basic",
  runner: "ts-test",
  submit: { files: ["src/*.ts"] },
  protected: [],
  checks: { lint: false, format: false },
  problems: [
    { id: "q01", title: "最初の問題" },
    { id: "q02", title: "次の問題" },
  ],
};
let context: ExtensionContext;

function lenses(file: string, text: string) {
  const doc = {
    uri: { fsPath: file, scheme: "file" },
    getText: () => text,
    positionAt: (offset: number) => ({ line: text.slice(0, offset).split("\n").length - 1 }),
  } as TextDocument;
  return state.provider?.provideCodeLenses(doc, token);
}

describe("問題ファイルの CodeLens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.trusted = true;
    state.taskRootOf.mockResolvedValue(root);
    state.loadTask.mockResolvedValue({ ok: true, manifest });
    context = { subscriptions: [] } as unknown as ExtensionContext;
    registerTaskCodeLens(context);
  });

  afterEach(() => {
    for (const item of context.subscriptions) item.dispose();
  });

  it.each([
    [root, root],
    ["C:\\a\\b", "c:\\a\\b"],
    ["c:\\a\\b", "C:\\a\\b"],
  ])(
    "確認中の問題だけ進捗とログへのリンクを表示し、終了時に元に戻す (%s / %s)",
    async (editorRoot, checkRoot) => {
      const changed = vi.fn();
      const listener = state.provider?.onDidChangeCodeLenses?.(changed);
      if (listener) context.subscriptions.push(listener);
      const platform = process.platform;
      state.taskRootOf.mockResolvedValue(editorRoot);
      const source = `${editorRoot}/src/q01.ts`;
      const text = "export {};";
      if (editorRoot !== checkRoot) Object.defineProperty(process, "platform", { value: "win32" });
      try {
        startTaskCheck({ root: checkRoot, taskId: manifest.id, problemId: "q01" });
        expect(changed).toHaveBeenCalledTimes(1);
        expect((await lenses(source, text))?.[0]?.command).toEqual({
          title: "$(sync~spin) 確認中…",
          command: "stella.showRunLog",
        });

        progressTaskCheck({ type: "plan", steps: [{ id: "test", label: "テスト (Vitest)" }] });
        progressTaskCheck({ type: "step-start", index: 0 });
        expect(changed).toHaveBeenCalledTimes(3);
        expect((await lenses(source, text))?.[0]?.command).toEqual({
          title: "$(sync~spin) 確認中 1/1 テスト (Vitest)",
          command: "stella.showRunLog",
        });
        expect((await lenses(`${editorRoot}/src/q02.ts`, text))?.[0]?.command?.command).toBe(
          "stella.submitTask",
        );
        const otherRoot = "/workspace/other/q01";
        state.taskRootOf.mockResolvedValueOnce(otherRoot);
        expect((await lenses(`${otherRoot}/src/q01.ts`, text))?.[0]?.command?.command).toBe(
          "stella.submitTask",
        );
      } finally {
        Object.defineProperty(process, "platform", { value: platform });
        finishTaskCheck({
          root: checkRoot,
          manifest,
          saved: false,
          result: {
            schemaVersion: 1,
            taskId: manifest.id,
            runner: manifest.runner,
            outcome: "cancelled",
            startedAt: "2026-11-01T00:00:00.000Z",
            durationMs: 1,
            platform: "linux",
            toolVersions: {},
            steps: [],
            files: [],
            protected: [],
            manifestSha256: "m",
          },
        });
      }
      expect(changed).toHaveBeenCalledTimes(4);
      expect((await lenses(source, text))?.[0]?.command).toEqual({
        title: "▷ 確認して提出",
        command: "stella.submitTask",
        arguments: [editorRoot, "q01"],
      });
    },
  );

  it.each([
    ["// export の説明\n\nexport const x = 1;\nexport const y = 2;", 2],
    ["// 問題文\nconst x = 1;", 0],
  ])("最初の export の行か先頭行に、問題を指定して提出するリンクを出す", async (text, line) => {
    expect(await lenses(`${root}/src/q01.ts`, text)).toMatchObject([
      {
        range: { startLine: line },
        command: {
          title: "▷ 確認して提出",
          command: "stella.submitTask",
          arguments: [root, "q01"],
        },
      },
    ]);
  });

  it("問題ファイル以外とワークスペース外には出さない", async () => {
    expect(await lenses(`${root}/tests/q01.test.ts`, "export {};")).toEqual([]);
    expect(await lenses(`${root}/src/other.ts`, "export {};")).toEqual([]);
    state.taskRootOf.mockResolvedValue(null);
    expect(await lenses("/outside/src/q01.ts", "export {};")).toEqual([]);
  });

  it("信頼していないワークスペースでは課題を読まない", async () => {
    state.trusted = false;
    expect(await lenses(`${root}/src/q01.ts`, "export {};")).toEqual([]);
    expect(state.taskRootOf).not.toHaveBeenCalled();
    expect(state.loadTask).not.toHaveBeenCalled();
  });
});
