// 05-q07 コールバック関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問13
export function sumBy(words: readonly string[], fn: (w: string) => number): number {
  let total = 0;
  for (const word of words) {
    total += fn(word);
  }
  return total;
}
