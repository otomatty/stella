import { getEntryFile } from "@stella/shared/assignment-helpers";
import { evaluate } from "@stella/shared/grading";
import type { Assignment, TestResult } from "@stella/shared/types";
import {
  lintAssignment,
  runGrading,
  setQuickJsWorkerUrl,
  setSqlJsLocateFile,
} from "@stella/code-runner";
import {
  isGradeRequest,
  type ExecutionResult,
  type GradeErrorMessage,
  type GradeResultMessage,
} from "../src/grader-protocol.js";

declare function acquireVsCodeApi(): { postMessage(message: unknown): void };

const vscode = acquireVsCodeApi();
setQuickJsWorkerUrl(new URL("./quickjs-worker.js", import.meta.url));
setSqlJsLocateFile((file) => new URL(`./${file}`, import.meta.url).href);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runGrade(
  assignment: Assignment,
  files: Record<string, string>,
): Promise<ExecutionResult> {
  const startedAt = performance.now();
  const entry = getEntryFile(assignment);
  const { lint, ast } = lintAssignment(files[entry] ?? "", assignment);

  try {
    const { response, evaluation } = await runGrading({
      files,
      assignment,
      lint,
      ast,
    });
    return {
      testResults: response.results,
      serverDurationMs: response.durationMs,
      totalDurationMs: Math.round(performance.now() - startedAt),
      evaluation,
      lintAtRun: lint,
      astAtRun: ast,
    };
  } catch (error) {
    const msg = errorMessage(error);
    const failedResults: TestResult[] = assignment.tests.map((test) => ({
      name: test.name,
      passed: false,
      error: `RUNNER_ERROR: ${msg}`,
    }));
    return {
      testResults: failedResults,
      serverDurationMs: 0,
      totalDurationMs: Math.round(performance.now() - startedAt),
      evaluation: evaluate(assignment.testKind, failedResults, lint, ast),
      lintAtRun: lint,
      astAtRun: ast,
      errorMessage: msg,
    };
  }
}

window.addEventListener("message", (event: MessageEvent<unknown>) => {
  const message = event.data;
  if (!isGradeRequest(message)) {
    return;
  }
  void runGrade(message.assignment, message.files)
    .then((result) => {
      const reply: GradeResultMessage = {
        type: "grade-result",
        requestId: message.requestId,
        result,
      };
      vscode.postMessage(reply);
    })
    .catch((error: unknown) => {
      const reply: GradeErrorMessage = {
        type: "grade-error",
        requestId: message.requestId,
        message: errorMessage(error),
      };
      vscode.postMessage(reply);
    });
});

vscode.postMessage({ type: "ready" });
