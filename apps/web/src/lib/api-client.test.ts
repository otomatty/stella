import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Clerk のトークンは呼ぶたびに変わる (取り直しを確かめる)。
const clerkTokens = vi.fn(async (options?: { skipCache?: boolean }) =>
  options?.skipCache ? "fresh.clerk.jwt" : "cached.clerk.jwt",
);
vi.mock("./clerk", () => ({
  clerkCurrentUser: async () => null,
  clerkSessionToken: (options?: { skipCache?: boolean }) => clerkTokens(options),
  clerkSignOut: async () => undefined,
  onClerkUserChange: async () => () => undefined,
}));

import {
  AccessSessionLostError,
  ApiClientError,
  apiFetch,
  authFetch,
  isAccessSessionLost,
} from "./api-client";

const values = new Map<string, string>();
const sessionValues = new Map<string, string>();
const reload = vi.fn();
const token = `header.${btoa(JSON.stringify({ sub: "seed-learner", exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;

function memoryStorage(map: Map<string, string>) {
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

beforeEach(() => {
  values.clear();
  sessionValues.clear();
  reload.mockReset();
  vi.stubEnv("VITE_SERVER_URL", "https://stella.example.com");
  vi.stubGlobal("window", {
    location: { reload, assign: vi.fn() },
    localStorage: memoryStorage(values),
    sessionStorage: memoryStorage(sessionValues),
  });
  vi.stubGlobal("localStorage", memoryStorage(values));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function lastInit(fetchMock: ReturnType<typeof vi.fn>): RequestInit & {
  headers: Record<string, string>;
} {
  const call = fetchMock.mock.calls.at(-1) as [
    string,
    RequestInit & { headers: Record<string, string> },
  ];
  return call[1];
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const html = (status: number) =>
  new Response("<!doctype html><title>Forbidden</title>", {
    status,
    headers: { "Content-Type": "text/html" },
  });

describe("authFetch in Clerk mode", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_AUTH_MODE", "clerk");
    clerkTokens.mockClear();
  });

  it("sends the Clerk session token to the same-origin API, never a stored dev token", async () => {
    values.set("stella_auth_token_v1", token);
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await authFetch("/api/me", { headers: { "X-Test": "1" } });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://stella.example.com/api/me");
    const init = lastInit(fetchMock);
    expect(init.headers).toEqual({ "X-Test": "1", Authorization: "Bearer cached.clerk.jwt" });
    expect(init.credentials).toBe("same-origin");
    expect(init.redirect).toBe("manual");
  });

  it("calls the staff host's own origin when opened from the staff host", async () => {
    vi.stubEnv("VITE_STAFF_ORIGIN", "https://stella-admin.example.com");
    vi.stubGlobal("window", {
      location: { reload, assign: vi.fn(), origin: "https://stella-admin.example.com" },
      localStorage: memoryStorage(values),
      sessionStorage: memoryStorage(sessionValues),
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await authFetch("/api/me");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://stella-admin.example.com/api/me");
  });

  it("retries once with a fresh token when the API rejects the token (JSON 401)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(401, { error: "ログインの有効期限が切れました" }))
      .mockResolvedValueOnce(json(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/api/me")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(lastInit(fetchMock).headers.Authorization).toBe("Bearer fresh.clerk.jwt");
    expect(reload).not.toHaveBeenCalled();
  });

  it("surfaces a second 401 as an error without reloading", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(401, { error: "ログインが必要です" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiFetch("/api/me")).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads once when Access stops the staff host (redirect or HTML), then stops", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(html(403)));

    await expect(apiFetch("/api/me")).rejects.toMatchObject({ status: 401, reloading: true });
    expect(reload).toHaveBeenCalledTimes(1);

    // 読み込み直した直後にまた止められたら、繰り返さずにエラーにする。
    const second = apiFetch("/api/me");
    await expect(second).rejects.toBeInstanceOf(AccessSessionLostError);
    await expect(second).rejects.toBeInstanceOf(ApiClientError);
    await expect(second).rejects.toMatchObject({ reloading: false });
    await expect(second).rejects.toThrow("講師・管理者用の入口");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("treats a redirect or non-JSON 401/403 as stopped by Access, not the API's JSON errors", () => {
    expect(isAccessSessionLost({ type: "opaqueredirect", status: 0 })).toBe(true);
    for (const status of [401, 403]) {
      expect(
        isAccessSessionLost({
          type: "basic",
          status,
          headers: new Headers({ "content-type": "application/json; charset=UTF-8" }),
        }),
      ).toBe(false);
      expect(
        isAccessSessionLost({
          type: "basic",
          status,
          headers: new Headers({ "content-type": "text/html" }),
        }),
      ).toBe(true);
    }
    expect(isAccessSessionLost({ type: "basic", status: 200 })).toBe(false);
  });

  it("leaves public calls alone (no token, no retry, no reload)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(html(401));
    vi.stubGlobal("fetch", fetchMock);
    const res = await authFetch("/api/public/units", {}, { anonymous: true });
    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(lastInit(fetchMock).headers).toEqual({});
    expect(reload).not.toHaveBeenCalled();
  });

  it("surfaces other errors without reloading", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "invite_required" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    await expect(apiFetch("/api/me")).rejects.toMatchObject({
      status: 403,
      message: "invite_required",
    });
    expect(reload).not.toHaveBeenCalled();
  });
});

describe("authFetch in dev-token mode", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_AUTH_MODE", "dev-token");
  });

  it("sends the development token as a Bearer header", async () => {
    values.set("stella_auth_token_v1", token);
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await authFetch("/api/me");

    const init = lastInit(fetchMock);
    expect(init.headers).toEqual({ Authorization: `Bearer ${token}` });
    expect(init.redirect).toBeUndefined();
  });

  it("does not reload on 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 401 })));
    const res = await authFetch("/api/me");
    expect(res.status).toBe(401);
    expect(reload).not.toHaveBeenCalled();
  });
});
