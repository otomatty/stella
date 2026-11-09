// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/

// 問10
export function sumSkipThrees(n: number): number {
  let total = 0;
  let i = 0;
  while (i < n) {
    i++;
    if (i % 3 === 0) {
      continue;
    }
    total += i;
  }
  return total;
}
