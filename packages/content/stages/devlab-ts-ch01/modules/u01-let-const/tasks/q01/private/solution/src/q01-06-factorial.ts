// 問6 n の階乗（1 × 2 × … × n）を返す。0 の階乗は 1
//     例: factorial(5) → 120
export function factorial(n: number): number {
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}
