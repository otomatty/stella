// 07-q08 ジェネリクスのユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問4
export function uniqueByKey<T>(items: readonly T[], keyFn: (item: T) => string | number): T[] {
  const seen: (string | number)[] = [];
  const result: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.includes(key)) {
      seen.push(key);
      result.push(item);
    }
  }
  return result;
}
