import { describe, expect, it } from "vitest";
import { canSubmit, decideOutcome } from "./run-result.js";
import { RUNNER_IDS, RUNNERS, isRunnerId } from "./runners.js";

describe("decideOutcome", () => {
  it("エラーを失敗より優先する", () => {
    expect(decideOutcome([{ status: "failed" }, { status: "error" }])).toBe("error");
    expect(decideOutcome([{ status: "passed" }, { status: "failed" }])).toBe("failed");
    expect(decideOutcome([{ status: "passed" }, { status: "skipped" }])).toBe("passed");
  });

  it("何も通っていなければ合格にしない", () => {
    expect(decideOutcome([])).toBe("error");
    expect(decideOutcome([{ status: "skipped" }, { status: "skipped" }])).toBe("error");
  });

  it("中断は何より優先する", () => {
    expect(decideOutcome([{ status: "passed" }], { cancelled: true })).toBe("cancelled");
    expect(decideOutcome([{ status: "error" }], { cancelled: true })).toBe("cancelled");
  });
});

describe("canSubmit", () => {
  const file = { path: "src/a.js", sha256: "x", bytes: 1 };

  it("全部通っていて、提出するファイルがあるときだけ", () => {
    const runner = "node-test" as const;
    expect(canSubmit({ outcome: "passed", files: [file], runner })).toBe(true);
    expect(canSubmit({ outcome: "passed", files: [], runner })).toBe(false);
    expect(canSubmit({ outcome: "failed", files: [file], runner })).toBe(false);
    expect(canSubmit({ outcome: "error", files: [file], runner })).toBe(false);
    expect(canSubmit({ outcome: "cancelled", files: [file], runner })).toBe(false);
    // 環境診断は提出ファイルを持たないので、通れば提出できる。
    expect(canSubmit({ outcome: "passed", files: [], runner: "env-diagnose" })).toBe(true);
    expect(canSubmit({ outcome: "failed", files: [], runner: "env-diagnose" })).toBe(false);
  });
});

describe("RUNNERS", () => {
  it("すべての runnerId に定義がある", () => {
    for (const id of RUNNER_IDS) {
      expect(RUNNERS[id].id).toBe(id);
    }
    expect(isRunnerId("node-test")).toBe(true);
    expect(isRunnerId("sh")).toBe(false);
  });

  it("Node.js が要らないのは HTML の確認・環境診断・CI だけ", () => {
    const withoutNode = RUNNER_IDS.filter((id) => !RUNNERS[id].requiresNode);
    expect(withoutNode).toEqual(["static-preview", "env-diagnose", "ci-deploy"]);
  });
});
