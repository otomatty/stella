import type * as vscode from "vscode";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthExpiredError } from "./api.js";
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
          },
        ],
      },
    ],
  },
];

function harness(getToken = vi.fn().mockResolvedValue("token"), ready = true) {
  let renderedHtml = "";
  let listener: (raw: unknown) => void = () => undefined;
  const disposable = { dispose: vi.fn() };
  const view = {
    visible: true,
    webview: {
      html: "",
      postMessage: vi.fn((message: { html: string }) => {
        renderedHtml = message.html;
        return Promise.resolve(true);
      }),
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
  const documentHtml = view.webview.html;
  if (ready)
    listener({ action: "ready", token: documentHtml.match(/data-message-token="([^"]+)"/)?.[1] });
  return {
    get html() {
      return renderedHtml || view.webview.html;
    },
    ready: () =>
      listener({ action: "ready", token: documentHtml.match(/data-message-token="([^"]+)"/)?.[1] }),
    provider,
    view,
    send: (raw: Record<string, unknown>) => {
      const token = (renderedHtml || view.webview.html).match(/data-message-token="([^"]+)"/)?.[1];
      listener({ token, ...raw });
    },
  };
}

beforeEach(() => {
  mocks.load.mockReset().mockResolvedValue(catalog);
  mocks.execute.mockReset().mockResolvedValue(undefined);
});

describe("学習サイドバーと拡張の接続", () => {
  it("手動の再読み込みでは初期文書を維持し、開始・完了をメッセージで送る", async () => {
    const h = harness();
    const initialDocument = h.view.webview.html;
    await vi.waitFor(() => expect(h.html).toContain('data-select="stage"'));
    let finish: (value: CatalogStage[]) => void = () => undefined;
    mocks.load.mockImplementationOnce(
      () =>
        new Promise<CatalogStage[]>((resolve) => {
          finish = resolve;
        }),
    );
    h.send({ action: "refresh" });
    await vi.waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(2));
    expect(h.html).toContain('aria-busy="true"');
    expect(h.html).toContain('class="loading-layout"');
    expect(h.html).toContain('<ol class="segments"><li class="skeleton"></li>');
    expect(h.html).toContain('<span class="kind-icon skeleton"></span>');
    expect(h.html).not.toContain('class="current-label"');
    expect(h.html).not.toMatch(/\bstyle\s*=|<style\b/i);
    expect(h.view.webview.html).toBe(initialDocument);
    finish(catalog);
    await vi.waitFor(() => expect(h.html).toContain('aria-busy="false"'));
    expect(h.html).toContain(
      '<ol class="segments" role="img" aria-label="1 件中 0 件完了"><li class="here"></li></ol>',
    );
    expect(h.view.webview.html).toBe(initialDocument);
  });

  it("裏の更新は読み込み中も同じ内容を取得したあとも描き直さない", async () => {
    const h = harness();
    await vi.waitFor(() => expect(h.html).toContain('data-select="stage"'));
    const initialCatalog = h.html;
    const { postMessage } = h.view.webview;
    postMessage.mockClear();
    let finish: (value: CatalogStage[]) => void = () => undefined;
    mocks.load.mockImplementationOnce(
      () =>
        new Promise<CatalogStage[]>((resolve) => {
          finish = resolve;
        }),
    );
    const refreshing = h.provider.refresh();
    await vi.waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(2));
    expect(h.html).toBe(initialCatalog);
    expect(h.html).toContain('aria-busy="false"');
    expect(h.html).not.toContain('class="loading-layout"');
    expect(postMessage).not.toHaveBeenCalled();
    finish(structuredClone(catalog));
    await refreshing;
    expect(h.html).toBe(initialCatalog);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it("裏の更新で進捗が変わると最新の選択で一度だけ描き直す", async () => {
    const sharedCatalog = structuredClone(catalog);
    mocks.load.mockResolvedValueOnce(sharedCatalog);
    const h = harness();
    await vi.waitFor(() => expect(h.html).toContain('data-select="stage"'));
    const { postMessage } = h.view.webview;
    let finish: (value: CatalogStage[]) => void = () => undefined;
    mocks.load.mockImplementationOnce(
      () =>
        new Promise<CatalogStage[]>((resolve) => {
          finish = resolve;
        }),
    );
    const refreshing = h.provider.refresh();
    await vi.waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(2));
    h.provider.reveal({ lessonId: "doc" });
    postMessage.mockClear();
    sharedCatalog[0].sections[0].lessons[0].completed = true;
    finish(structuredClone(sharedCatalog));
    await refreshing;
    expect(postMessage).toHaveBeenCalledOnce();
    expect(h.html).toContain('aria-busy="false"');
    expect(h.html).toContain("1 件中 1 件完了");
    expect(h.html).toContain('<li class="lesson done current">');
  });

  it("裏の更新で通信に失敗してもカタログを残し、手動の再読み込みではエラーを出す", async () => {
    const h = harness();
    await vi.waitFor(() => expect(h.html).toContain('data-select="stage"'));
    const initialCatalog = h.html;
    const { postMessage } = h.view.webview;
    postMessage.mockClear();
    mocks.load.mockRejectedValue(new Error("通信エラー"));
    await h.provider.refresh();
    expect(h.html).toBe(initialCatalog);
    expect(postMessage).not.toHaveBeenCalled();
    h.send({ action: "open", id: "doc" });
    expect(mocks.execute).toHaveBeenCalledWith("stella.openInWeb", "s", "doc");

    await h.provider.refresh({ showLoading: true });
    expect(h.html).toContain('data-state="error"');
    expect(h.html).toContain("通信エラー");
  });

  it.each(["トークンなし", "認証切れ"])("裏の更新で接続案内に切り替える (%s)", async (reason) => {
    const getToken = vi.fn().mockResolvedValue("token");
    const h = harness(getToken);
    await vi.waitFor(() => expect(h.html).toContain('data-select="stage"'));
    const { postMessage } = h.view.webview;
    postMessage.mockClear();
    if (reason === "トークンなし") getToken.mockResolvedValueOnce(null);
    else mocks.load.mockRejectedValueOnce(new AuthExpiredError());
    await h.provider.refresh();
    expect(postMessage).toHaveBeenCalledOnce();
    expect(h.html).toContain('data-state="disconnected"');
    expect(h.html).toContain("Web で接続する");
    expect(h.html).not.toContain('data-select="stage"');
  });

  it("スクリプトの準備より早く取得が終わっても、readyの後に最新状態を送る", async () => {
    const h = harness(vi.fn().mockResolvedValue("token"), false);
    const initialDocument = h.view.webview.html;
    await h.provider.refresh();
    expect(h.view.webview.postMessage).not.toHaveBeenCalled();
    h.ready();
    expect(h.html).toContain('data-select="stage"');
    expect(h.view.webview.html).toBe(initialDocument);
    // VS Codeが非表示の文書を再生成した場合も、元の文書のトークンで再接続できる。
    h.ready();
    expect(h.html).toContain('data-select="stage"');
  });

  it("表示中のカタログのステージ ID とレッスン ID で Web を開く", async () => {
    const h = harness();
    const { send } = h;
    await vi.waitFor(() => expect(h.html).toContain('data-select="stage"'));
    send({ action: "open", id: "doc", command: "untrusted.command", markdown: "差し替え" });
    await vi.waitFor(() =>
      expect(mocks.execute.mock.calls).toEqual([["stella.openInWeb", "s", "doc"]]),
    );
    expect(h.html).toContain('aria-current="page"');
    expect(h.html).toContain('<li class="lesson current">');
    expect(h.html).toContain('<span class="sr-only">いま開いている教材</span>');
  });

  it("未知の ID、任意のコマンド、古い表示からのメッセージを実行しない", async () => {
    const h = harness();
    const { provider, send } = h;
    await vi.waitFor(() => expect(h.html).toContain('data-select="stage"'));
    send({ action: "open", id: "missing" });
    send({ action: "arbitrary.command" });
    send({ action: "home", token: "old-token" });
    const token = h.html.match(/data-message-token="([^"]+)"/)?.[1];
    provider.reset();
    send({ action: "open", id: "doc", token });
    await Promise.resolve();
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(h.html).not.toContain("正しい教材");
  });

  it("接続を切り替える前に始めた読み込みで新しい教材を上書きしない", async () => {
    let finish: (value: CatalogStage[]) => void = () => undefined;
    mocks.load.mockImplementationOnce(
      () =>
        new Promise<CatalogStage[]>((resolve) => {
          finish = resolve;
        }),
    );
    const h = harness();
    const { provider } = h;
    await vi.waitFor(() => expect(mocks.load).toHaveBeenCalledOnce());
    provider.reset();
    mocks.load.mockResolvedValue([{ id: "new", title: "新しい受講者のステージ", sections: [] }]);
    await provider.refresh();
    finish(catalog);
    await Promise.resolve();
    expect(h.html).toContain("新しい受講者のステージ");
    expect(h.html).not.toContain("この単元の教材");
  });

  it("未接続と、トークンを読み出せないときの案内を出す", async () => {
    const disconnected = harness(vi.fn().mockResolvedValue(null));
    await vi.waitFor(() => expect(disconnected.html).toContain("Web で接続する"));
    const failed = harness(vi.fn().mockRejectedValue(new Error("<取得失敗>")));
    await vi.waitFor(() => expect(failed.html).toContain("&lt;取得失敗&gt;"));
    expect(mocks.load).not.toHaveBeenCalled();
  });
});
