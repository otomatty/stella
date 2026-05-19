/**
 * 「採点を実行」ボタン押下時に言語別ランナへディスパッチし、
 * 返ってきた結果と手元の Lint/AST 結果を合算してクリア判定を返す Hook。
 *
 * #109 で `runners/index.ts` を介して JS / SQL を振り分けるよう変更。
 */

import { useCallback, useState } from "react";
import { evaluate } from "@falcon/shared/grading/evaluate";
import type {
  ASTResult,
  Assignment,
  EvaluationResult,
  LintViolation,
  TestResult,
} from "@falcon/shared/types";

import { runGrading } from "@falcon/code-runner";

export interface ExecutionResult {
  testResults: TestResult[];
  serverDurationMs: number;
  totalDurationMs: number;
  evaluation: EvaluationResult;
  /** 実行時のスナップショット (画面の lint 状態と独立に表示するため) */
  lintAtRun: LintViolation[];
  astAtRun: ASTResult;
  errorMessage?: string;
}

interface RunArgs {
  /**
   * 学習者の編集中ファイル群 (path → content)。
   * 内部で `getEntryFile(assignment)` のキー値だけが採点対象として渡される。
   */
  files: Record<string, string>;
  assignment: Assignment;
  lint: LintViolation[];
  ast: ASTResult;
}

export function useGradeRunner() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);

  const reset = useCallback(() => setResult(null), []);

  const run = useCallback(
    async (args: RunArgs): Promise<ExecutionResult> => {
      setRunning(true);
      const startedAt = performance.now();

      try {
        const { response, evaluation } = await runGrading(args);

        const finalResult: ExecutionResult = {
          testResults: response.results,
          serverDurationMs: response.durationMs,
          totalDurationMs: Math.round(performance.now() - startedAt),
          evaluation,
          lintAtRun: args.lint,
          astAtRun: args.ast,
        };
        setResult(finalResult);
        return finalResult;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // テストはすべて失敗として表示。クリア判定は Lint/AST/テストの3軸でそのまま計算。
        const failedResults: TestResult[] = args.assignment.tests.map((t) => ({
          name: t.name,
          passed: false,
          error: `RUNNER_ERROR: ${msg}`,
        }));
        const evaluation = evaluate(
          args.assignment.testKind,
          failedResults,
          args.lint,
          args.ast,
        );
        const finalResult: ExecutionResult = {
          testResults: failedResults,
          serverDurationMs: 0,
          totalDurationMs: Math.round(performance.now() - startedAt),
          evaluation,
          lintAtRun: args.lint,
          astAtRun: args.ast,
          errorMessage: msg,
        };
        setResult(finalResult);
        return finalResult;
      } finally {
        setRunning(false);
      }
    },
    [],
  );

  return { running, result, run, reset };
}
