/**
 * 擬似言語 (基本情報技術者試験 科目B) → JavaScript トランスパイラ (#133)。
 *
 * `ts-runner` が TypeScript を JS に落として `jsRunner` に委譲するのと同じ構図で、
 * 擬似言語も「JS に落として QuickJS で動かす」。 実行基盤を増やさずに、
 * 本試験と同じ記法のまま採点できるようにするのが狙い。
 *
 * 対応する構文サブセットと、 擬似言語固有の意味論 (1 起点の配列 / 整数除算の切り捨て)
 * は `SYNTAX.md` を参照。
 */

export { FePseudoError } from "./errors.js";
export type { Program } from "./ast.js";

import { generate } from "./codegen.js";
import { parse } from "./parser.js";

/**
 * 擬似言語のソースを QuickJS で実行できる JS に変換する。
 * 構文エラーは `FePseudoError` (行番号つきの日本語メッセージ) を投げる。
 */
export function transpileFePseudo(source: string): string {
  return generate(parse(source));
}
