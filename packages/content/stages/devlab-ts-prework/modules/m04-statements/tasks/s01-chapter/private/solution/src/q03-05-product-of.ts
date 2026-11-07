// 04-q03 for文と for-of文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/for-of
//       https://jsprimer.net/basic/loop/

// 問5
export function productOf(numbers: readonly number[]): number {
  let result = 1;
  for (const n of numbers) {
    result *= n;
  }
  return result;
}
