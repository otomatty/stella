// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/

// 問5
export function maxCountWithin(limit: number): number {
  let k = 0;
  let total = 0;
  while (total + (k + 1) <= limit) {
    k++;
    total += k;
  }
  return k;
}
