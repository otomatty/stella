import { beforeEach, describe, expect, it, vi } from "vitest";

const clerkApi = {
  users: { getUserList: vi.fn() },
  sessions: { getSessionList: vi.fn(), revokeSession: vi.fn() },
  apiKeys: { list: vi.fn(), revoke: vi.fn(), verify: vi.fn() },
};
const verifyTokenMock = vi.fn();
vi.mock("@clerk/backend", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@clerk/backend")>()),
  createClerkClient: () => clerkApi,
  verifyToken: (...args: unknown[]) => verifyTokenMock(...args),
}));

const {
  ClerkTokenError,
  ClerkUnavailableError,
  clerkConfig,
  isClerkApiKey,
  resetClerkApiKeyCache,
  revokeClerkUser,
  verifyClerkSession,
  verifyVscodeApiKey,
  VSCODE_API_KEY_SCOPE,
} = await import("./clerk-auth.js");

const config = { secretKey: "sk_test_x", jwtKey: null, authorizedParties: ["https://a.example"] };

beforeEach(() => {
  resetClerkApiKeyCache();
  for (const group of Object.values(clerkApi))
    for (const fn of Object.values(group)) fn.mockReset();
});

describe("clerkConfig", () => {
  it("シークレットキーが無ければ null。発行元は ALLOWED_ORIGINS と STAFF_ORIGIN から作る", () => {
    expect(clerkConfig({ ALLOWED_ORIGINS: "https://a.example" })).toBeNull();
    expect(
      clerkConfig({
        CLERK_SECRET_KEY: "sk_test_x",
        ALLOWED_ORIGINS: "https://a.example, https://*.example.com",
        STAFF_ORIGIN: "https://admin.example/",
      })?.authorizedParties,
    ).toEqual(["https://a.example", "https://admin.example"]);
    expect(
      clerkConfig({
        CLERK_SECRET_KEY: "sk_test_x",
        CLERK_AUTHORIZED_PARTIES: "https://only.example",
        ALLOWED_ORIGINS: "https://a.example",
      })?.authorizedParties,
    ).toEqual(["https://only.example"]);
  });

  it("API キーは接頭辞で見分ける", () => {
    expect(isClerkApiKey("ak_123")).toBe(true);
    expect(isClerkApiKey("eyJhbGciOi.x.y")).toBe(false);
  });
});

describe("verifyClerkSession", () => {
  it.each([
    [
      "例外で",
      () => Promise.reject(Object.assign(new Error("x"), { reason: "jwk-remote-failed-to-load" })),
    ],
    [
      "結果の errors で",
      () => Promise.resolve({ errors: [{ reason: "jwk-remote-failed-to-load" }] }),
    ],
  ])("Clerk の公開鍵を取れなかったと%s返されたら、障害として扱う", async (_label, impl) => {
    verifyTokenMock.mockImplementation(impl);
    await expect(verifyClerkSession(config, "token")).rejects.toBeInstanceOf(ClerkUnavailableError);
  });

  it("期限切れなどの拒否はトークンの誤りとして扱う", async () => {
    verifyTokenMock.mockResolvedValue({ errors: [{ reason: "token-expired" }] });
    await expect(verifyClerkSession(config, "token")).rejects.toBeInstanceOf(ClerkTokenError);
  });
});

describe("verifyVscodeApiKey", () => {
  it("確かめた API キーは 1 分のあいだ Clerk に問い合わせ直さない", async () => {
    clerkApi.apiKeys.verify.mockResolvedValue({
      id: "ak_id",
      subject: "user_1",
      scopes: [VSCODE_API_KEY_SCOPE],
      claims: { email: "A@example.test" },
      revoked: false,
      expired: false,
    });
    const now = Date.now();
    expect(await verifyVscodeApiKey(config, "ak_secret", now)).toEqual({
      email: "a@example.test",
      userId: "user_1",
      apiKeyId: "ak_id",
    });
    await verifyVscodeApiKey(config, "ak_secret", now + 30_000);
    expect(clerkApi.apiKeys.verify).toHaveBeenCalledTimes(1);
    await verifyVscodeApiKey(config, "ak_secret", now + 61_000);
    expect(clerkApi.apiKeys.verify).toHaveBeenCalledTimes(2);
  });

  it("Clerk が拒否したキー (4xx) は通さない", async () => {
    clerkApi.apiKeys.verify.mockRejectedValue(
      Object.assign(new Error("not found"), { status: 404 }),
    );
    await expect(verifyVscodeApiKey(config, "ak_bad")).rejects.toBeInstanceOf(ClerkTokenError);
  });

  it.each([
    ["Clerk の障害 (5xx)", Object.assign(new Error("down"), { status: 503 })],
    ["回数制限 (429)", Object.assign(new Error("slow down"), { status: 429 })],
    ["ネットワークの失敗", new TypeError("fetch failed")],
  ])("%s はキーが無効とは答えない", async (_label, err) => {
    clerkApi.apiKeys.verify.mockRejectedValue(err);
    await expect(verifyVscodeApiKey(config, "ak_any")).rejects.toBeInstanceOf(
      ClerkUnavailableError,
    );
  });
});

describe("revokeClerkUser", () => {
  it("セッションとアプリが発行した VS Code のキーだけを取り消す", async () => {
    clerkApi.users.getUserList.mockResolvedValue({ data: [{ id: "user_1" }] });
    clerkApi.sessions.getSessionList.mockResolvedValue({
      data: [{ id: "sess_1" }, { id: "sess_2" }],
    });
    clerkApi.apiKeys.list.mockResolvedValue({
      data: [
        { id: "ak_app", revoked: false, scopes: [VSCODE_API_KEY_SCOPE] },
        { id: "ak_done", revoked: true, scopes: [VSCODE_API_KEY_SCOPE] },
        { id: "ak_user_made", revoked: false, scopes: [] },
      ],
    });
    expect(await revokeClerkUser(config, "Learner@example.test")).toBe(true);
    expect(clerkApi.users.getUserList).toHaveBeenCalledWith(
      expect.objectContaining({ emailAddress: ["learner@example.test"] }),
    );
    expect(clerkApi.sessions.revokeSession.mock.calls).toEqual([["sess_1"], ["sess_2"]]);
    expect(clerkApi.apiKeys.revoke.mock.calls).toEqual([
      [{ apiKeyId: "ak_app", revocationReason: "stella-revoke" }],
    ]);
  });

  it("100 件を超えるキーも最後のページまで読んで取り消す", async () => {
    clerkApi.users.getUserList.mockResolvedValue({ data: [{ id: "user_1" }] });
    clerkApi.sessions.getSessionList.mockResolvedValue({ data: [] });
    const key = (i: number) => ({ id: `ak_${i}`, revoked: false, scopes: [VSCODE_API_KEY_SCOPE] });
    clerkApi.apiKeys.list.mockImplementation(async ({ offset }: { offset: number }) => ({
      data: Array.from({ length: Math.max(0, Math.min(100, 150 - offset)) }, (_, i) =>
        key(offset + i),
      ),
    }));
    expect(await revokeClerkUser(config, "learner@example.test")).toBe(true);
    expect(clerkApi.apiKeys.list.mock.calls.map(([p]) => p.offset)).toEqual([0, 100]);
    expect(clerkApi.apiKeys.revoke).toHaveBeenCalledTimes(150);
    expect(clerkApi.apiKeys.revoke).toHaveBeenLastCalledWith({
      apiKeyId: "ak_149",
      revocationReason: "stella-revoke",
    });
  });

  it("Clerk に居ない利用者なら false", async () => {
    clerkApi.users.getUserList.mockResolvedValue({ data: [] });
    expect(await revokeClerkUser(config, "none@example.test")).toBe(false);
    expect(clerkApi.sessions.getSessionList).not.toHaveBeenCalled();
  });
});
