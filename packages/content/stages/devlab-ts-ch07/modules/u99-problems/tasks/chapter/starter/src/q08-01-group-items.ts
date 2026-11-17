// 07-q08 ジェネリクスのユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables
//
// ★総合問題（ジェネリクスのユーティリティ）で使う書き方を繰り返します。型変数を使って書いてください。
// any や unknown で逃げないこと。引数の配列は readonly T[] にし、元の配列は変えないこと。
// Array の findLast や Object.groupBy などは使わず、自分で書くこと（この課題の設定では、型がないので使えない）。

// 問1 keyFn(要素) が返す文字列ごとにまとめる。戻り値は Record<string, T[]>
//     例: groupItems(["ab", "c", "de"], (s) => String(s.length)) → { "2": ["ab", "de"], "1": ["c"] }
export function groupItems() {}
