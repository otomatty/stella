// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/

// 問20
export function digitsOf(n: number): number[] {
  const digits: number[] = [];
  let rest = n;
  do {
    digits.unshift(rest % 10);
    rest = Math.floor(rest / 10);
  } while (rest > 0);
  return digits;
}
