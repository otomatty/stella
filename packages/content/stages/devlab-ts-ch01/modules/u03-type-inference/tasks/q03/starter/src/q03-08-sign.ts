// 01-q03 型推論 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-inference
//
// 定数は、型注釈を書かずに export const で宣言する。
// 関数は、引数には型注釈を書き、戻り値には型注釈を書かない（推論に任せる）。
// テストは、推論された型が決められたとおりになっているかも確かめます。

// 問8 正なら "plus"、負なら "minus"、0 なら "zero" を返す（戻り値は "plus" | "minus" | "zero" に推論される）
//     例: sign(-3) → "minus"
export function sign() {}
