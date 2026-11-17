// 07-q08 ジェネリクスのユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables
//
// ★総合問題（ジェネリクスのユーティリティ）で使う書き方を繰り返します。型変数を使って書いてください。
// any や unknown で逃げないこと。引数の配列は readonly T[] にし、元の配列は変えないこと。
// Array の findLast や Object.groupBy などは使わず、自分で書くこと（この課題の設定では、型がないので使えない）。

// 問7 2つの配列の同じ番号どうしを fn で組み合わせた配列。長さは短い方に合わせる（型変数を3つ使う）
//     例: zipWith([1, 2], ["a", "b"], (n, s) => `${s}${n}`) → ["a1", "b2"]
export function zipWith() {}
