// 問8 base の exponent 乗を返す（** や Math.pow を使わず、for 文で掛けていく）
//     例: power(2, 10) → 1024
export function power(base: number, exponent: number): number {
  let result = 1;
  for (let i = 0; i < exponent; i++) {
    result *= base;
  }
  return result;
}
