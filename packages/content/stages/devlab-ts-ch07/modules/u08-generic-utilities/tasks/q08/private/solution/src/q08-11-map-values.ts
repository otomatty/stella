// 07-q08 ジェネリクスのユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問11
export function mapValues<T, U>(record: Record<string, T>, fn: (value: T) => U): Record<string, U> {
  const result: Record<string, U> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = fn(value);
  }
  return result;
}
