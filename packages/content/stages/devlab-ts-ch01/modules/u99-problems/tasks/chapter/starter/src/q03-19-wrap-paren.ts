// 01-q03 型推論 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-inference
//
// 定数は、型注釈を書かずに export const で宣言する。
// 関数は、引数には型注釈を書き、戻り値には型注釈を書かない（推論に任せる）。
// テストは、推論された型が決められたとおりになっているかも確かめます。

// 問19 文字列を丸かっこ「()」で囲む
//     例: wrapParen("注") → "(注)"
export function wrapParen() {}
