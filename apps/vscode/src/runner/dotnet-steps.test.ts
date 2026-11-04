import type { TestCaseResult } from "@stella/shared/tasks/run-result";
import { describe, expect, it } from "vitest";
import type { ProcessOutcome } from "./process.js";
import { dotnetTestOutcome } from "./steps.js";

function outcome(overrides: Partial<ProcessOutcome> = {}): ProcessOutcome {
  return {
    exitCode: 0,
    stdout: "",
    stderr: "",
    truncated: false,
    timedOut: false,
    aborted: false,
    durationMs: 0,
    ...overrides,
  };
}

function testCase(name: string, status: TestCaseResult["status"]): TestCaseResult {
  return { name, status };
}

const STACK_OVERFLOW_SUMMARY =
  "テストの実行中にスタックオーバーフローで止まりました。メソッドが自分自身を呼び続けていないか (終わりの条件があるか) 確認してください";

describe("dotnetTestOutcome", () => {
  it("終了コード 1 で Stack overflow の行があり 0 件なら、スタックオーバーフローとして要修正", () => {
    const head = Array.from({ length: 25 }, (_, index) => `line ${index + 1}`);
    const crash =
      "アクティブなテストの実行が中止されました。理由: テストのホスト プロセスがクラッシュしました : Stack overflow.";
    const result = dotnetTestOutcome(
      outcome({ exitCode: 1, stdout: [...head, crash].join("\n") }),
      [],
    );
    expect(result.status).toBe("failed");
    expect(result.summary).toBe(STACK_OVERFLOW_SUMMARY);
    expect(result.tests).toBeUndefined();
    const tail = result.logTail?.split("\n") ?? [];
    expect(tail).toHaveLength(20);
    expect(tail[0]).toBe("line 7");
    expect(tail[19]).toBe(crash);
    expect(dotnetTestOutcome(outcome({ exitCode: 1, stderr: "STACK OVERFLOW" }), []).summary).toBe(
      STACK_OVERFLOW_SUMMARY,
    );
  });

  it("読めたテストがあれば、スタックオーバーフローでも残す", () => {
    const tests = [testCase("Sum", "passed")];
    const result = dotnetTestOutcome(outcome({ exitCode: 1, stdout: "Stack overflow." }), tests);
    expect(result.status).toBe("failed");
    expect(result.summary).toBe(STACK_OVERFLOW_SUMMARY);
    expect(result.tests).toEqual(tests);
  });

  it("TRX が読めなければ環境の問題", () => {
    const result = dotnetTestOutcome(outcome({ exitCode: 1, stdout: "could not read" }), null);
    expect(result.status).toBe("error");
    expect(result.summary).toBe("テストの結果を読めませんでした");
    expect(result.logTail).toContain("could not read");
  });

  it("終了コードが 0 でなく失敗が無ければ、途中で止まったことにする", () => {
    const none = dotnetTestOutcome(outcome({ exitCode: 1, stdout: "stopped" }), []);
    expect(none.status).toBe("failed");
    expect(none.summary).toBe("テストの実行が途中で止まりました。出力の最後を確認してください");
    expect(none.tests).toBeUndefined();
    expect(none.logTail).toContain("stopped");

    const tests = [testCase("Sum", "passed")];
    const passedOnly = dotnetTestOutcome(outcome({ exitCode: 1, stdout: "host died" }), tests);
    expect(passedOnly.status).toBe("failed");
    expect(passedOnly.summary).toBe(
      "テストの実行が途中で止まりました。出力の最後を確認してください",
    );
    expect(passedOnly.tests).toEqual(tests);
  });

  it("終了コード 0 で 0 件はテストが見つからない", () => {
    expect(dotnetTestOutcome(outcome({ exitCode: 0 }), [])).toEqual({
      status: "error",
      summary: "テストが見つかりませんでした",
    });
  });

  it("終了コード 0 で Passed 1 件・出力に Stack overflow の文字があっても合格", () => {
    const tests = [testCase("名前に Stack overflow を含む", "passed")];
    expect(dotnetTestOutcome(outcome({ exitCode: 0, stdout: "Stack overflow" }), tests)).toEqual({
      status: "passed",
      summary: "1 件すべて通りました",
      tests,
    });
  });

  it("終了コード 0 で Passed が 2 件なら合格", () => {
    const tests = [testCase("a", "passed"), testCase("b", "passed")];
    expect(dotnetTestOutcome(outcome({ exitCode: 0 }), tests)).toEqual({
      status: "passed",
      summary: "2 件すべて通りました",
      tests,
    });
  });

  it("失敗があれば、省略を除いた件数で要修正", () => {
    const tests = [testCase("a", "passed"), testCase("b", "failed"), testCase("c", "skipped")];
    const result = dotnetTestOutcome(outcome({ exitCode: 1 }), tests);
    expect(result.status).toBe("failed");
    expect(result.summary).toBe("2 件中 1 件が通りました");
    expect(result.tests).toEqual(tests);
    expect(result.logTail).toBeUndefined();
  });
});
