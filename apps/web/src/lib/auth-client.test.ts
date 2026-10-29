import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const values = new Map<string, string>();
const tokenFor = (id: string, exp = Math.floor(Date.now() / 1000) + 3600): string =>
  `header.${btoa(JSON.stringify({ sub: id, exp }))}.signature`;

/** The client as built for `serverUrl` (the module reads VITE_SERVER_URL once). */
async function client(serverUrl: string) {
  vi.stubEnv("VITE_SERVER_URL", serverUrl);
  vi.resetModules();
  return import("./auth-client");
}

let fetchMock: ReturnType<typeof vi.fn>;
/** Messages this tab sent to the other tabs. */
let broadcast: unknown[];
beforeEach(() => {
  broadcast = [];
  vi.stubGlobal(
    "BroadcastChannel",
    class {
      onmessage: (() => void) | null = null;
      postMessage(message: unknown) {
        broadcast.push(message);
      }
    },
  );
  values.clear();
  vi.stubGlobal("window", {
    location: { origin: "https://web.example.test", assign: vi.fn() },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("production (same-origin cookie session)", () => {
  const server = "https://web.example.test";

  it("reads the session from the server and never sends a stored token", async () => {
    // A token left by the old login (Google OAuth + JWT) is dropped, not sent.
    values.set("stella_auth_token_v1", tokenFor("old-login"));
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ user: { id: "learner", email: "l@example.test" } })),
    );
    const auth = await client(server);
    expect(auth.getAccessToken()).toBeNull();
    expect(values.has("stella_auth_token_v1")).toBe(false);
    expect((await auth.loadSession())?.user).toEqual({ id: "learner", email: "l@example.test" });
    expect(fetchMock).toHaveBeenCalledWith(`${server}/api/auth/get-session`, {
      credentials: "include",
    });
    expect(auth.getSession()?.user.id).toBe("learner");
  });

  it("is signed out when the server has no session", async () => {
    fetchMock.mockResolvedValue(new Response("null"));
    const auth = await client(server);
    expect(await auth.loadSession()).toBeNull();
  });

  it("starts Google login through the API and returns to /auth/callback", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ url: "https://accounts.google.com/o/oauth2/x" })),
    );
    const auth = await client(server);
    await auth.signInWithGoogle();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${server}/api/auth/sign-in/social`);
    expect(JSON.parse(String(init.body))).toEqual({
      provider: "google",
      callbackURL: "https://web.example.test/auth/callback",
      errorCallbackURL: "https://web.example.test/auth/callback",
    });
    expect(window.location.assign).toHaveBeenCalledWith("https://accounts.google.com/o/oauth2/x");
  });

  it("signs out on the server, then tells subscribers and the other tabs", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: "learner" } })));
    const auth = await client(server);
    await auth.loadSession();
    fetchMock.mockResolvedValueOnce(new Response("{}"));
    const seen: unknown[] = [];
    auth.subscribeToAuth((s) => seen.push(s));
    await auth.signOut();
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`${server}/api/auth/sign-out`);
    expect(seen).toEqual([null]);
    expect(broadcast).toEqual(["changed"]);
  });

  it("keeps the session when the server did not end it (the cookie still works)", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: "learner" } })));
    const auth = await client(server);
    await auth.loadSession();
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 500 }));
    await expect(auth.signOut()).rejects.toThrow("ログアウトできませんでした");
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await expect(auth.signOut()).rejects.toThrow("ログアウトできませんでした");
    expect(auth.getSession()?.user.id).toBe("learner");
    expect(broadcast).toEqual([]);
  });

  it("reports the error Better Auth put on the callback URL", async () => {
    const auth = await client(server);
    expect(await auth.completeLogin("?error=account_not_linked")).toEqual({
      ok: false,
      error: "ログインできませんでした (account_not_linked)",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("local development (dev token)", () => {
  it("uses a valid dev token against a local API without calling the server", async () => {
    values.set("stella_auth_token_v1", tokenFor("seed-admin"));
    const auth = await client("http://127.0.0.1:8787");
    expect((await auth.loadSession())?.user.id).toBe("seed-admin");
    expect(auth.getAccessToken()).toBe(values.get("stella_auth_token_v1"));
    // Signing out of a dev token needs no server call (Better Auth is off locally).
    await auth.signOut();
    expect(auth.getAccessToken()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("drops an expired dev token", async () => {
    values.set("stella_auth_token_v1", tokenFor("seed-admin", 1));
    fetchMock.mockResolvedValue(new Response("null"));
    const auth = await client("http://127.0.0.1:8787");
    expect(auth.getAccessToken()).toBeNull();
    expect(values.has("stella_auth_token_v1")).toBe(false);
  });
});
