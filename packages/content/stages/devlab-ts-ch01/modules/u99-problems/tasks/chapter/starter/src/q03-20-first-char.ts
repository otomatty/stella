// 01-q03 型推論 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-inference
//
// 定数は、型注釈を書かずに export const で宣言する。
// 関数は、引数には型注釈を書き、戻り値には型注釈を書かない（推論に任せる）。
// テストは、推論された型が決められたとおりになっているかも確かめます。

// 問20 text[0] で最初の文字を取り出して返す（戻り値は string | undefined に推論される。空の文字列では undefined になる）
//     例: firstChar("abc") → "a"
export function firstChar() {}
