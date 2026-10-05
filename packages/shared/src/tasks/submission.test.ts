import { describe, expect, it } from "vitest";
import { decodeFile, parseTaskSubmission, verifyTaskSubmission } from "./submission.js";
import { submissionFixture } from "../testing/task-submission.js";

describe("提出の機械照合", () => {
  it("宣言したファイル・手元の結果・配布ハッシュを照合する", async () => {
    const { input, bundle } = await submissionFixture();
    expect((await verifyTaskSubmission(parseTaskSubmission(input), bundle)).check).toEqual({
      matched: true,
      reasons: [],
    });
  });
  it("Windows の BOM・CRLF を配布ハッシュと同じ正規化で照合する", async () => {
    const { input, bundle, source } = await submissionFixture();
    const content = Buffer.from(`\uFEFF${source.replaceAll("\n", "\r\n")}`);
    input.files[0].content = content.toString("base64");
    input.localResult.files[0].bytes = content.length;
    expect((await verifyTaskSubmission(input, bundle)).check.matched).toBe(true);
  });
  it.each(["source", "test", "manifest", "missing-step", "fake-passed", "task"])(
    "%s の食い違いは人に回す",
    async (mismatch) => {
      const { input, bundle } = await submissionFixture();
      if (mismatch === "source") input.files[0].content = Buffer.from("changed").toString("base64");
      if (mismatch === "test") {
        input.protected[0].sha256 = "b".repeat(64);
        input.localResult.protected[0].sha256 = "b".repeat(64);
      }
      if (mismatch === "manifest") input.localResult.manifestSha256 = "b".repeat(64);
      if (mismatch === "missing-step")
        input.localResult.steps = input.localResult.steps.filter((s) => s.id !== "static");
      if (mismatch === "fake-passed") input.localResult.steps[0].status = "failed";
      if (mismatch === "task") input.localResult.taskId = "another/task";
      expect((await verifyTaskSubmission(input, bundle)).check.matched).toBe(false);
    },
  );
  it("未宣言ファイルは保存しない", async () => {
    const { input, bundle } = await submissionFixture();
    input.files.push({ path: ".env", content: "" });
    await expect(verifyTaskSubmission(input, bundle)).rejects.toThrow("提出対象ではない");
  });
  it.each([
    "../secret",
    "/secret",
    "x/../secret",
    "node_modules/a.js",
    ".stella/task.json",
    "x/./a.js",
  ])("危険なパス %s を拒否する", async (path) => {
    const { input } = await submissionFixture();
    input.files[0].path = path;
    expect(() => parseTaskSubmission(input)).toThrow();
  });
  it("空ファイルは許し、不正な base64 と容量超過を拒否する", () => {
    expect(decodeFile("").length).toBe(0);
    expect(() => decodeFile("!!!!")).toThrow();
    expect(() => decodeFile("A".repeat(1400000))).toThrow();
  });
  it("同一ファイルの重複と壊れた結果を拒否する", async () => {
    const { input } = await submissionFixture();
    input.files.push(input.files[0]);
    expect(() => parseTaskSubmission(input)).toThrow();
    input.files.pop();
    input.localResult.steps = [null] as unknown as typeof input.localResult.steps;
    expect(() => parseTaskSubmission(input)).toThrow();
  });
  it("相談は合格した実行結果でも人に回す", async () => {
    const { input, bundle } = await submissionFixture();
    input.mode = "consult";
    expect((await verifyTaskSubmission(input, bundle)).check.reasons).toContain(
      "受講者が講師への相談を求めています",
    );
  });
});
