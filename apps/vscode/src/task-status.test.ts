import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ExtensionContext } from "vscode";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface FakeItem {
  text: string;
  tooltip: string;
  command: { command: string; arguments: unknown[] } | undefined;
  visible: boolean;
  show: () => void;
  hide: () => void;
  dispose: () => void;
}

const state = vi.hoisted(() => ({
  folders: [] as string[],
  activeFile: undefined as string | undefined,
  items: [] as FakeItem[],
  editorListener: undefined as ((editor: unknown) => Promise<void>) | undefined,
  executeCommand: vi.fn(),
}));

const apiRequest = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock("./api.js", () => ({ apiRequest, apiSession: () => 1 }));

vi.mock("vscode", () => ({
  StatusBarAlignment: { Left: 1 },
  window: {
    get activeTextEditor() {
      return state.activeFile
        ? { document: { uri: { scheme: "file", fsPath: state.activeFile } } }
        : undefined;
    },
    createStatusBarItem: () => {
      const item: FakeItem = {
        text: "",
        tooltip: "",
        command: undefined,
        visible: false,
        show: () => {
          item.visible = true;
        },
        hide: () => {
          item.visible = false;
        },
        dispose: () => undefined,
      };
      state.items.push(item);
      return item;
    },
    onDidChangeActiveTextEditor: (listener: (editor: unknown) => Promise<void>) => {
      state.editorListener = listener;
      return { dispose: () => undefined };
    },
  },
  workspace: {
    get workspaceFolders() {
      return state.folders.map((fsPath) => ({ uri: { fsPath } }));
    },
    onDidChangeWorkspaceFolders: () => ({ dispose: () => undefined }),
  },
  commands: { executeCommand: state.executeCommand },
}));

import { registerTaskStatus, setCurrentTask } from "./task-status.js";

let workspace = "";
let root = "";
let context: ExtensionContext;

beforeEach(async () => {
  vi.clearAllMocks();
  state.items = [];
  workspace = await mkdtemp(path.join(tmpdir(), "stella-status-"));
  root = path.join(workspace, "course", "unit", "q01");
  await mkdir(path.join(root, ".stella"), { recursive: true });
  await writeFile(
    path.join(root, ".stella", "task.json"),
    JSON.stringify({
      schemaVersion: 1,
      id: "course/unit/q01",
      title: "最初のページを作る",
      kind: "basic",
      runner: "static-preview",
      submit: { files: ["index.html"] },
      static: { checks: [{ type: "html-document", path: "index.html" }] },
    }),
  );
  await writeFile(path.join(root, "index.html"), "");
  await writeFile(path.join(workspace, "memo.txt"), "");
  state.folders = [workspace];
  state.activeFile = undefined;
  context = { subscriptions: [] } as unknown as ExtensionContext;
});
afterEach(async () => {
  for (const item of context.subscriptions) item.dispose();
  await rm(workspace, { recursive: true, force: true });
});

const editor = (file: string | undefined) =>
  file ? { document: { uri: { scheme: "file", fsPath: file } } } : undefined;
const inTask = () => state.executeCommand.mock.calls.at(-1);

describe("ステータスバーの課題のボタン", () => {
  it("課題フォルダーのファイルを開くと「課題を確認する」「課題文」を出し、課題フォルダーを渡す", async () => {
    state.activeFile = path.join(root, "index.html");
    registerTaskStatus(context);
    await state.editorListener?.(editor(state.activeFile));
    const [run, readme] = state.items;
    expect(run?.visible).toBe(true);
    expect(run?.text).toContain("課題を確認する");
    expect(run?.tooltip).toContain("最初のページを作る");
    expect(run?.command).toMatchObject({ command: "stella.runTask", arguments: [root] });
    expect(readme?.command).toMatchObject({
      command: "stella.showTaskReadme",
      arguments: [root],
    });
    expect(inTask()).toEqual(["setContext", "stella.inTask", true]);
    expect(state.items[2]?.visible).toBe(false);
  });

  it("問題つきの課題は提出済みの件数を出す", async () => {
    const problemRoot = path.join(workspace, "extra", "unit", "calc");
    await mkdir(path.join(problemRoot, ".stella"), { recursive: true });
    await writeFile(
      path.join(problemRoot, ".stella", "task.json"),
      JSON.stringify({
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
        protected: [],
        checks: { lint: false, format: false },
      }),
    );
    await mkdir(path.join(problemRoot, "src"), { recursive: true });
    await writeFile(path.join(problemRoot, "src", "q01-add.ts"), "export const add = 1;\n");
    apiRequest.mockResolvedValue({
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
    });
    state.activeFile = path.join(problemRoot, "src", "q01-add.ts");
    registerTaskStatus(context);
    await state.editorListener?.(editor(state.activeFile));
    expect(state.items[2]?.visible).toBe(true);
    expect(state.items[2]?.text).toBe("1/2 問");
  });

  it("パネルに移っても出したままにし、課題の外のファイルに移ったら隠す", async () => {
    registerTaskStatus(context);
    await state.editorListener?.(editor(path.join(root, "index.html")));
    await state.editorListener?.(undefined);
    expect(state.items[0]?.visible).toBe(true);
    await state.editorListener?.(editor(path.join(workspace, "memo.txt")));
    expect(state.items.every((item) => !item.visible)).toBe(true);
    expect(inTask()).toEqual(["setContext", "stella.inTask", false]);
  });

  it("ワークスペースの外のファイルからは課題を探さない", async () => {
    const outside = await mkdtemp(path.join(tmpdir(), "stella-outside-"));
    try {
      await mkdir(path.join(outside, ".stella"));
      await writeFile(path.join(outside, ".stella", "task.json"), "{}");
      registerTaskStatus(context);
      await state.editorListener?.(editor(path.join(outside, "index.html")));
      expect(state.items.every((item) => !item.visible)).toBe(true);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("課題文のパネルを開いたときは、知らされた課題を出す", () => {
    registerTaskStatus(context);
    setCurrentTask({ root, title: "最初のページを作る" });
    expect(state.items[0]?.visible).toBe(true);
    expect(state.items[0]?.command?.arguments).toEqual([root]);
  });
});
