// 04-q03 for文と for-of文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/for-of
//       https://jsprimer.net/basic/loop/

// 問13
export function firstNegative(numbers: readonly number[]): number | undefined {
  for (const n of numbers) {
    if (n < 0) {
      return n;
    }
  }
  return undefined;
}
