import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("authFetch in Cloudflare Access mode", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_AUTH_MODE", "access");
  });

  it("calls the same-origin API with cookies and without an Authorization header", async () => {
    values.set("stella_auth_token_v1", token);
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await authFetch("/api/me", { headers: { "X-Test": "1" } });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://stella.example.com/api/me");
    const init = lastInit(fetchMock);
    expect(init.headers).toEqual({ "X-Test": "1" });
    expect(init.credentials).toBe("same-origin");
    expect(init.redirect).toBe("manual");
  });

  it("reloads once when the Access session has expired (401)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 401 })));

    await expect(apiFetch("/api/me")).rejects.toMatchObject({ status: 401, reloading: true });
    expect(reload).toHaveBeenCalledTimes(1);

    // 読み込み直した直後にまた 401 なら、繰り返さずにエラーにする。
    const second = apiFetch("/api/me");
    await expect(second).rejects.toBeInstanceOf(AccessSessionLostError);
    await expect(second).rejects.toBeInstanceOf(ApiClientError);
    await expect(second).rejects.toMatchObject({ reloading: false });
    await expect(second).rejects.toThrow("Cloudflare Access のログインを確認できませんでした");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("treats a redirect to the Access login as an expired session", () => {
    expect(isAccessSessionLost({ type: "opaqueredirect", status: 0 })).toBe(true);
    expect(isAccessSessionLost({ type: "basic", status: 401 })).toBe(true);
    // API の 403 (JSON) は権限の不足。Access の方針から外れたときの 403 (HTML) はセッション切れとして扱う。
    expect(
      isAccessSessionLost({
        type: "basic",
        status: 403,
        headers: new Headers({ "content-type": "application/json; charset=UTF-8" }),
      }),
    ).toBe(false);
    expect(
      isAccessSessionLost({
        type: "basic",
        status: 403,
        headers: new Headers({ "content-type": "text/html" }),
      }),
    ).toBe(true);
    expect(isAccessSessionLost({ type: "basic", status: 200 })).toBe(false);
  });

  it("leaves public calls alone (no reload on 401)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 401 })));
    const res = await authFetch("/api/public/units", {}, { anonymous: true });
    expect(res.status).toBe(401);
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
