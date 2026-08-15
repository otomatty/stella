import type {
  Assignment,
  ASTResult,
  EvaluationResult,
  LintViolation,
  TestResult,
} from "@falcon/shared/types";

/** Same shape as `apps/web/src/practice/hooks/useGradeRunner.ts`. */
export interface ExecutionResult {
  testResults: TestResult[];
  serverDurationMs: number;
  totalDurationMs: number;
  evaluation: EvaluationResult;
  lintAtRun: LintViolation[];
  astAtRun: ASTResult;
  errorMessage?: string;
}

export interface GradeRequest {
  type: "grade";
  requestId: string;
  assignment: Assignment;
  files: Record<string, string>;
}

export interface GradeResultMessage {
  type: "grade-result";
  requestId: string;
  result: ExecutionResult;
}

export interface GradeErrorMessage {
  type: "grade-error";
  requestId: string;
  message: string;
}

export type HostToGraderMessage = GradeRequest;
export type GraderToHostMessage = GradeResultMessage | GradeErrorMessage | { type: "ready" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isGradeRequest(value: unknown): value is GradeRequest {
  if (!isRecord(value) || value.type !== "grade") {
    return false;
  }
  return typeof value.requestId === "string" && isRecord(value.assignment) && isRecord(value.files);
}

export function isGradeResultMessage(value: unknown): value is GradeResultMessage {
  return (
    isRecord(value) &&
    value.type === "grade-result" &&
    typeof value.requestId === "string" &&
    isRecord(value.result)
  );
}

export function isGradeErrorMessage(value: unknown): value is GradeErrorMessage {
  return (
    isRecord(value) &&
    value.type === "grade-error" &&
    typeof value.requestId === "string" &&
    typeof value.message === "string"
  );
}

export function isGraderReadyMessage(value: unknown): value is { type: "ready" } {
  return isRecord(value) && value.type === "ready";
}

export function formatGradeMessage(result: ExecutionResult): string {
  if (result.evaluation.cleared) {
    return "採点: クリア";
  }
  const { lintPassed, astPassed, testsPassed } = result.evaluation.checks;
  const parts: string[] = [];
  if (!lintPassed) {
    parts.push("Lint");
  }
  if (!astPassed) {
    parts.push("AST");
  }
  if (!testsPassed) {
    const failed = result.testResults.filter((test) => !test.passed).length;
    parts.push(`テスト失敗 ${failed} 件`);
  }
  const reason = parts.length > 0 ? parts.join("、") : "判定失敗";
  const extra = result.errorMessage ? ` (${result.errorMessage})` : "";
  return `採点: 未クリア（${reason}）${extra}`;
}
