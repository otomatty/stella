// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/

// 問15
export function bitLength(n: number): number {
  let rest = n;
  let count = 0;
  do {
    rest = Math.floor(rest / 2);
    count++;
  } while (rest > 0);
  return count;
}
