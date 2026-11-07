// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/

// 問2
export function halveUntilOdd(n: number): number {
  if (n === 0) {
    return 0;
  }
  let value = n;
  while (value % 2 === 0) {
    value /= 2;
  }
  return value;
}
