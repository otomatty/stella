import type { CodeLensProvider, ExtensionContext, TextDocument } from "vscode";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerTaskCodeLens } from "./task-code-lens.js";

const state = vi.hoisted(() => ({
  trusted: true,
  provider: undefined as CodeLensProvider | undefined,
  taskRootOf: vi.fn(),
  loadTask: vi.fn(),
}));

vi.mock("vscode", () => ({
  EventEmitter: class {
    event = vi.fn();
    fire = vi.fn();
    dispose = vi.fn();
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
vi.mock("./runner/run-task.js", () => ({ loadTask: state.loadTask }));

const root = "/workspace/q01";
const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() };

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
    state.loadTask.mockResolvedValue({
      ok: true,
      manifest: { runner: "ts-test", problems: [{ id: "q01", title: "最初の問題" }] },
    });
    registerTaskCodeLens({ subscriptions: [] } as unknown as ExtensionContext);
  });

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
