// 07-q08 ジェネリクスのユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables
//
// ★総合問題（ジェネリクスのユーティリティ）で使う書き方を繰り返します。型変数を使って書いてください。
// any や unknown で逃げないこと。引数の配列は readonly T[] にし、元の配列は変えないこと。
// Array の findLast や Object.groupBy などは使わず、自分で書くこと（この課題の設定では、型がないので使えない）。

// 問2 keyFn(要素) が返す文字列ごとの数。戻り値は Record<string, number>
//     例: countItems([1, 2, 3], (n) => (n % 2 === 0 ? "偶数" : "奇数")) → { 奇数: 2, 偶数: 1 }
export function countItems() {}
