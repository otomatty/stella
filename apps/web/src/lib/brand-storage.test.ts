import { describe, expect, it } from "vitest";
import { readStellaStorage, removeStellaStorage } from "./brand-storage";

function storageWith(entries: Record<string, string>) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

describe("STELLA storage migration", () => {
  it("copies a saved token and leaves the legacy key for open tabs", () => {
    const storage = storageWith({ falcon_auth_token_v1: "saved-token" });
    expect(readStellaStorage(storage, "stella_auth_token_v1")).toBe("saved-token");
    expect(storage.getItem("stella_auth_token_v1")).toBe("saved-token");
    expect(storage.getItem("falcon_auth_token_v1")).toBe("saved-token");
  });

  it("keeps the new value when both names exist", () => {
    const storage = storageWith({ falcon_auth_token_v1: "old", stella_auth_token_v1: "new" });
    expect(readStellaStorage(storage, "stella_auth_token_v1")).toBe("new");
  });

  it("preserves user boundaries for prefixed keys", () => {
    const storage = storageWith({ "falcon_skill_tree_seen_v1:alice": "{}" });
    expect(readStellaStorage(storage, "stella_skill_tree_seen_v1:bob")).toBeNull();
    expect(readStellaStorage(storage, "stella_skill_tree_seen_v1:alice")).toBe("{}");
  });

  it("keeps the old value if the new write fails", () => {
    const storage = storageWith({ falcon_sidebar_open_v1: "0" });
    storage.setItem = () => {
      throw new Error("quota exceeded");
    };
    expect(readStellaStorage(storage, "stella_sidebar_open_v1")).toBe("0");
    expect(storage.getItem("falcon_sidebar_open_v1")).toBe("0");
  });

  it("keeps the current token when deleting it fails", () => {
    const storage = storageWith({ falcon_auth_token_v1: "old", stella_auth_token_v1: "new" });
    const remove = storage.removeItem;
    storage.removeItem = (key: string) => {
      if (key === "stella_auth_token_v1") throw new Error("busy");
      remove(key);
    };
    expect(() => removeStellaStorage(storage, "stella_auth_token_v1")).toThrow("busy");
    expect(storage.getItem("stella_auth_token_v1")).toBe("new");
  });

  it("does not resurrect an old token after logout", () => {
    const storage = storageWith({ falcon_auth_token_v1: "old", stella_auth_token_v1: "new" });
    removeStellaStorage(storage, "stella_auth_token_v1");
    expect(readStellaStorage(storage, "stella_auth_token_v1")).toBeNull();
  });
});
