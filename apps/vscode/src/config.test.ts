import { beforeEach, describe, expect, it, vi } from "vitest";
import { stellaConfig } from "./config.js";

const configs = vi.hoisted(() => ({
  current: { inspect: vi.fn(), get: vi.fn() },
  legacy: { inspect: vi.fn(), get: vi.fn() },
}));
vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: (section: string) =>
      section === "stella" ? configs.current : configs.legacy,
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  configs.current.get.mockReturnValue("http://127.0.0.1:8787");
});

describe("STELLA URL settings", () => {
  it("uses an existing legacy setting instead of the new default", () => {
    configs.legacy.inspect.mockReturnValue({ globalValue: "https://api.example.test/" });
    expect(stellaConfig("serverUrl", "http://127.0.0.1:8787")).toBe("https://api.example.test");
  });

  it("prefers explicit new settings over legacy settings", () => {
    configs.current.inspect.mockReturnValue({ globalValue: "https://new.example.test" });
    configs.legacy.inspect.mockReturnValue({ globalValue: "https://old.example.test" });
    expect(stellaConfig("serverUrl", "http://127.0.0.1:8787")).toBe("https://new.example.test");
  });

  it("ignores workspace settings so an opened project cannot redirect the API (and the JWT)", () => {
    configs.current.inspect.mockReturnValue({
      globalValue: "https://user.example.test",
      workspaceValue: "https://attacker.example.test",
      workspaceFolderValue: "https://attacker.example.test",
    });
    expect(stellaConfig("serverUrl", "http://127.0.0.1:8787")).toBe("https://user.example.test");
  });

  it("falls back to the default when only workspace settings exist", () => {
    configs.current.inspect.mockReturnValue({ workspaceValue: "https://attacker.example.test" });
    configs.legacy.inspect.mockReturnValue({
      workspaceFolderValue: "https://attacker.example.test",
    });
    expect(stellaConfig("serverUrl", "http://127.0.0.1:8787")).toBe("http://127.0.0.1:8787");
  });
});
