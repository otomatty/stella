// 07-q06 型変数（ジェネリクス） ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問10
export function reversedCopy<T>(items: readonly T[]): T[] {
  return [...items].reverse();
}
