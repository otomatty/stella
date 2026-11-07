// 04-q03 for文と for-of文 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/for-of
//       https://jsprimer.net/basic/loop/

// 問4
export function indexOfMax(numbers: readonly number[]): number {
  let best = -1;
  for (let i = 0; i < numbers.length; i++) {
    const n = numbers[i];
    const current = numbers[best];
    if (n !== undefined && (current === undefined || n > current)) {
      best = i;
    }
  }
  return best;
}
