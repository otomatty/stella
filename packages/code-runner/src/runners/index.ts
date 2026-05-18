/**
 * 言語別ランナーのディスパッチャ (falcon-informal P0)。
 *
 * `getRunner(language)` は `CodeRunner` インタフェースを満たす言語別実装を返す。
 * 本プロジェクトでは JavaScript / SQL の 2 言語のみ対応。
 *
 * `runGrading` は採点呼び出し側 (`useGradeRunner`) 向けの薄いラッパで、
 * ランナーで実行した結果と手元の Lint / AST を合算して `evaluate()` を返す。
 */

import type {
  Assignment,
  ASTResult,
  EvaluationResult,
  Language,
  LintViolation,
  RunTestsResponse,
} from "@falcon/shared/types";
import type { CodeRunner } from "@falcon/shared/runner/types";
import {
  getEntryFile,
  getLanguage,
} from "@falcon/shared/assignment-helpers";
import { evaluate } from "@falcon/shared/grading/evaluate";

import { jsRunner } from "./js-runner.js";
import { sqlRunner } from "./sql-runner.js";

export function getRunner(language: Language): CodeRunner {
  switch (language) {
    case "javascript":
      return jsRunner;
    case "sql":
      return sqlRunner;
    default: {
      const _exhaustive: never = language;
      void _exhaustive;
      throw new Error(`Unknown language: ${language as string}`);
    }
  }
}

interface RunArgs {
  files: Record<string, string>;
  assignment: Assignment;
  lint: LintViolation[];
  ast: ASTResult;
}

export interface DispatchResult {
  response: RunTestsResponse;
  evaluation: EvaluationResult;
}

/**
 * 採点を実行する。 言語に応じたランナーへ委譲し、 Lint / AST を含めた採点判定を返す。
 *
 * SQL 等の非 JS 課題では Lint / AST は採点対象から外す (UI 側でも空配列を渡してくる)。
 */
export async function runGrading(args: RunArgs): Promise<DispatchResult> {
  const language = getLanguage(args.assignment);
  const entry = getEntryFile(args.assignment);
  if (!Object.prototype.hasOwnProperty.call(args.files, entry)) {
    const known = Object.keys(args.files).join(", ");
    throw new Error(
      `entryFile "${entry}" not found in submitted files (known: ${known || "(none)"})`,
    );
  }

  const runner = getRunner(language);
  const response = await runner.run({
    files: args.files,
    entryFile: entry,
    tests: args.assignment.tests,
    testKind: args.assignment.testKind,
    mode: "test",
    entryPoints: args.assignment.entryPoints,
    sqlSeed: args.assignment.sqlSeed,
    mutation: args.assignment.mutation,
  });

  const isJs = language === "javascript";
  const evaluation = evaluate(
    args.assignment.testKind,
    response.results,
    isJs ? args.lint : [],
    isJs ? args.ast : { required: [], forbidden: [] },
  );
  return { response, evaluation };
}
