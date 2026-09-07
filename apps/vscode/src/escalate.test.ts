import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Assignment } from "@stella/shared/types";
import type { ExecutionResult } from "./grader-protocol.js";

const apiRequest = vi.fn();

vi.mock("vscode", () => ({}));
vi.mock("./api.js", () => ({ apiRequest }));

const {
  canEscalate,
  clearEscalationAttempt,
  escalateToInstructor,
  getEscalationAttempt,
  rememberEscalationAttempt,
} = await import("./escalate.js");

const assignment: Assignment = {
  id: "asg-1",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 1,
  title: "配列の合計",
  newConcept: "",
  estimatedMinutes: 3,
  difficulty: 1,
  testKind: "stdout",
  description: "",
  language: "typescript",
  entryFile: "main.ts",
  starterFiles: [{ path: "main.ts", content: "" }],
  tests: [{ name: "stdout is ok", expectedStdout: "ok" }],
};

const failed: ExecutionResult = {
  testResults: [{ name: "合計が出る", passed: false, error: "expected 6, got NaN" }],
  serverDurationMs: 1,
  totalDurationMs: 2,
  evaluation: { cleared: false, checks: { lintPassed: true, astPassed: true, testsPassed: false } },
  lintAtRun: [],
  astAtRun: { required: [], forbidden: [] },
};

const cleared: ExecutionResult = {
  ...failed,
  testResults: [{ name: "合計が出る", passed: true }],
  evaluation: { cleared: true, checks: { lintPassed: true, astPassed: true, testsPassed: true } },
};

function remember(result: ExecutionResult): void {
  rememberEscalationAttempt({
    assignment,
    files: { "main.ts": "const sum = 0;", "lib/util.ts": "export const x = 1;" },
    result,
    stageId: "c1",
    stageTitle: "TypeScript 入門",
    lessonId: "l1",
    sectionTitle: "第 1 章",
  });
}

beforeEach(() => {
  apiRequest.mockReset();
  clearEscalationAttempt();
});

describe("getEscalationAttempt", () => {
  it("直近に採点して未クリアだった課題だけ引き継げる", () => {
    remember(failed);
    expect(getEscalationAttempt("asg-1")).toBeDefined();
    expect(canEscalate("asg-1")).toBe(true);
  });

  it("クリアした採点は引き継がない", () => {
    remember(cleared);
    expect(canEscalate("asg-1")).toBe(false);
  });

  it("別の課題 / 採点前は引き継がない", () => {
    remember(failed);
    expect(canEscalate("asg-2")).toBe(false);
    expect(canEscalate(undefined)).toBe(false);
    clearEscalationAttempt();
    expect(canEscalate("asg-1")).toBe(false);
  });
});

describe("escalateToInstructor", () => {
  it("採点したコードと失敗サマリを high 優先度で POST する", async () => {
    remember(failed);
    apiRequest.mockResolvedValue({ row: { id: "s1", attempt: 2 } });

    await expect(escalateToInstructor("asg-1")).resolves.toBe(2);

    expect(apiRequest).toHaveBeenCalledTimes(1);
    const [path, init] = apiRequest.mock.calls[0] as [string, { method: string; body: never }];
    expect(path).toBe("/api/submissions");
    expect(init.method).toBe("POST");
    const body = init.body as {
      lessonId: string;
      assignmentId: string;
      stageTitle: string;
      sectionTitle: string;
      assignmentTitle: string;
      code: string;
      priority: string;
      gradingSummary: { language: string; cleared: boolean; failedTests: Array<{ name: string }> };
    };
    expect(body.lessonId).toBe("l1");
    expect(body.assignmentId).toBe("asg-1");
    expect(body.stageTitle).toBe("TypeScript 入門");
    expect(body.sectionTitle).toBe("第 1 章");
    expect(body.assignmentTitle).toBe("配列の合計");
    expect(body.priority).toBe("high");
    // 入口ファイルが先頭。 複数ファイルは見出し付きで 1 本にまとまる。
    expect(body.code.indexOf("main.ts")).toBeLessThan(body.code.indexOf("lib/util.ts"));
    expect(body.gradingSummary.language).toBe("ts");
    expect(body.gradingSummary.cleared).toBe(false);
    expect(body.gradingSummary.failedTests).toEqual([
      { name: "合計が出る", error: "expected 6, got NaN" },
    ]);
  });

  it("採点していなければ送らずにエラーを返す", async () => {
    await expect(escalateToInstructor("asg-1")).rejects.toThrow("先に採点");
    expect(apiRequest).not.toHaveBeenCalled();
  });
});
