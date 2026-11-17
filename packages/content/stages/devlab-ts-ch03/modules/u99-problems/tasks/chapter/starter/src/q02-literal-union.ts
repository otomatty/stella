// 03-q02 リテラル型のユニオン
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union
//
// 問題
// 飲み物のサイズを扱う関数を書いてください。
//
// 1. 型 Size を、"S"、"M"、"L" のどれかだけを表す型として定義して export する
//
// 2. priceOf(size)
//    S は 300、M は 400、L は 500 を返す
//
// 3. parseSize(text)
//    前後の空白を取り除いて大文字にし、"S"、"M"、"L" のどれかなら、その Size を返す。
//    どれでもなければ undefined を返す。引数は string、戻り値は Size | undefined
//    例: parseSize(" m ") → "M"、parseSize("XL") → undefined
//
// 4. upsize(size)
//    1つ大きいサイズを返す。L は L のまま

export type Size = unknown;

export function priceOf() {}

export function parseSize() {}

export function upsize() {}
