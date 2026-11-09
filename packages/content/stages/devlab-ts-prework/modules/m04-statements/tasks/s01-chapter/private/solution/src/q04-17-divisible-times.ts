// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/

// 問17
export function divisibleTimes(n: number, d: number): number {
  let value = n;
  let count = 0;
  while (value !== 0 && value % d === 0) {
    value /= d;
    count++;
  }
  return count;
}
