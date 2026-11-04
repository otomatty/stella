import type { TestCaseResult } from "@stella/shared/tasks/run-result";
import { describe, expect, it } from "vitest";
import type { ProcessOutcome } from "./process.js";
import { dotnetBuildOutcome, dotnetTestOutcome } from "./steps.js";

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

const NUGET_CACHE_SUMMARY =
  "依存パッケージの準備が終わっていないか、NuGet のキャッシュから消えています。もう一度「課題を確認する」を実行してください";

const ROOT = "C:\\Users\\山田 太郎\\web-training\\csharp\\u02\\q01";
const HOME = "C:\\Users\\山田 太郎";
const NETSDK1064 =
  "C:\\Program Files\\dotnet\\sdk\\10.0.400\\Sdks\\Microsoft.NET.Sdk\\targets\\Microsoft.PackageDependencyResolution.targets(266,5): error NETSDK1064: パッケージ xunit.core、バージョン 2.9.3 が見つかりませんでした。NuGet の復元以降に削除された可能性があります。 [C:\\Users\\山田 太郎\\web-training\\csharp\\u02\\q01\\Task.csproj]";

describe("dotnetBuildOutcome", () => {
  it("NETSDK1064 は依存パッケージのやり直し", () => {
    const result = dotnetBuildOutcome(
      outcome({ exitCode: 1, stdout: NETSDK1064 }),
      ROOT,
      "win32",
      HOME,
    );
    expect(result.resetDeps).toBe(true);
    expect(result.outcome.status).toBe("error");
    expect(result.outcome.summary).toBe(NUGET_CACHE_SUMMARY);
    expect(result.outcome.logTail).toContain("error NETSDK1064");
    expect(result.outcome.logTail).toContain("Task.csproj");
    expect(result.outcome.logTail).not.toContain("山田");
  });

  it("NU1004 と NETSDK1004 も依存パッケージのやり直し", () => {
    for (const code of ["NU1004", "NETSDK1004"]) {
      const result = dotnetBuildOutcome(
        outcome({ exitCode: 1, stderr: `error ${code}: パッケージを復元できません` }),
        ROOT,
        "win32",
        HOME,
      );
      expect(result.resetDeps).toBe(true);
      expect(result.outcome.status).toBe("error");
      expect(result.outcome.summary).toBe(NUGET_CACHE_SUMMARY);
    }
  });

  it("CS のコンパイルエラーは要修正で、準備はやり直さない", () => {
    const line = `${ROOT}\\src\\Answers.cs(5,22): error CS1002: ${ROOT}\\src\\Foo.cs を見てください [${ROOT}\\Task.csproj]`;
    const result = dotnetBuildOutcome(outcome({ exitCode: 1, stdout: line }), ROOT, "win32", HOME);
    expect(result.resetDeps).toBe(false);
    expect(result.outcome.status).toBe("failed");
    expect(result.outcome.summary).toBe(
      "コンパイルエラーが 1 件あります。エラーの行を直して保存してください",
    );
    expect(result.outcome.lint).toEqual([
      {
        file: "src/Answers.cs",
        line: 5,
        column: 22,
        ruleId: "CS1002",
        message: "src\\Foo.cs を見てください",
        severity: "error",
      },
    ]);
  });

  it("終了コード 0 は合格", () => {
    expect(
      dotnetBuildOutcome(outcome({ exitCode: 0, stdout: NETSDK1064 }), ROOT, "win32", HOME),
    ).toEqual({
      outcome: { status: "passed", summary: "ビルドできました" },
      resetDeps: false,
    });
  });
});

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

  it("テスト名の Stack overflow は普通の失敗", () => {
    const tests = [testCase("Stack overflow を防ぐ", "failed")];
    const result = dotnetTestOutcome(
      outcome({
        exitCode: 1,
        stdout: ["  失敗 Stack overflow を防ぐ [< 1 ms]", 'Expected: "Stack overflow"'].join("\n"),
      }),
      tests,
    );
    expect(result.status).toBe("failed");
    expect(result.summary).toBe("1 件中 0 件が通りました");
    expect(result.tests).toEqual(tests);
  });

  it("ホストがスタックオーバーフローで落ちた行なら案内する", () => {
    const lines = [
      "アクティブなテストの実行が中止されました。理由: テストのホスト プロセスがクラッシュしました : Stack overflow.",
      "The active test run was aborted. Reason: Test host process crashed : Stack overflow.",
    ];
    for (const line of lines) {
      const result = dotnetTestOutcome(outcome({ exitCode: 1, stdout: line }), []);
      expect(result.status).toBe("failed");
      expect(result.summary).toBe(STACK_OVERFLOW_SUMMARY);
    }
  });

  it("logTail と失敗メッセージから課題フォルダーとホームを消す", () => {
    const paths = { root: ROOT, home: HOME, platform: "win32" as const };
    const stopped = dotnetTestOutcome(
      outcome({ exitCode: 1, stdout: `stopped ${ROOT}\\src\\Answers.cs ${HOME}\\.nuget\\x` }),
      [],
      paths,
    );
    expect(stopped.logTail).toBe("stopped src\\Answers.cs ~\\.nuget\\x");
    expect(stopped.logTail).not.toContain("山田");

    const tests = [
      { name: "a", status: "failed" as const, message: `see ${ROOT}\\src\\Answers.cs` },
    ];
    const failed = dotnetTestOutcome(outcome({ exitCode: 1 }), tests, paths);
    expect(failed.summary).toBe("1 件中 0 件が通りました");
    expect(failed.tests?.[0]?.message).toBe("see src\\Answers.cs");
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
