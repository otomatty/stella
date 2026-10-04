import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { completeAuthFromCallbackHash, getAccessToken, getSession, signOut } from "./auth-client";

const values = new Map<string, string>();
const tokenFor = (id: string, exp = Math.floor(Date.now() / 1000) + 3600): string =>
  `header.${btoa(JSON.stringify({ sub: id, exp }))}.signature`;

beforeEach(() => {
  values.clear();
  vi.stubGlobal("window", {
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
    expect(values.has("falcon_auth_token_v1")).toBe(false);
  });

  it("clears both keys on logout so an old session cannot return", async () => {
    values.set("falcon_auth_token_v1", tokenFor("old-learner"));
    values.set("stella_auth_token_v1", tokenFor("learner"));
    await signOut();
    expect(getAccessToken()).toBeNull();
    expect(values.size).toBe(0);
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
