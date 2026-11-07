// 07-q06 型変数（ジェネリクス） ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問16
export function lastIndexOfValue<T>(items: readonly T[], value: T): number {
  return items.lastIndexOf(value);
}
