import { describe, expect, it, vi } from "vitest";
import { AuthStore } from "./auth.js";

vi.mock("vscode", () => ({
  EventEmitter: class {
    event = vi.fn();
    fire = vi.fn();
    dispose = vi.fn();
  },
}));

function secretsWith(entries: Record<string, string>) {
  const values = new Map(Object.entries(entries));
  return {
    onDidChange: vi.fn(),
    get: async (key: string) => values.get(key),
    store: async (key: string, value: string) => {
      values.set(key, value);
    },
    delete: async (key: string) => {
      values.delete(key);
    },
  };
}

describe("STELLA secret keys", () => {
  it("migrates a legacy token within the same extension scope", async () => {
    const secrets = secretsWith({ "falcon.accessToken": "saved" });
    expect(await new AuthStore(secrets).getToken()).toBe("saved");
    expect(await secrets.get("stella.accessToken")).toBe("saved");
    expect(await secrets.get("falcon.accessToken")).toBeUndefined();
  });

  it("prefers the new token and clears both names on disconnect", async () => {
    const secrets = secretsWith({ "falcon.accessToken": "old", "stella.accessToken": "new" });
    const auth = new AuthStore(secrets);
    expect(await auth.getToken()).toBe("new");
    await auth.clear();
    expect(await auth.getToken()).toBeNull();
  });

  it("returns the legacy token when the new key cannot be stored", async () => {
    const secrets = secretsWith({ "falcon.accessToken": "saved" });
    secrets.store = async () => {
      throw new Error("busy");
    };
    expect(await new AuthStore(secrets).getToken()).toBe("saved");
    expect(await secrets.get("falcon.accessToken")).toBe("saved");
  });

  it("stores reconnect tokens under the new name only", async () => {
    const secrets = secretsWith({ "falcon.accessToken": "old" });
    await new AuthStore(secrets).setToken("reconnected");
    expect(await secrets.get("stella.accessToken")).toBe("reconnected");
    expect(await secrets.get("falcon.accessToken")).toBeUndefined();
  });
});
