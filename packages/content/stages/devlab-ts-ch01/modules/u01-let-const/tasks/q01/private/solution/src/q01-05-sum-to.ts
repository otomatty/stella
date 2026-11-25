// 問5 1から n までの合計を返す（for 文で足していく）
//     例: sumTo(10) → 55
export function sumTo(n: number): number {
  let total = 0;
  for (let i = 1; i <= n; i++) {
    total += i;
  }
  return total;
}
