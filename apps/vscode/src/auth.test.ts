import { describe, expect, it, vi } from "vitest";
import { AuthSessionChanged, AuthStore, authSession } from "./auth.js";

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

describe("接続の世代 (#36)", () => {
  it("接続・切断は、トークンを書き換える前に同期的に世代を進める", async () => {
    const secrets = secretsWith({ "stella.accessToken": "old" });
    const auth = new AuthStore(secrets);
    const before = authSession();
    const writing = auth.setToken("new");
    expect(authSession()).toBe(before + 1);
    await writing;
    const clearing = auth.clear();
    expect(authSession()).toBe(before + 2);
    await clearing;
  });

  it("世代つきのトークンは、読んでいる間に世代が変わったら渡さない", async () => {
    const secrets = secretsWith({ "stella.accessToken": "old" });
    const auth = new AuthStore(secrets);
    const session = authSession();
    expect(await auth.getTokenInSession(session)).toBe("old");
    const reading = auth.getTokenInSession(session);
    void auth.setToken("new");
    await expect(reading).rejects.toBeInstanceOf(AuthSessionChanged);
    await expect(auth.getTokenInSession(session)).rejects.toBeInstanceOf(AuthSessionChanged);
    expect(await auth.getTokenInSession(authSession())).toBe("new");
  });

  it("別のウィンドウでの切り替えも世代を進め、同じ値の書き込みでは進めない", async () => {
    const secrets = secretsWith({ "stella.accessToken": "mine" });
    let listener: (event: { key: string }) => void = () => undefined;
    secrets.onDidChange = vi.fn((l: (event: { key: string }) => void) => {
      listener = l;
      return { dispose: vi.fn() };
    });
    const auth = new AuthStore(secrets);
    auth.watchExternalChanges();
    const session = authSession();
    expect(await auth.getTokenInSession(session)).toBe("mine");
    listener({ key: "stella.accessToken" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(authSession()).toBe(session);
    await secrets.store("stella.accessToken", "someone-else");
    listener({ key: "stella.accessToken" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(authSession()).toBe(session + 1);
    // 通知より先に読んだ取得も、知らないトークンなら前の世代では渡さない。
    await secrets.store("stella.accessToken", "third");
    await expect(auth.getTokenInSession(authSession())).rejects.toBeInstanceOf(AuthSessionChanged);
  });
});
