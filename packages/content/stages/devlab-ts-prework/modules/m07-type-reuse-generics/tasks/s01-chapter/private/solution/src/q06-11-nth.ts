// 07-q06 型変数（ジェネリクス） ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問11
export function nth<T>(items: readonly T[], index: number): T | undefined {
  return index < 0 ? items[items.length + index] : items[index];
}
