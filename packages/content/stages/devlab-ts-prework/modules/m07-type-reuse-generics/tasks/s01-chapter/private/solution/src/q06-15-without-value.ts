// 07-q06 型変数（ジェネリクス） ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問15
export function withoutValue<T>(items: readonly T[], value: T): T[] {
  return items.filter((item) => item !== value);
}
