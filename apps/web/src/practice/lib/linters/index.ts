/**
 * Lint の言語別ディスパッチャ。
 *
 * `getLinter(language)` は `Linter` 関数を返すファクトリ。 JS なら
 * `eslint-linter-browserify` ベースの実装、 SQL は空配列を返す no-op を返す。
 * 空配列は `evaluate()` で「未適用 = 通過扱い」 になるため、 cleared 判定を阻害しない。
 */

import type {
  ESLintRuleConfig,
  Language,
  LintViolation,
} from "@falcon/shared/types";

import { lintCode, type LintCodeOptions } from "../eslint-runner.js";

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
    case "sql":
      return NOOP_LINTER;
    default: {
      const _exhaustive: never = language;
      void _exhaustive;
      return NOOP_LINTER;
    }
  }
}
