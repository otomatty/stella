// 07-q08 ジェネリクスのユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問8
export function flattenOnce<T>(nested: readonly (readonly T[])[]): T[] {
  const result: T[] = [];
  for (const inner of nested) {
    result.push(...inner);
  }
  return result;
}
