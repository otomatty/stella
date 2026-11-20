// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/

// 問14
export function digitalRoot(n: number): number {
  let value = n;
  while (value >= 10) {
    let sum = 0;
    let rest = value;
    while (rest > 0) {
      sum += rest % 10;
      rest = Math.floor(rest / 10);
    }
    value = sum;
  }
  return value;
}
