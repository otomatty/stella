// 07-q08 ジェネリクスのユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問15
export function union<T>(a: readonly T[], b: readonly T[]): T[] {
  const result: T[] = [];
  for (const item of [...a, ...b]) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }
  return result;
}
