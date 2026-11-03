import type * as vscode from "vscode";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
vi.mock("./task-panel.js", () => ({ sideColumn: () => 2 }));
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
function send(action: string, explanation = "保存したページを確認しました。", token?: string) {
  state.receive({
    action,
    draft: { explanation },
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
