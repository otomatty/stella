// 01-q03 型推論 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-inference
//
// 定数は、型注釈を書かずに export const で宣言する。
// 関数は、引数には型注釈を書き、戻り値には型注釈を書かない（推論に任せる）。
// テストは、推論された型が決められたとおりになっているかも確かめます。

// 問13 0〜11時なら "午前"、12〜23時なら "午後" を返す（戻り値は "午前" | "午後" に推論される）
//     例: ampm(13) → "午後"
export function ampm() {}
