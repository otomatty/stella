// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/

// 問18
export function sumPositives(numbers: readonly number[]): number {
  let total = 0;
  for (const n of numbers) {
    if (n <= 0) {
      continue;
    }
    total += n;
  }
  return total;
}
