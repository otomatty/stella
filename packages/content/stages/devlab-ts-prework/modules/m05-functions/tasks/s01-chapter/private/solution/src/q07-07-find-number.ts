// 05-q07 コールバック関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問7
export function findNumber(
  numbers: readonly number[],
  predicate: (n: number) => boolean,
): number | undefined {
  for (const n of numbers) {
    if (predicate(n)) {
      return n;
    }
  }
  return undefined;
}
