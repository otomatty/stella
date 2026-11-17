// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/

// 問1
export function countDigits(n: number): number {
  let rest = n;
  let count = 0;
  while (rest > 0) {
    rest = Math.floor(rest / 10);
    count++;
  }
  return count;
}
