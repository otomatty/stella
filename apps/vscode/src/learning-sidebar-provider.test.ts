import type * as vscode from "vscode";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthStore } from "./auth.js";
import type { CatalogStage } from "./catalog.js";

const mocks = vi.hoisted(() => ({ load: vi.fn(), execute: vi.fn() }));
vi.mock("./auth.js", () => ({ onDidChangeAuth: vi.fn(), onDidChangeAuthSession: vi.fn() }));
vi.mock("./catalog.js", () => ({ loadCatalog: mocks.load, clearCatalog: vi.fn() }));
vi.mock("vscode", () => ({
  Uri: {
    joinPath: (_root: unknown, ...parts: string[]) => ({
      toString: () => `https://local.test/${parts.join("/")}`,
    }),
  },
  commands: { executeCommand: mocks.execute },
  window: { showErrorMessage: vi.fn() },
}));

import { LearningSidebarProvider } from "./tree.js";

const catalog: CatalogStage[] = [
  {
    id: "s",
    title: "ステージ",
    sections: [
      {
        id: "u",
        title: "単元",
        lessons: [
          {
            id: "doc",
            stageId: "s",
            title: "まとめ",
            type: "text",
            completed: false,
            markdown: "# 正しい教材",
          },
        ],
      },
    ],
  },
];

function harness(getToken = vi.fn().mockResolvedValue("token")) {
  let listener: (raw: unknown) => void = () => undefined;
  const disposable = { dispose: vi.fn() };
  const view = {
    visible: true,
    webview: {
      html: "",
      cspSource: "https://local.test",
      options: {},
      asWebviewUri: (uri: unknown) => uri,
      onDidReceiveMessage: (callback: (raw: unknown) => void) => {
        listener = callback;
        return disposable;
      },
    },
    onDidChangeVisibility: () => disposable,
    onDidDispose: () => disposable,
  };
  const provider = new LearningSidebarProvider(
    { getToken } as unknown as AuthStore,
    {} as vscode.Uri,
  );
  provider.resolveWebviewView(view as unknown as vscode.WebviewView);
  return {
    provider,
    view,
    send: (raw: Record<string, unknown>) => {
      const token = view.webview.html.match(/data-message-token="([^"]+)"/)?.[1];
      listener({ token, ...raw });
    },
  };
}

beforeEach(() => {
  mocks.load.mockReset().mockResolvedValue(catalog);
  mocks.execute.mockReset().mockResolvedValue(undefined);
});

describe("学習サイドバーと拡張の接続", () => {
  it("表示中のカタログの ID から、信頼できる教材と既存コマンドを引く", async () => {
    const { view, send } = harness();
    await vi.waitFor(() => expect(view.webview.html).toContain('data-select="stage"'));
    send({ action: "open", id: "doc", command: "untrusted.command", markdown: "差し替え" });
    await vi.waitFor(() =>
      expect(mocks.execute).toHaveBeenCalledWith(
        "stella.openLessonDoc",
        expect.objectContaining({ markdown: "# 正しい教材" }),
      ),
    );
    expect(view.webview.html).toContain('aria-current="page"');
  });

  it("未知の ID、任意のコマンド、古い表示からのメッセージを実行しない", async () => {
    const { provider, view, send } = harness();
    await vi.waitFor(() => expect(view.webview.html).toContain('data-select="stage"'));
    send({ action: "open", id: "missing" });
    send({ action: "arbitrary.command" });
    send({ action: "home", token: "old-token" });
    const token = view.webview.html.match(/data-message-token="([^"]+)"/)?.[1];
    provider.reset();
    send({ action: "open", id: "doc", token });
    await Promise.resolve();
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(view.webview.html).not.toContain("正しい教材");
  });

  it("接続を切り替える前に始めた読み込みで新しい教材を上書きしない", async () => {
    let finish: (value: CatalogStage[]) => void = () => undefined;
    mocks.load.mockImplementationOnce(
      () =>
        new Promise<CatalogStage[]>((resolve) => {
          finish = resolve;
        }),
    );
    const { provider, view } = harness();
    await vi.waitFor(() => expect(mocks.load).toHaveBeenCalledOnce());
    provider.reset();
    mocks.load.mockResolvedValue([{ id: "new", title: "新しい受講者のステージ", sections: [] }]);
    await provider.refresh();
    finish(catalog);
    await Promise.resolve();
    expect(view.webview.html).toContain("新しい受講者のステージ");
    expect(view.webview.html).not.toContain("この単元の教材");
  });

  it("未接続と、トークンを読み出せないときの案内を出す", async () => {
    const disconnected = harness(vi.fn().mockResolvedValue(null));
    await vi.waitFor(() => expect(disconnected.view.webview.html).toContain("Web で接続する"));
    const failed = harness(vi.fn().mockRejectedValue(new Error("<取得失敗>")));
    await vi.waitFor(() => expect(failed.view.webview.html).toContain("&lt;取得失敗&gt;"));
    expect(mocks.load).not.toHaveBeenCalled();
  });
});
