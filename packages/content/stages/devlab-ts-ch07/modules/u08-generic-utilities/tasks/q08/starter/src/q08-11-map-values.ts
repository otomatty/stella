// 07-q08 ジェネリクスのユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables
//
// ★総合問題（ジェネリクスのユーティリティ）で使う書き方を繰り返します。型変数を使って書いてください。
// any や unknown で逃げないこと。引数の配列は readonly T[] にし、元の配列は変えないこと。
// Array の findLast や Object.groupBy などは使わず、自分で書くこと（この課題の設定では、型がないので使えない）。

// 問11 Record<string, T> のすべての値に fn を当てはめた Record<string, U>（型変数を2つ使う）
//     例: mapValues({ a: 1, b: 2 }, (n) => String(n)) → { a: "1", b: "2" }
export function mapValues() {}
