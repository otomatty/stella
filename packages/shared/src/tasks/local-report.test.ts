import { describe, expect, it } from "vitest";
import { parseLocalRunReport, toLocalRunReport } from "./local-report.js";
import type { RunResult } from "./run-result.js";

const receipt = { taskId: "dev-env-basics/u01/page", contentHash: "a".repeat(64) };

function result(overrides: Partial<RunResult> = {}): RunResult {
  return {
    schemaVersion: 1,
    taskId: receipt.taskId,
    runner: "node-test",
    outcome: "failed",
    startedAt: "2026-10-06T00:00:00.000Z",
    durationMs: 10,
    platform: "win32",
    toolVersions: { node: "v22.0.0" },
    manifestSha256: "b".repeat(64),
    files: [{ path: "src/secret-name.js", sha256: "c".repeat(64), bytes: 10 }],
    protected: [],
    steps: [
      { id: "lint", label: "ESLint", status: "passed", durationMs: 1, summary: "ok" },
      {
        id: "test",
        label: "Vitest",
        status: "failed",
        durationMs: 1,
        summary: "2 件中 1 件が合格",
        tests: [
          { name: "合計を返す", status: "passed" },
          { name: "空のとき", status: "failed", message: "expected 0 but got undefined" },
        ],
        logTail: "at C:\\Users\\taro\\work\\src\\secret-name.js:3",
      },
    ],
    ...overrides,
  };
}

describe("手元の確認の要約", () => {
  it("回数を数えるための項目だけを残し、コード・ファイル名・メッセージ・端末の情報を落とす", () => {
    const report = toLocalRunReport(result(), receipt);
    expect(report).toEqual({
      ...receipt,
      outcome: "failed",
      failedSteps: ["test"],
      tests: { passed: 1, failed: 1 },
    });
    const sent = JSON.stringify(report);
    for (const leak of ["secret-name", "taro", "expected 0", "win32", "v22", "空のとき"])
      expect(sent).not.toContain(leak);
  });

  it("中断した実行は送らない。テストのない runner は件数を持たない", () => {
    expect(toLocalRunReport(result({ outcome: "cancelled" }), receipt)).toBeNull();
    const html = toLocalRunReport(
      result({
        outcome: "passed",
        steps: [{ id: "static", label: "HTML", status: "passed", durationMs: 1, summary: "ok" }],
      }),
      receipt,
    );
    expect(html).toMatchObject({ outcome: "passed", failedSteps: [], tests: null });
  });

  it("旧拡張の合格 ({ taskId, contentHash }) を合格として読み、知らない項目は捨てる", () => {
    expect(parseLocalRunReport({ ...receipt, logTail: "code" })).toEqual({
      ...receipt,
      outcome: "passed",
      failedSteps: [],
      tests: null,
    });
  });

  it("決まった語彙と件数以外は受け取らない", () => {
    expect(() => parseLocalRunReport({ ...receipt, outcome: "cancelled" })).toThrow();
    expect(() => parseLocalRunReport({ ...receipt, failedSteps: ["npm run evil"] })).toThrow();
    expect(() => parseLocalRunReport({ ...receipt, failedSteps: ["test", "test"] })).toThrow();
    expect(() => parseLocalRunReport({ ...receipt, tests: { passed: 1.5, failed: 0 } })).toThrow();
    expect(() => parseLocalRunReport({ taskId: receipt.taskId })).toThrow();
    expect(() => parseLocalRunReport({ ...receipt, taskId: "x".repeat(301) })).toThrow();
  });
});
