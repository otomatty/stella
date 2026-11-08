// 04-q03 for文と for-of文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/for-of
//       https://jsprimer.net/basic/loop/

// 問15
export function runningTotal(numbers: readonly number[]): number[] {
  const result: number[] = [];
  let total = 0;
  for (const n of numbers) {
    total += n;
    result.push(total);
  }
  return result;
}
