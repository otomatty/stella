import type * as vscode from "vscode";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api.js";
const state = vi.hoisted(() => ({
  receive: (_raw: unknown): void => undefined,
  disposeListener: (): void => undefined,
  authChange: (): void => undefined,
  closed: false,
  html: "",
  post: vi.fn(),
  reveal: vi.fn(),
  create: vi.fn(),
}));
vi.mock("./auth.js", () => ({
  onDidChangeAuthSession: (listener: () => void) => {
    state.authChange = listener;
    return { dispose: vi.fn() };
  },
}));
vi.mock("./task-panel.js", () => ({ sideColumn: () => 2, trackTaskSidePanel: vi.fn() }));
vi.mock("./api.js", () => ({ apiRequest: vi.fn() }));
vi.mock("vscode", () => ({
  Uri: {
    joinPath: (_root: unknown, ...parts: string[]) => ({
      toString: () => `https://local.test/${parts.join("/")}`,
    }),
  },
  window: {
    createWebviewPanel: (...args: unknown[]) => {
      state.create(...args);
      return {
        webview: {
          cspSource: "https://local.test",
          get html() {
            return state.html;
          },
          set html(value: string) {
            state.html = value;
          },
          asWebviewUri: (uri: unknown) => uri,
          postMessage: state.post,
          onDidReceiveMessage: (listener: (raw: unknown) => void) => {
            state.receive = listener;
            return { dispose: vi.fn() };
          },
        },
        reveal: state.reveal,
        dispose: () => {
          if (!state.closed) {
            state.closed = true;
            state.disposeListener();
          }
        },
        onDidDispose: (listener: () => void) => {
          state.disposeListener = listener;
          return { dispose: vi.fn() };
        },
      };
    },
  },
}));
import { registerSubmissionForms, showSubmissionForm } from "./submission-form.js";

const input = { key: "task", title: "最初のページを作る", mode: "submit" as const };
let subscriptions: vscode.Disposable[] = [];
beforeEach(() => {
  vi.clearAllMocks();
  state.closed = false;
  state.html = "";
  subscriptions = [];
  registerSubmissionForms({
    extensionUri: {} as vscode.Uri,
    subscriptions,
  } as vscode.ExtensionContext);
});
afterEach(() => {
  for (const disposable of subscriptions) disposable.dispose();
  vi.useRealTimers();
});
function send(
  action: string,
  explanation = "保存したページを確認しました。",
  token?: string,
  shareReflection?: unknown,
) {
  state.receive({
    action,
    draft: { explanation, shareReflection },
    token: token ?? state.html.match(/data-token="([^"]+)"/)?.[1],
  });
}

describe("WebViewでの提出", () => {
  it("同じ課題で開き直すと既存の下書き画面へ戻る", () => {
    const actions = {
      save: vi.fn().mockResolvedValue(undefined),
      submit: vi.fn().mockResolvedValue(undefined),
    };
    showSubmissionForm(input, actions);
    showSubmissionForm(input, actions);
    expect(state.create).toHaveBeenCalledTimes(1);
    expect(state.reveal).toHaveBeenCalled();
  });
  it("送信エラーでは入力画面を残し、そのまま再送できる", async () => {
    const actions = {
      save: vi.fn().mockResolvedValue(undefined),
      submit: vi
        .fn()
        .mockRejectedValueOnce(new Error("接続できませんでした"))
        .mockResolvedValueOnce(undefined),
    };
    showSubmissionForm(input, actions);
    send("submit");
    await vi.waitFor(() =>
      expect(state.post).toHaveBeenCalledWith({ kind: "error", message: "接続できませんでした" }),
    );
    expect(state.closed).toBe(false);
    send("submit");
    await vi.waitFor(() => expect(state.closed).toBe(true));
    expect(actions.submit).toHaveBeenCalledTimes(2);
  });
  it("テンプレートだけでは送信せず、古い画面や未知の操作も実行しない", async () => {
    const actions = {
      save: vi.fn().mockResolvedValue(undefined),
      submit: vi.fn().mockResolvedValue(undefined),
    };
    showSubmissionForm(input, actions);
    send("submit", "## 取り組んだこと\n\n## 振り返り\n");
    send("submit", "振り返り", "old-token");
    send("arbitrary-command");
    await Promise.resolve();
    expect(actions.submit).not.toHaveBeenCalled();
    expect(actions.save).not.toHaveBeenCalled();
  });
  it("接続が変わったらフォームを閉じ、前の画面からは送信しない", async () => {
    const actions = {
      save: vi.fn().mockResolvedValue(undefined),
      submit: vi.fn().mockResolvedValue(undefined),
    };
    showSubmissionForm(input, actions);
    state.authChange();
    send("submit");
    await Promise.resolve();
    expect(state.closed).toBe(true);
    expect(actions.submit).not.toHaveBeenCalled();
  });
  it("入力を自動保存し、連打しても送信は一度だけにする", async () => {
    vi.useFakeTimers();
    let finish: () => void = () => undefined;
    const actions = {
      save: vi.fn().mockResolvedValue(undefined),
      submit: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      ),
    };
    showSubmissionForm(input, actions);
    send("change", "書きかけ");
    await vi.advanceTimersByTimeAsync(650);
    expect(actions.save).toHaveBeenCalledWith({ explanation: "書きかけ" });
    send("submit");
    send("submit");
    await vi.advanceTimersByTimeAsync(0);
    expect(actions.submit).toHaveBeenCalledTimes(1);
    finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(state.closed).toBe(true);
  });
});

describe("グループに振り返りを共有する", () => {
  const sharingInput = { ...input, reflectionSharing: { session: 7 } };
  const createActions = () => ({
    save: vi.fn().mockResolvedValue(undefined),
    submit: vi.fn().mockResolvedValue(undefined),
  });

  it("フォームを先に開き、公開中のグループが確認できたら共有欄を出す", async () => {
    let resolveGroups: (value: unknown) => void = () => undefined;
    vi.mocked(apiRequest).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveGroups = resolve;
      }),
    );
    const actions = createActions();
    showSubmissionForm(sharingInput, actions);
    expect(apiRequest).toHaveBeenCalledWith("/api/groups/mine", { session: 7 });
    expect(state.html).toContain("この内容で提出する");
    send("ready");
    expect(state.post).not.toHaveBeenCalledWith({ kind: "share-reflection" });
    send("save", "応答を待つ間の下書き");
    await vi.waitFor(() => expect(actions.save).toHaveBeenCalled());
    resolveGroups({ groups: [{ shareActivity: false }, { shareActivity: true }] });
    await vi.waitFor(() => expect(state.post).toHaveBeenCalledWith({ kind: "share-reflection" }));
    send("change", "共有したい振り返り", undefined, true);
    await vi.waitFor(() =>
      expect(actions.save).toHaveBeenLastCalledWith({
        explanation: "共有したい振り返り",
        shareReflection: true,
      }),
    );
    const initial = actions.save.mock.lastCall?.[0];
    state.disposeListener();
    state.closed = false;
    state.post.mockClear();
    vi.mocked(apiRequest).mockResolvedValueOnce({ groups: [{ shareActivity: true }] });
    showSubmissionForm({ ...sharingInput, initial }, actions);
    expect(state.html).toContain('description" checked');
    send("ready");
    await vi.waitFor(() => expect(state.post).toHaveBeenCalledWith({ kind: "share-reflection" }));
    send("submit", "今回は共有しない", undefined, false);
    await vi.waitFor(() =>
      expect(actions.submit).toHaveBeenCalledWith({
        explanation: "今回は共有しない",
        shareReflection: false,
      }),
    );
  });

  it.each([
    ["未所属", { groups: [] }],
    ["公開オフ", { groups: [{ shareActivity: false }] }],
    ["旧 API", { groups: [{ id: "group" }] }],
    ["403", new Error("API 403")],
    ["通信失敗", new TypeError("fetch failed")],
  ])("%s では欄を出さず入力された共有値も送らない", async (_label, result) => {
    if (result instanceof Error) vi.mocked(apiRequest).mockRejectedValueOnce(result);
    else vi.mocked(apiRequest).mockResolvedValueOnce(result);
    const actions = createActions();
    showSubmissionForm(sharingInput, actions);
    send("ready");
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(state.post).not.toHaveBeenCalledWith({ kind: "share-reflection" });
    send("submit", "振り返り", undefined, true);
    await vi.waitFor(() =>
      expect(actions.submit).toHaveBeenCalledWith({ explanation: "振り返り" }),
    );
  });

  it("相談ではグループの取得を始めず、保存済みの共有設定も送らない", async () => {
    const actions = createActions();
    showSubmissionForm(
      { ...sharingInput, mode: "consult", initial: { explanation: "記録", shareReflection: true } },
      actions,
    );
    expect(apiRequest).not.toHaveBeenCalled();
    send("submit", "相談本文", undefined, true);
    await vi.waitFor(() =>
      expect(actions.submit).toHaveBeenCalledWith({ explanation: "相談本文" }),
    );
  });

  it("グループの応答を待たずに提出できる", async () => {
    vi.mocked(apiRequest).mockReturnValueOnce(new Promise(() => undefined));
    const actions = createActions();
    showSubmissionForm(sharingInput, actions);
    send("ready");
    send("submit");
    await vi.waitFor(() => expect(state.closed).toBe(true));
    expect(actions.submit).toHaveBeenCalledWith({ explanation: "保存したページを確認しました。" });
  });
});
