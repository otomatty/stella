// 問14 3つの数の最大値を返す（Math.max を使わず、if 文で比べる）
//     例: maxOf3(3, 9, 2) → 9
export function maxOf3(a: number, b: number, c: number): number {
  let max = a;
  if (b > max) {
    max = b;
  }
  if (c > max) {
    max = c;
  }
  return max;
}
