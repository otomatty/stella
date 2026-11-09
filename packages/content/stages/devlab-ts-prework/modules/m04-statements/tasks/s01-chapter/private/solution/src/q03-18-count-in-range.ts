// 04-q03 for文と for-of文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/for-of
//       https://jsprimer.net/basic/loop/

// 問18
export function countInRange(numbers: readonly number[], min: number, max: number): number {
  let count = 0;
  for (const n of numbers) {
    if (n >= min && n <= max) {
      count++;
    }
  }
  return count;
}
