// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/

// 問4
export function stepsToZero(n: number): number {
  let value = n;
  let steps = 0;
  while (value > 0) {
    value = value % 2 === 0 ? value / 2 : value - 1;
    steps++;
  }
  return steps;
}
