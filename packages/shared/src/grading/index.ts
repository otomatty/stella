/**
 * 静的解析 (AST) の言語別ディスパッチャ (#104 / #100)。
 *
 * `analyzeAst(language, code, requirement)` は `Language` を見て JS なら Babel
 * ベースの `analyzeJsAst` を呼び出し、 SQL は空の `ASTResult` を返す。 空結果は
 * `evaluate()` で 「未適用 = 通過扱い」 になるため、 cleared 判定を阻害しない。
 */

import type { ASTRequirement, ASTResult, Language } from "../types.js";
import { analyzeJsAst } from "./ast.js";

/**
 * 未対応言語向けの空結果。 呼び出し側で配列を mutate しても他の呼び出しに
 * 波及しないよう、 共有定数ではなく毎回新規オブジェクト/配列を生成して返す。
 */
function emptyAst(): ASTResult {
  return { required: [], forbidden: [] };
}

export function analyzeAst(
  language: Language,
  code: string,
  requirement: ASTRequirement,
): ASTResult {
  switch (language) {
    case "javascript":
      return analyzeJsAst(code, requirement);
    // TypeScript は Babel パーサに TS プラグインを付けていないため型注釈でパースできない。
    // SQL と擬似言語はそもそも JS ではない。 いずれも空結果 = 未適用 = 通過扱いにして、
    // 採点はテスト結果のみで判定する。
    case "typescript":
    case "sql":
    case "fe-pseudo":
      return emptyAst();
    default: {
      const _exhaustive: never = language;
      void _exhaustive;
      return emptyAst();
    }
  }
}

export { analyzeJsAst } from "./ast.js";
export { evaluate } from "./evaluate.js";
