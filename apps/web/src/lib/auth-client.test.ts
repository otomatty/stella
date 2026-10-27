import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  completeAuthFromCallbackHash,
  getAccessToken,
  getSession,
  signOut,
  subscribeToAuth,
} from "./auth-client";

const storageHandlers: Array<(event: StorageEvent) => void> = [];

const values = new Map<string, string>();
const tokenFor = (id: string, exp = Math.floor(Date.now() / 1000) + 3600): string =>
  `header.${btoa(JSON.stringify({ sub: id, exp }))}.signature`;

beforeEach(() => {
  values.clear();
  storageHandlers.length = 0;
  vi.stubGlobal("window", {
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
afterEach(() => vi.unstubAllGlobals());

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
    expect(completeAuthFromCallbackHash(`#access_token=${encodeURIComponent(token)}`)).toEqual({
      ok: true,
    });
    expect(values.get("stella_auth_token_v1")).toBe(token);
    expect(getSession()?.user.id).toBe("new-learner");
  });

  it("reports a failed login when the new key cannot be saved", () => {
    const storage = window.localStorage as { setItem: (key: string, value: string) => void };
    storage.setItem = () => {
      throw new Error("quota");
    };
    expect(
      completeAuthFromCallbackHash(`#access_token=${encodeURIComponent(tokenFor("new-learner"))}`),
    ).toEqual({ ok: false, error: "トークンを保存できませんでした" });
    expect(getAccessToken()).toBeNull();
  });

  it("stores callback tokens under the new key and discards an old session", () => {
    const token = tokenFor("new-learner");
    values.set("falcon_auth_token_v1", tokenFor("old-learner"));
    expect(completeAuthFromCallbackHash(`#access_token=${encodeURIComponent(token)}`)).toEqual({
      ok: true,
    });
    expect(getSession()?.user.id).toBe("new-learner");
    expect(values.has("falcon_auth_token_v1")).toBe(false);
  });

  it("removes an expired legacy session instead of restoring it", () => {
    values.set("falcon_auth_token_v1", tokenFor("learner", 1));
    expect(getAccessToken()).toBeNull();
    expect(values.size).toBe(0);
  });
});
