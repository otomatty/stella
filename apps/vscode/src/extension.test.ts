import type { ExtensionContext } from "vscode";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  handler: undefined as { handleUri: (uri: { path: string; query: string }) => void } | undefined,
  secrets: new Map<string, string>(),
  fetch: vi.fn<typeof fetch>(),
  openTask: vi.fn<(context: unknown, taskId: string) => Promise<void>>(),
  openExternal: vi.fn(),
  showInformationMessage: vi.fn(),
  showErrorMessage: vi.fn(),
}));

vi.mock("vscode", () => ({
  EventEmitter: class {
    event = () => ({ dispose: vi.fn() });
    fire = vi.fn();
    dispose = vi.fn();
  },
  Uri: { parse: (value: string) => value },
  workspace: { getConfiguration: () => ({ inspect: () => undefined }) },
  env: { openExternal: state.openExternal },
  window: {
    showInformationMessage: state.showInformationMessage,
    showErrorMessage: state.showErrorMessage,
    registerUriHandler: (handler: typeof state.handler) => {
      state.handler = handler;
      return { dispose: vi.fn() };
    },
  },
  commands: { registerCommand: () => ({ dispose: vi.fn() }) },
}));

// UI と採点は起動せず、拡張の URI 入口・認証ストア・API クライアントを通す。
vi.mock("./tree.js", () => ({ registerLessonTree: vi.fn() }));
vi.mock("./grader-host.js", () => ({ initGraderHost: () => ({ dispose: vi.fn() }) }));
vi.mock("./task-commands.js", () => ({ registerTaskCommands: vi.fn() }));
vi.mock("./exercise-panel.js", () => ({}));
vi.mock("./grader.js", () => ({}));
vi.mock("./lesson-doc.js", () => ({}));
vi.mock("./workspace.js", () => ({}));
vi.mock("./open-task.js", () => ({
  openDistributedTask: state.openTask,
  registerTaskOpening: vi.fn(),
}));

import { apiRequest } from "./api.js";
import { activate } from "./extension.js";

const taskId = "dev-env-basics/m0-first-page/q01-first-page";
const bundleUrl = `http://127.0.0.1:8787/api/tasks/bundle?${new URLSearchParams({ taskId })}`;

beforeEach(() => {
  vi.clearAllMocks();
  state.secrets.clear();
  state.fetch.mockReset();
  vi.stubGlobal("fetch", state.fetch);
  state.openTask.mockImplementation(async (_context, id) => {
    await apiRequest(`/api/tasks/bundle?${new URLSearchParams({ taskId: id })}`);
  });
  activate({
    subscriptions: [],
    secrets: {
      get: async (key: string) => state.secrets.get(key),
      store: async (key: string, value: string) => {
        state.secrets.set(key, value);
      },
      delete: async (key: string) => {
        state.secrets.delete(key);
      },
    },
    globalState: { get: () => undefined, update: async () => undefined },
  } as unknown as ExtensionContext);
});

afterEach(() => vi.unstubAllGlobals());

function dispatch(code?: string): void {
  if (!state.handler) throw new Error("URI handler not registered");
  state.handler.handleUri({
    path: "/task",
    query: new URLSearchParams({ taskId, ...(code ? { code } : {}) }).toString(),
  });
}

async function expectConnectionFlow(): Promise<void> {
  await vi.waitFor(() =>
    expect(state.openExternal).toHaveBeenCalledWith("http://127.0.0.1:5173/stages"),
  );
  expect(state.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining("課題一覧"));
}

describe("task URI の接続導線", () => {
  it("未接続なら課題 API を呼ばず Web の接続導線へ戻す", async () => {
    dispatch();
    await expectConnectionFlow();
    expect(state.openTask).not.toHaveBeenCalled();
    expect(state.fetch).not.toHaveBeenCalled();
    expect(state.showErrorMessage).not.toHaveBeenCalled();
  });

  it("接続コードの交換に失敗したら、そのエラーと再接続の導線を示す", async () => {
    state.fetch.mockResolvedValue(
      Response.json({ error: "接続コードが期限切れです" }, { status: 400 }),
    );
    dispatch("expired-code");
    await expectConnectionFlow();
    expect(state.showErrorMessage).toHaveBeenCalledWith("接続コードが期限切れです");
    expect(state.openTask).not.toHaveBeenCalled();
    expect(state.fetch).toHaveBeenCalledTimes(1);
  });

  it("交換したトークンで課題を開く", async () => {
    state.fetch
      .mockResolvedValueOnce(Response.json({ access_token: "new-token" }))
      .mockResolvedValueOnce(Response.json({}));
    dispatch("valid-code");
    await vi.waitFor(() => expect(state.fetch).toHaveBeenCalledTimes(2));
    await state.openTask.mock.results[0].value;
    expect(state.secrets.get("stella.accessToken")).toBe("new-token");
    expect(state.openTask).toHaveBeenCalledWith(expect.anything(), taskId);
    expect(state.fetch).toHaveBeenLastCalledWith(
      bundleUrl,
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    const headers = new Headers(state.fetch.mock.calls[1][1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer new-token");
    expect(state.openExternal).not.toHaveBeenCalled();
    expect(state.showErrorMessage).not.toHaveBeenCalled();
  });

  it("接続済みならコードなしでも保存したトークンで課題を開く", async () => {
    state.secrets.set("stella.accessToken", "saved-token");
    state.fetch.mockResolvedValue(Response.json({}));
    dispatch();
    await vi.waitFor(() => expect(state.fetch).toHaveBeenCalledTimes(1));
    await state.openTask.mock.results[0].value;
    expect(state.openTask).toHaveBeenCalledWith(expect.anything(), taskId);
    const headers = new Headers(state.fetch.mock.calls[0][1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer saved-token");
    expect(state.openExternal).not.toHaveBeenCalled();
    expect(state.showErrorMessage).not.toHaveBeenCalled();
  });

  it("課題 API が 401 を返したらトークンを消し、再接続へ戻す", async () => {
    state.secrets.set("stella.accessToken", "expired-token");
    state.fetch.mockResolvedValue(Response.json({ error: "expired" }, { status: 401 }));
    dispatch();
    await expectConnectionFlow();
    expect(state.secrets.has("stella.accessToken")).toBe(false);
    expect(state.showErrorMessage).not.toHaveBeenCalled();
  });

  it("認証切れ以外のエラーは元のメッセージを表示する", async () => {
    state.secrets.set("stella.accessToken", "saved-token");
    state.fetch.mockResolvedValue(Response.json({ error: "task not found" }, { status: 404 }));
    dispatch();
    await vi.waitFor(() => expect(state.showErrorMessage).toHaveBeenCalledWith("task not found"));
    expect(state.openExternal).not.toHaveBeenCalled();
    expect(state.secrets.get("stella.accessToken")).toBe("saved-token");
  });
});
