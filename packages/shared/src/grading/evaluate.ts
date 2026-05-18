/**
 * 評価ロジック (二値クリア判定)。 **クライアント側のみ** で使用される。
 *
 * テスト結果(サーバから返却) + Lint違反(クライアント計算済み) + AST結果(クライアント計算済み)
 * を合算して、「全チェック通過 = クリア」の二値判定を返す。
 *
 * 通過条件:
 * - Lint: severity===2 (error) が 0 件
 * - AST: parseError なし & 必須要件すべて充足 & 禁止違反 0 件
 * - Tests: 全テストが passed
 *
 * 未適用 (= 静的解析ディスパッチャが no-op を返す非 JS 言語) は
 * `lintViolations: []` / `astResult: { required: [], forbidden: [] }` として
 * 渡される。 この場合 `every()` / `length === 0` は自然に true になり、
 * `lintPassed` / `astPassed` は通過扱いとなる (#104)。
 */

import type {
  ASTResult,
  EvaluationResult,
  LintViolation,
  TestResult,
  TestKind,
} from "../types.js";

export function evaluate(
  testKind: TestKind,
  testResults: TestResult[],
  lintViolations: LintViolation[],
  astResult: ASTResult,
): EvaluationResult {
  const lintPassed = lintViolations.every((v) => v.severity !== 2);

  const astPassed =
    !astResult.parseError &&
    astResult.required.every((r) => r.found) &&
    astResult.forbidden.length === 0;

  const testsPassed = (() => {
    switch (testKind) {
      case "stdout":
      case "function":
      case "sql":
      case "mutation":
      case "eslint-config":
        // mutation / eslint-config も他と同じ「全 TestResult が pass」 判定で良い。
        // ランナー側が reference (Vitest なら全 pass / ESLint なら違反 0 件) と各 mutant
        // (Vitest なら kill / ESLint なら違反 ≥ 1 件) を 1 件ずつの TestResult に集約しており、
        // すべて成功で testsPassed=true。
        return testResults.length > 0 && testResults.every((t) => t.passed);
      default: {
        const exhaustive: never = testKind;
        return exhaustive;
      }
    }
  })();

  return {
    cleared: lintPassed && astPassed && testsPassed,
    checks: { lintPassed, astPassed, testsPassed },
  };
}
