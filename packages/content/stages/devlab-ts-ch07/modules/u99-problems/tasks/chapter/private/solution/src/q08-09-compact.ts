// 07-q08 ジェネリクスのユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問9
export function compact<T>(items: readonly (T | null | undefined)[]): T[] {
  return items.filter((item): item is T => item !== null && item !== undefined);
}
