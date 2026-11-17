// 04-q03 for文と for-of文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/for-of
//       https://jsprimer.net/basic/loop/

// 問14
export function allEven(numbers: readonly number[]): boolean {
  for (const n of numbers) {
    if (n % 2 !== 0) {
      return false;
    }
  }
  return true;
}
