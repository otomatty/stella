// 07-q08 ジェネリクスのユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables
//
// ★総合問題（ジェネリクスのユーティリティ）で使う書き方を繰り返します。型変数を使って書いてください。
// any や unknown で逃げないこと。引数の配列は readonly T[] にし、元の配列は変えないこと。
// Array の findLast や Object.groupBy などは使わず、自分で書くこと（この課題の設定では、型がないので使えない）。

// 問3 predicate が true の配列と false の配列に分ける。戻り値は [T[], T[]]
//     例: splitBy([1, 2, 3], (n) => n > 1) → [[2, 3], [1]]
export function splitBy() {}
