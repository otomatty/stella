/**
 * Lint + AST の課題向けディスパッチャ。
 *
 * `getLinter(language)` は `Linter` 関数を返すファクトリ。 JS なら
 * `eslint-linter-browserify` ベースの実装、 TypeScript / SQL は空配列を返す no-op を返す。
 * 空配列は `evaluate()` で「未適用 = 通過扱い」 になるため、 cleared 判定を阻害しない。
 *
 * `lintAssignment` は現行 PracticeWorkspace と同じく `getLinter` + `analyzeAst` を一度呼ぶ。
 */

import { analyzeAst } from "@falcon/shared/grading";
import { getLanguage, getStaticAnalysisSettings } from "@falcon/shared/assignment-helpers";
import type {
  Assignment,
  ASTResult,
  ESLintRuleConfig,
  Language,
  LintViolation,
} from "@falcon/shared/types";

import { lintCode, type LintCodeOptions } from "./eslint-runner.js";

export type Linter = (
  code: string,
  rules: Record<string, ESLintRuleConfig>,
  options?: LintCodeOptions,
) => LintViolation[];

const NOOP_LINTER: Linter = () => [];

export function getLinter(language: Language): Linter {
  switch (language) {
    case "javascript":
      return lintCode;
    // TypeScript は JS 用 ESLint パーサが型注釈を読めず、 無意味な構文エラーだらけになるので
    // SQL と同じく no-op。 擬似言語も JS ではないので同様。
    // 空配列は `evaluate()` で「未適用 = 通過扱い」 になる。
    case "typescript":
    case "sql":
    case "fe-pseudo":
      return NOOP_LINTER;
    default: {
      const _exhaustive: never = language;
      void _exhaustive;
      return NOOP_LINTER;
    }
  }
}

export function lintAssignment(
  code: string,
  assignment: Assignment,
): { lint: LintViolation[]; ast: ASTResult } {
  const language = getLanguage(assignment);
  const settings = getStaticAnalysisSettings(assignment);
  const linter = getLinter(language);
  return {
    lint: linter(code, settings.eslintRules, {
      ignoredUnusedNames: settings.ignoredUnusedNames,
    }),
    ast: analyzeAst(language, code, settings.ast),
  };
}

export {
  GLOBALS,
  lintCode,
  linter,
  type LintCodeOptions,
} from "./eslint-runner.js";
