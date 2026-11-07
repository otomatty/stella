// 05-q07 コールバック関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問11
export function mapStrings(items: readonly string[], fn: (s: string) => string): string[] {
  const result: string[] = [];
  for (const item of items) {
    result.push(fn(item));
  }
  return result;
}
