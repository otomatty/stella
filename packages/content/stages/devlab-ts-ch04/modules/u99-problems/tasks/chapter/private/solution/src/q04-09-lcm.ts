// 04-q04 while文と break・continue ドリル
//
// 教材: https://jsprimer.net/basic/loop/

// 問9
export function lcm(a: number, b: number): number {
  let value = a;
  while (value % b !== 0) {
    value += a;
  }
  return value;
}
