// 07-q08 ジェネリクスのユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問14
export function intersection<T>(a: readonly T[], b: readonly T[]): T[] {
  const result: T[] = [];
  for (const item of a) {
    if (b.includes(item) && !result.includes(item)) {
      result.push(item);
    }
  }
  return result;
}
