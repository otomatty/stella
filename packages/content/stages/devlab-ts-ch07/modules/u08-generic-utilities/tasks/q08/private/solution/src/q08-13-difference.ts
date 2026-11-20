// 07-q08 ジェネリクスのユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問13
export function difference<T>(a: readonly T[], b: readonly T[]): T[] {
  return a.filter((item) => !b.includes(item));
}
