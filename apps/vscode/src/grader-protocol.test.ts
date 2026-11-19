import { describe, expect, it } from "vitest";
import {
  formatGradeMessage,
  isGradeErrorMessage,
  isGradeRequest,
  isGradeResultMessage,
  isGraderReadyMessage,
  type ExecutionResult,
} from "./grader-protocol.js";

describe("grader protocol", () => {
  it("accepts a host grade request", () => {
    expect(
      isGradeRequest({
        type: "grade",
        requestId: "r1",
        assignment: { id: "asg-1" },
        files: { "main.js": "console.log(1)" },
      }),
    ).toBe(true);
  });

  it("rejects a request missing files", () => {
    expect(
      isGradeRequest({
        type: "grade",
        requestId: "r1",
        assignment: { id: "asg-1" },
      }),
    ).toBe(false);
  });

  it("accepts grade-result and grade-error replies", () => {
    expect(
      isGradeResultMessage({
        type: "grade-result",
        requestId: "r1",
        result: { evaluation: { cleared: false } },
      }),
    ).toBe(true);
    expect(
      isGradeErrorMessage({
        type: "grade-error",
        requestId: "r1",
        message: "boom",
      }),
    ).toBe(true);
    expect(isGraderReadyMessage({ type: "ready" })).toBe(true);
  });

  it("formats pass and fail messages", () => {
    const base: ExecutionResult = {
      testResults: [
        { name: "a", passed: true },
        { name: "b", passed: false },
      ],
      serverDurationMs: 1,
      totalDurationMs: 2,
      evaluation: {
        cleared: false,
        checks: { lintPassed: true, astPassed: true, testsPassed: false },
      },
      lintAtRun: [],
      astAtRun: { required: [], forbidden: [] },
    };
    expect(formatGradeMessage(base)).toBe("確認: 未完了（テスト失敗 1 件）");
    expect(formatGradeMessage({ ...base, evaluation: { ...base.evaluation, cleared: true } })).toBe(
      "確認: 完了",
    );
  });

  it("mentions lint or AST when those checks fail, not テスト失敗 0 件", () => {
    const passedTests: ExecutionResult = {
      testResults: [{ name: "a", passed: true }],
      serverDurationMs: 1,
      totalDurationMs: 2,
      evaluation: {
        cleared: false,
        checks: { lintPassed: false, astPassed: true, testsPassed: true },
      },
      lintAtRun: [],
      astAtRun: { required: [], forbidden: [] },
    };
    expect(formatGradeMessage(passedTests)).toBe("確認: 未完了（Lint）");
    expect(formatGradeMessage(passedTests)).not.toContain("テスト失敗");

    const astOnly: ExecutionResult = {
      ...passedTests,
      evaluation: {
        cleared: false,
        checks: { lintPassed: true, astPassed: false, testsPassed: true },
      },
    };
    expect(formatGradeMessage(astOnly)).toBe("確認: 未完了（AST）");
    expect(formatGradeMessage(astOnly)).not.toContain("テスト失敗");
  });
});
