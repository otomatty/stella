/**
 * API クライアントの認証ヘッダーと、Cloudflare Access に止められた応答の扱い。
 * 本番は Access が `cf-access-token` を検証し、ローカルの API は `Authorization` を読む。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  workspace: { getConfiguration: () => ({ inspect: () => undefined }) },
}));

const { apiRequest, AuthExpiredError, initApi, isAccessRejection, RECONNECT_MESSAGE } =
  await import("./api.js");

function fakeAuth(token: string | null = "TOKEN-1") {
  let session = 0;
  const auth = {
    getToken: vi.fn(async () => token),
    getTokenInSession: vi.fn(async () => token),
    currentSession: () => session,
    clear: vi.fn(async () => undefined),
    advance() {
      session += 1;
    },
  };
  initApi(auth as never);
  return auth;
}

const fetchMock = vi.fn<typeof fetch>();
const html = (status: number) =>
  new Response("<!doctype html><title>Access</title>", {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });

describe("apiRequest", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("トークンを Authorization と cf-access-token の両方に載せ、リダイレクトを追わない", async () => {
    fakeAuth("TOKEN-1");
    fetchMock.mockResolvedValue(Response.json({ ok: true }));
    await expect(apiRequest("/api/me")).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("http://127.0.0.1:8787/api/me");
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer TOKEN-1");
    expect(headers.get("cf-access-token")).toBe("TOKEN-1");
    expect(init?.redirect).toBe("manual");
  });

  it("未接続なら認証ヘッダーを付けない", async () => {
    fakeAuth(null);
    fetchMock.mockResolvedValue(Response.json({}));
    await apiRequest("/api/x");
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.has("Authorization")).toBe(false);
    expect(headers.has("cf-access-token")).toBe(false);
  });

  it("Access のログイン画面へのリダイレクト (3xx) は接続切れとして扱い、トークンを消す", async () => {
    const auth = fakeAuth();
    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "https://team.cloudflareaccess.com/" },
      }),
    );
    const err = await apiRequest("/api/me").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AuthExpiredError);
    expect((err as Error).message).toBe(RECONNECT_MESSAGE);
    expect((err as Error).message).toContain("VS Code で開く");
    expect(auth.clear).toHaveBeenCalledOnce();
  });

  it("opaqueredirect (status 0) も接続切れとして扱う", async () => {
    const auth = fakeAuth();
    fetchMock.mockResolvedValue({ type: "opaqueredirect", status: 0, ok: false } as Response);
    await expect(apiRequest("/api/me")).rejects.toBeInstanceOf(AuthExpiredError);
    expect(auth.clear).toHaveBeenCalledOnce();
  });

  it("Access の HTML のブロック画面 (401/403) は本文を読み損ねずに接続切れとして扱う", async () => {
    for (const status of [401, 403]) {
      const auth = fakeAuth();
      fetchMock.mockResolvedValue(html(status));
      await expect(apiRequest("/api/me")).rejects.toThrow(RECONNECT_MESSAGE);
      expect(auth.clear).toHaveBeenCalledOnce();
    }
  });

  it("API の JSON の 403 は権限のエラーのまま (接続は消さない)", async () => {
    const auth = fakeAuth();
    fetchMock.mockResolvedValue(Response.json({ error: "権限がありません" }, { status: 403 }));
    const err = await apiRequest("/api/admin").catch((e: unknown) => e);
    expect(err).not.toBeInstanceOf(AuthExpiredError);
    expect((err as Error).message).toBe("権限がありません");
    expect(auth.clear).not.toHaveBeenCalled();
  });

  it("API の JSON の 401 は API の文言で接続切れにする", async () => {
    const auth = fakeAuth();
    fetchMock.mockResolvedValue(Response.json({ error: "認証が必要です" }, { status: 401 }));
    await expect(apiRequest("/api/me")).rejects.toThrow("認証が必要です");
    expect(auth.clear).toHaveBeenCalledOnce();
  });

  it("前の世代のトークンが断られただけなら、切り替えたあとの接続を消さない", async () => {
    const auth = fakeAuth();
    fetchMock.mockImplementation(async () => {
      auth.advance();
      return html(403);
    });
    await expect(apiRequest("/api/me", { session: 0 })).rejects.toBeInstanceOf(AuthExpiredError);
    expect(auth.clear).not.toHaveBeenCalled();
  });

  it("成功の応答が HTML (Web の画面) なら宛先の設定を案内する", async () => {
    fakeAuth();
    fetchMock.mockResolvedValue(html(200));
    await expect(apiRequest("/api/me")).rejects.toThrow(/stella\.serverUrl/);
  });

  it("本文の無い成功の応答は null を返す", async () => {
    fakeAuth();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiRequest("/api/x", { method: "DELETE" })).resolves.toBeNull();
  });

  it("HTML の 500 でも本文の読み取りで落ちず、状態コードの文言で失敗する", async () => {
    fakeAuth();
    fetchMock.mockResolvedValue(html(500));
    await expect(apiRequest("/api/x")).rejects.toThrow("API 500");
  });
});

describe("isAccessRejection", () => {
  it("JSON の 401/403 と 2xx は Access の拒否ではない", () => {
    expect(isAccessRejection(Response.json({}, { status: 401 }))).toBe(false);
    expect(isAccessRejection(Response.json({}, { status: 403 }))).toBe(false);
    expect(isAccessRejection(Response.json({}))).toBe(false);
  });
});
