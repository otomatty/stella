// 問11 0以上の整数の、各桁の数字の合計を返す（while 文で10で割っていく）
//     例: digitSum(1234) → 10
// n を let で宣言した変数に写し、その変数を10で割って更新してください。
export function digitSum(n: number): number {
  let rest = n;
  let total = 0;
  while (rest > 0) {
    total += rest % 10;
    rest = Math.floor(rest / 10);
  }
  return total;
}
