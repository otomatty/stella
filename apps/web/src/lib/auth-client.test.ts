import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCESS_LOGOUT_PATH,
  ACCESS_RELOAD_GUARD_MS,
  authHeaders,
  getAccessToken,
  getSession,
  reloadForAccessLogin,
  resolveAuthMode,
  signInWithDevToken,
  signOut,
  subscribeToAuth,
} from "./auth-client";

const storageHandlers: Array<(event: StorageEvent) => void> = [];

const values = new Map<string, string>();
const sessionValues = new Map<string, string>();
const assign = vi.fn();
const reload = vi.fn();
const tokenFor = (id: string, exp = Math.floor(Date.now() / 1000) + 3600): string =>
  `header.${btoa(JSON.stringify({ sub: id, exp }))}.signature`;

beforeEach(() => {
  values.clear();
  sessionValues.clear();
  assign.mockReset();
  reload.mockReset();
  storageHandlers.length = 0;
  vi.stubEnv("VITE_AUTH_MODE", "dev-token");
  vi.stubEnv("VITE_SERVER_URL", "http://127.0.0.1:8787");
  vi.stubGlobal("window", {
    location: { assign, reload },
    sessionStorage: {
      getItem: (key: string) => sessionValues.get(key) ?? null,
      setItem: (key: string, value: string) => {
        sessionValues.set(key, value);
      },
      removeItem: (key: string) => {
        sessionValues.delete(key);
      },
    },
    addEventListener: (_type: string, handler: (event: StorageEvent) => void) => {
      storageHandlers.push(handler);
    },
    removeEventListener: () => undefined,
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("auth across the STELLA rename", () => {
  it("keeps a signed-in session saved under the old key", () => {
    const token = tokenFor("learner");
    values.set("falcon_auth_token_v1", token);
    expect(getSession()?.user.id).toBe("learner");
    expect(values.get("stella_auth_token_v1")).toBe(token);
    expect(values.get("falcon_auth_token_v1")).toBe(token);
  });

  it("keeps the session when logout cannot delete the token", async () => {
    values.set("stella_auth_token_v1", tokenFor("learner"));
    const storage = window.localStorage as { removeItem: (key: string) => void };
    storage.removeItem = () => {
      throw new Error("busy");
    };
    await expect(signOut()).rejects.toThrow("busy");
    expect(getSession()?.user.id).toBe("learner");
  });

  it("logs out when an old tab removes the same legacy token", () => {
    const token = tokenFor("learner");
    values.set("stella_auth_token_v1", token);
    values.set("falcon_auth_token_v1", token);
    const stop = subscribeToAuth(() => undefined);
    values.delete("falcon_auth_token_v1");
    storageHandlers[0]?.({
      key: "falcon_auth_token_v1",
      oldValue: token,
      newValue: null,
    } as StorageEvent);
    expect(getAccessToken()).toBeNull();
    stop();
  });

  it("keeps a newer login when a different legacy token is removed", () => {
    const current = tokenFor("learner");
    values.set("stella_auth_token_v1", current);
    const stop = subscribeToAuth(() => undefined);
    storageHandlers[0]?.({
      key: "falcon_auth_token_v1",
      oldValue: tokenFor("old-learner"),
      newValue: null,
    } as StorageEvent);
    expect(getAccessToken()).toBe(current);
    stop();
  });

  it("follows a legacy token change for the same session", () => {
    const current = tokenFor("learner");
    const next = tokenFor("next-learner");
    values.set("stella_auth_token_v1", current);
    const stop = subscribeToAuth(() => undefined);
    storageHandlers[0]?.({
      key: "falcon_auth_token_v1",
      oldValue: current,
      newValue: next,
    } as StorageEvent);
    expect(getAccessToken()).toBe(next);
    expect(values.get("falcon_auth_token_v1")).toBeUndefined();
    stop();
  });

  it("clears both keys on logout so an old session cannot return", async () => {
    values.set("falcon_auth_token_v1", tokenFor("old-learner"));
    values.set("stella_auth_token_v1", tokenFor("learner"));
    await signOut();
    expect(getAccessToken()).toBeNull();
    expect(values.size).toBe(0);
  });

  it("keeps the new session when the old key cannot be deleted", () => {
    const token = tokenFor("new-learner");
    values.set("falcon_auth_token_v1", tokenFor("old-learner"));
    const storage = window.localStorage as { removeItem: (key: string) => void };
    storage.removeItem = (key: string) => {
      if (key === "falcon_auth_token_v1") throw new Error("busy");
      values.delete(key);
    };
    expect(signInWithDevToken(token)).toEqual({ ok: true });
    expect(values.get("stella_auth_token_v1")).toBe(token);
    expect(getSession()?.user.id).toBe("new-learner");
  });

  it("reports a failed login when the new key cannot be saved", () => {
    const storage = window.localStorage as { setItem: (key: string, value: string) => void };
    storage.setItem = () => {
      throw new Error("quota");
    };
    expect(signInWithDevToken(tokenFor("new-learner"))).toEqual({
      ok: false,
      error: "トークンを保存できませんでした",
    });
    expect(getAccessToken()).toBeNull();
  });

  it("stores pasted dev tokens under the new key and discards an old session", () => {
    const token = tokenFor("new-learner");
    values.set("falcon_auth_token_v1", tokenFor("old-learner"));
    expect(signInWithDevToken(`  Bearer ${token}\n`)).toEqual({ ok: true });
    expect(getSession()?.user.id).toBe("new-learner");
    expect(values.has("falcon_auth_token_v1")).toBe(false);
  });

  it("removes an expired legacy session instead of restoring it", () => {
    values.set("falcon_auth_token_v1", tokenFor("learner", 1));
    expect(getAccessToken()).toBeNull();
    expect(values.size).toBe(0);
  });
});

describe("dev-token login", () => {
  it("rejects text that is not a JWT", () => {
    expect(signInWithDevToken("hello")).toEqual({
      ok: false,
      error: "トークンを読めませんでした (JWT の形ではありません)",
    });
    expect(signInWithDevToken("   ")).toEqual({ ok: false, error: "トークンを貼り付けてください" });
    expect(values.size).toBe(0);
  });

  it("rejects an expired token", () => {
    expect(signInWithDevToken(tokenFor("learner", 1))).toMatchObject({ ok: false });
    expect(values.size).toBe(0);
  });

  it("sends the stored token as a Bearer header", () => {
    const token = tokenFor("learner");
    values.set("stella_auth_token_v1", token);
    expect(authHeaders()).toEqual({ Authorization: `Bearer ${token}` });
  });
});

describe("auth mode", () => {
  it("defaults to dev-token in the dev server and access in builds", () => {
    expect(resolveAuthMode(undefined, true)).toBe("dev-token");
    expect(resolveAuthMode(undefined, false)).toBe("access");
    expect(resolveAuthMode("", false)).toBe("access");
    expect(resolveAuthMode("access", true)).toBe("access");
    expect(resolveAuthMode("dev-token", false)).toBe("dev-token");
    expect(resolveAuthMode("google", false)).toBe("access");
  });
});

describe("Cloudflare Access mode", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_AUTH_MODE", "access");
  });

  it("returns a placeholder session without any stored token", () => {
    const session = getSession();
    expect(session).not.toBeNull();
    expect(session?.accessToken).toBeNull();
  });

  it("has no session when the backend is not configured (demo)", () => {
    vi.stubEnv("VITE_SERVER_URL", "");
    expect(getSession()).toBeNull();
  });

  it("removes tokens left over from the old login and never sends them", () => {
    values.set("stella_auth_token_v1", tokenFor("learner"));
    values.set("falcon_auth_token_v1", tokenFor("old-learner"));
    expect(getAccessToken()).toBeNull();
    expect(authHeaders()).toEqual({});
    getSession();
    expect(values.size).toBe(0);
  });

  it("does not accept pasted tokens", () => {
    expect(signInWithDevToken(tokenFor("learner"))).toMatchObject({ ok: false });
    expect(values.size).toBe(0);
  });

  it("logs out through Cloudflare Access", async () => {
    values.set("stella_auth_token_v1", tokenFor("learner"));
    await signOut();
    expect(assign).toHaveBeenCalledWith(ACCESS_LOGOUT_PATH);
    expect(values.size).toBe(0);
  });

  it("reloads once for a new Access login, then stops within the guard window", () => {
    const now = 1_000_000;
    expect(reloadForAccessLogin(now)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(reloadForAccessLogin(now + ACCESS_RELOAD_GUARD_MS - 1)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(reloadForAccessLogin(now + ACCESS_RELOAD_GUARD_MS)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("does not reload when it cannot remember the reload (no loop guard)", () => {
    const storage = window.sessionStorage as { setItem: (key: string, value: string) => void };
    storage.setItem = () => {
      throw new Error("blocked");
    };
    expect(reloadForAccessLogin()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
