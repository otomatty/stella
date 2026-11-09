// 07-q06 型変数（ジェネリクス） ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問14
export function includesValue<T>(items: readonly T[], value: T): boolean {
  return items.includes(value);
}
