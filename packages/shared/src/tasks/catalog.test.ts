import { describe, expect, it } from "vitest";
import { parsePublicTaskBundle } from "./catalog.js";
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
