// 07-q06 型変数（ジェネリクス） ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問12
export function takeFirst<T>(items: readonly T[], n: number): T[] {
  return items.slice(0, n);
}
