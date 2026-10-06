import { describe, expect, it } from "vitest";
import { bundleSizeProblem, parsePublicTaskBundle, TASK_BUNDLE_LIMITS } from "./catalog.js";
const manifest = {
  schemaVersion: 1,
  id: "course/unit/q1",
  title: "課題",
  kind: "basic",
  runner: "node-test",
  submit: { files: ["src/**"] },
};
describe("課題の公開境界", () => {
  it("一覧に余分な非公開情報を戻さない", () => {
    const bundle = parsePublicTaskBundle({
      manifest,
      contentHash: "a".repeat(64),
      files: { "src/index.js": "" },
      private: { solution: "answer" },
    });
    expect(bundle).not.toHaveProperty("private");
  });
  it.each([
    "private/solution.js",
    "solution/index.js",
    "variants/q1.js",
    "review.md",
    "hints.md",
    "../answer",
    "/tmp/answer",
  ])("配布に %s を含めない", (path) => {
    expect(() =>
      parsePublicTaskBundle({ manifest, contentHash: "a".repeat(64), files: { [path]: "" } }),
    ).toThrow();
  });
});

describe("配布一式の大きさ", () => {
  const encoded = (bytes: number) => Buffer.alloc(bytes, 1).toString("base64");
  it("1 ファイルと合計の上限を、base64 を戻した大きさで数える", () => {
    expect(bundleSizeProblem({ "a.js": encoded(TASK_BUNDLE_LIMITS.fileBytes) })).toBeUndefined();
    expect(bundleSizeProblem({ "a.js": encoded(TASK_BUNDLE_LIMITS.fileBytes + 1) })).toContain(
      "a.js",
    );
    const half = encoded(Math.ceil(TASK_BUNDLE_LIMITS.totalBytes / 2) + 1);
    expect(bundleSizeProblem({ "a.js": half, "b.js": half })).toContain("合計");
  });
});
