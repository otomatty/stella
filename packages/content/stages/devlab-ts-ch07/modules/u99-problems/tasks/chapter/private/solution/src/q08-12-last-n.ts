// 07-q08 ジェネリクスのユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問12
export function lastN<T>(items: readonly T[], n: number): T[] {
  return n <= 0 ? [] : items.slice(-n);
}
