/**
 * 接続の切り替えと課題パネルの競合 (#36)。拡張の本物の AuthStore と API クライアントを通し、
 * 受講者の切り替えの途中で、前の受講者の解答例が見えたり、前の受講者の操作が新しい受講者の
 * 名前で記録されたりしないことを確かめる。
 */
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TaskHelpResponse } from "@stella/shared/tasks/help";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => Promise<void> | void>(),
  folders: [] as string[],
  documents: [] as { uri: unknown }[],
  html: [] as string[],
  provider: undefined as
    | { provideTextDocumentContent: (uri: unknown) => string | Promise<string> }
    | undefined,
}));

vi.mock("vscode", () => {
  class EventEmitter<T> {
    private listeners: ((value: T) => void)[] = [];
    event = (listener: (value: T) => void) => {
      this.listeners.push(listener);
      return { dispose: () => undefined };
    };
    fire = (value: T) => {
      for (const listener of [...this.listeners]) listener(value);
    };
    dispose = () => {
      this.listeners = [];
    };
  }
  return {
    EventEmitter,
    Uri: {
      from: (parts: { scheme: string; path: string; query?: string }) => ({
        ...parts,
        query: parts.query ?? "",
        toString: () => `${parts.scheme}:${parts.path}${parts.query ? `?${parts.query}` : ""}`,
      }),
      file: (fsPath: string) => ({ scheme: "file", fsPath }),
    },
    ViewColumn: { Beside: 2 },
    window: {
      activeTextEditor: undefined,
      createWebviewPanel: () => ({
        title: "",
        reveal: () => undefined,
        onDidDispose: () => ({ dispose: () => undefined }),
        dispose: () => undefined,
        webview: {
          set html(value: string) {
            state.html.push(value);
          },
        },
      }),
      showErrorMessage: vi.fn(),
      showInformationMessage: vi.fn(),
      showWarningMessage: vi.fn(async () => undefined),
      showTextDocument: vi.fn(),
    },
    workspace: {
      get workspaceFolders() {
        return state.folders.map((fsPath) => ({ uri: { fsPath } }));
      },
      get textDocuments() {
        return state.documents;
      },
      getConfiguration: () => ({ inspect: () => undefined }),
      openTextDocument: vi.fn(),
      onDidCloseTextDocument: () => ({ dispose: () => undefined }),
      registerTextDocumentContentProvider: (_scheme: string, provider: typeof state.provider) => {
        state.provider = provider;
        return { dispose: () => undefined };
      },
    },
    commands: {
      registerCommand: (id: string, handler: (...args: unknown[]) => Promise<void> | void) => {
        state.handlers.set(id, handler);
        return { dispose: () => undefined };
      },
      executeCommand: vi.fn(),
    },
  };
});

const { AuthStore } = await import("./auth.js");
const { initApi } = await import("./api.js");
const { registerTaskHelp } = await import("./task-help.js");

const TASK_ID = "dev-env-basics/m0-first-page/q01-first-page";
const HASH = "a".repeat(64);
const SECRET = "PREVIOUS_LEARNER_SOLUTION_57";
const encode = (text: string) => Buffer.from(text).toString("base64");

function help(overrides: Partial<TaskHelpResponse> = {}): TaskHelpResponse {
  return {
    taskId: TASK_ID,
    title: "最初のページを作る",
    kind: "basic",
    status: "passed",
    phase: "passed",
    referencesOnly: false,
    notice: null,
    attempts: null,
    hints: [{ level: 1, state: "available" }],
    solution: {
      state: "opened",
      files: [{ path: "index.html", content: encode(`<h1>${SECRET}</h1>`) }],
    },
    explanation: { state: "available" },
    autoOpen: [],
    latestSubmission: null,
    ...overrides,
  };
}

/** 古いキーの削除を止めておける SecretStorage (setToken の途中を作る)。 */
function secretStorage(token: string) {
  const values = new Map([["stella.accessToken", token]]);
  let releaseDelete: () => void = () => undefined;
  let holdDelete = false;
  return {
    values,
    hold() {
      holdDelete = true;
    },
    release() {
      holdDelete = false;
      releaseDelete();
    },
    storage: {
      onDidChange: () => ({ dispose: () => undefined }),
      get: async (key: string) => values.get(key),
      store: async (key: string, value: string) => {
        values.set(key, value);
      },
      delete: (key: string) =>
        new Promise<void>((resolve) => {
          const done = () => {
            values.delete(key);
            resolve();
          };
          if (holdDelete) releaseDelete = done;
          else done();
        }),
    },
  };
}

const fetchMock = vi.fn<typeof fetch>();
const tokensOf = (url: string) =>
  fetchMock.mock.calls
    .filter(([input]) => String(input).includes(url))
    .map(([, init]) => new Headers(init?.headers).get("Authorization"));

describe("接続の切り替えと課題パネル (本物の AuthStore と API クライアント)", () => {
  let root: string;
  let secrets: ReturnType<typeof secretStorage>;
  let store: InstanceType<typeof AuthStore>;
  beforeEach(async () => {
    state.handlers.clear();
    state.documents = [];
    state.html = [];
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    root = await mkdtemp(path.join(tmpdir(), "stella-help-auth-"));
    await mkdir(path.join(root, ".stella"), { recursive: true });
    await writeFile(
      path.join(root, ".stella", "task.json"),
      JSON.stringify({
        schemaVersion: 1,
        id: TASK_ID,
        title: "最初のページを作る",
        kind: "basic",
        runner: "static-preview",
        submit: { files: ["index.html"] },
        static: { checks: [{ type: "html-document", path: "index.html" }] },
      }),
    );
    await writeFile(
      path.join(root, ".stella", "distribution.json"),
      JSON.stringify({ taskId: TASK_ID, contentHash: HASH }),
    );
    state.folders = [root];
    secrets = secretStorage("OLD-TOKEN");
    store = new AuthStore(secrets.storage as never);
    initApi(store);
    registerTaskHelp({ subscriptions: [] } as never);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("切り替えの途中 (古いキーの削除を待つ間) の開く操作を、新しい受講者のトークンで送らない", async () => {
    fetchMock.mockImplementation(async () => Response.json(help()));
    // 前の受講者がヒントを開こうとした直後に、別の受講者が接続し始める。
    const opening = state.handlers.get("stella.openTaskHelpItem")?.(root, "hint", 1);
    secrets.hold();
    const switching = store.setToken("NEW-TOKEN");
    await opening;
    expect(tokensOf("/api/tasks/help/open")).not.toContain("Bearer NEW-TOKEN");
    secrets.release();
    await switching;
    // 切り替えのあとに始めた操作は、新しい受講者のトークンで送る。
    await state.handlers.get("stella.openTaskHelpItem")?.(root, "hint", 1);
    expect(tokensOf("/api/tasks/help/open")).toEqual(["Bearer NEW-TOKEN"]);
  });

  it("切り替えた直後、読み直しの応答を待たずに、開いている解答例の中身を差し替える", async () => {
    fetchMock.mockImplementation(async () => Response.json(help()));
    const uri = {
      scheme: "stella-solution",
      path: `/${encodeURIComponent(TASK_ID)}/index.html`,
      query: new URLSearchParams({ contentHash: HASH }).toString(),
      toString: () =>
        `stella-solution:/${encodeURIComponent(TASK_ID)}/index.html?contentHash=${HASH}`,
    };
    const provider = state.provider;
    if (!provider) throw new Error("提供元が登録されていません");
    expect(await provider.provideTextDocumentContent(uri)).toContain(SECRET);
    state.documents = [{ uri }];
    // 切り替えのあとは API が応答しない (落ちている・止まっている)。
    fetchMock.mockImplementation(() => new Promise<Response>(() => undefined));
    await store.setToken("NEW-TOKEN");
    const again = provider.provideTextDocumentContent(uri);
    const shown =
      typeof again === "string"
        ? again
        : await Promise.race([
            again,
            new Promise<string>((resolve) => setTimeout(() => resolve("<応答待ち>"), 50)),
          ]);
    expect(shown).not.toContain(SECRET);
    expect(shown).not.toBe("<応答待ち>");
  });
});
