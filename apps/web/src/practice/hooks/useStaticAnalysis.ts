/**
 * 編集中の静的解析 (Lint + AST) を debounce 500ms で実行する Hook。
 *
 * - 結果は React state として常時反映され、画面の左ペインに表示される
 * - サーバ通信は一切しない (クライアント完結)
 * - 言語別ディスパッチャ (`getLinter` / `analyzeAst`) を経由するため、
 *   未対応言語 (SQL 等) では自動で空結果を返す。 空結果は `evaluate()` で
 *   「未適用 = 通過扱い」 になり、 cleared を阻害しない (#104 / #100)。
 */

import { useEffect, useState } from "react";
import type {
  ASTResult,
  Assignment,
  LintViolation,
} from "@falcon/shared/types";
import { analyzeAst } from "@falcon/shared/grading";
import {
  getLanguage,
  getStaticAnalysisSettings,
} from "@falcon/shared/assignment-helpers";

import { getLinter } from "../lib/linters/index.js";

const DEBOUNCE_MS = 500;
// 空クリア時に参照を固定して React の Object.is バイルアウトを効かせ、 余計な再レンダーを防ぐ。
// 受け取り側 (PracticePage / useGradeRunner) はこの配列・オブジェクトを mutate しない契約。
const EMPTY_LINT: LintViolation[] = [];
const EMPTY_AST: ASTResult = { required: [], forbidden: [] };

export function useStaticAnalysis(code: string, assignment: Assignment) {
  const [lint, setLint] = useState<LintViolation[]>(EMPTY_LINT);
  const [ast, setAst] = useState<ASTResult>(EMPTY_AST);

  useEffect(() => {
    const language = getLanguage(assignment);
    // 非 JS のディスパッチャは常に no-op (空結果) を返すので、 debounce を経由せず即時にクリアする。
    // (待つと JS 課題 → SQL 課題に切り替えた直後の 500ms 旧 JS の lint/AST が UI に残り、
    //  grading 実行時のスナップショット (`lintAtRun` / `astAtRun`) も汚染される。 #132 P2)
    // 将来 Pyodide AST など重い解析が増えたら、 その言語もここで debounce 対象に追加する。
    if (language !== "javascript") {
      setLint(EMPTY_LINT);
      setAst(EMPTY_AST);
      return;
    }
    const timer = setTimeout(() => {
      const settings = getStaticAnalysisSettings(assignment);
      const linter = getLinter(language);
      setLint(
        linter(code, settings.eslintRules, {
          ignoredUnusedNames: settings.ignoredUnusedNames,
        }),
      );
      setAst(analyzeAst(language, code, settings.ast));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [code, assignment]);

  return { lint, ast };
}
