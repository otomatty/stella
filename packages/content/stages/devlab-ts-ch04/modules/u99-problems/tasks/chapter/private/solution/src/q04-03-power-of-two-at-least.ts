// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/

// 問3
export function powerOfTwoAtLeast(n: number): number {
  let value = 1;
  while (value < n) {
    value *= 2;
  }
  return value;
}
