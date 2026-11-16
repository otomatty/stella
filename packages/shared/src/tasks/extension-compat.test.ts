import { describe, expect, it } from "vitest";
import {
  EXTENSION_VERSION_PARAM,
  extensionSatisfies,
  extensionUpgradeMessage,
  requiredExtensionVersion,
} from "./extension-compat.js";
import type { TaskManifest } from "./manifest.js";
import { RUNNER_IDS } from "./runners.js";

function manifest(overrides: Partial<TaskManifest> = {}): TaskManifest {
  return {
    schemaVersion: 1,
    id: "typescript-basics/u01-types/q01",
    title: "型を付ける",
    kind: "basic",
    runner: "ts-test",
    submit: { files: ["src/main.ts"] },
    protected: [],
    checks: { lint: false, format: false },
    ...overrides,
  };
}

describe("requiredExtensionVersion", () => {
  it.each(["ts-test", "dotnet-test"] as const)("%s は 0.6.0 以上が要る", (runner) => {
    expect(requiredExtensionVersion(manifest({ runner }))).toBe("0.6.0");
  });

  it.each(["ts-test", "dotnet-test"] as const)(
    "%s の問題つき課題は runner より高い 0.8.0 以上が要る",
    (runner) => {
      expect(
        requiredExtensionVersion(
          manifest({ runner, problems: [{ id: "q01", title: "型を付ける" }] }),
        ),
      ).toBe("0.8.0");
    },
  );

  it("git-record は 0.7.0 以上が要る", () => {
    expect(requiredExtensionVersion(manifest({ runner: "git-record" }))).toBe("0.7.0");
  });

  it("ほかの runner には最低版の要件がない", () => {
    for (const runner of RUNNER_IDS) {
      if (runner === "ts-test" || runner === "dotnet-test" || runner === "git-record") continue;
      expect(requiredExtensionVersion(manifest({ runner })), runner).toBeNull();
    }
  });

  it("runner の要件がなくても、問題つきなら 0.8.0 以上が要る", () => {
    expect(
      requiredExtensionVersion(
        manifest({ runner: "node-test", problems: [{ id: "q01", title: "型を付ける" }] }),
      ),
    ).toBe("0.8.0");
  });
});

describe("extensionSatisfies", () => {
  it("版の申告がなければ要件を満たさない", () => {
    expect(extensionSatisfies(undefined, "0.6.0")).toBe(false);
  });

  it.each([
    "",
    "0.8",
    "0.8.0.1",
    "v0.8.0",
    "0.8.0-pre",
    "0.8.0+build",
    " 0.8.0",
    "0.8.0 ",
    "0.8.0\n",
    "0.8.0\r\n",
    "0.8. 0",
    "0.-8.0",
    "0.a.0",
  ])("数字 3 つでない申告 %j は要件を満たさない", (declared) => {
    expect(extensionSatisfies(declared, "0.6.0")).toBe(false);
  });

  it.each([
    ["0.8.0", "0.8.0", true],
    ["0.7.9", "0.8.0", false],
    ["0.8.0", "0.8.1", false],
    ["0.8.2", "0.8.0", true],
    ["1.0.0", "0.8.0", true],
    ["0.99.99", "1.0.0", false],
    ["0.10.0", "0.9.0", true],
    ["0.9.0", "0.10.0", false],
  ])("%s が %s 以上かを数字で比べる", (declared, required, expected) => {
    expect(extensionSatisfies(declared, required)).toBe(expected);
  });

  it("不正な最低版を渡しても許可しない", () => {
    expect(extensionSatisfies("0.8.2", "0.8")).toBe(false);
  });
});

describe("extensionUpgradeMessage", () => {
  it("必要な版と、更新して Web から開き直す手順を案内する", () => {
    expect(extensionUpgradeMessage("0.8.0")).toBe(
      "この課題を開くには、VS Code の STELLA 拡張を 0.8.0 以上に更新してください。VS Code の拡張機能ビュー (Ctrl+Shift+X、Mac は Cmd+Shift+X) で「STELLA」を開いて更新し、もう一度 Web の「VS Code で開く」から開いてください。",
    );
    expect(EXTENSION_VERSION_PARAM).toBe("extension");
  });
});
