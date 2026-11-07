// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/

// 問6
export function reverseNumber(n: number): number {
  let rest = n;
  let result = 0;
  while (rest > 0) {
    result = result * 10 + (rest % 10);
    rest = Math.floor(rest / 10);
  }
  return result;
}
