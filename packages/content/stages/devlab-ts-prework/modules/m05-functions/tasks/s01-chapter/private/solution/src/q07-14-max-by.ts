// 05-q07 コールバック関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問14
export function maxBy(words: readonly string[], fn: (w: string) => number): string | undefined {
  let best: string | undefined;
  let bestValue = -Infinity;
  for (const word of words) {
    const value = fn(word);
    if (value > bestValue) {
      best = word;
      bestValue = value;
    }
  }
  return best;
}
