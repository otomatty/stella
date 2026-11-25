// 問17 n が1になるまでの手順の数を返す。偶数なら2で割り、奇数なら3倍して1を足す
//     例: collatzSteps(6) → 8
// n を let で宣言した変数に写し、その変数を更新してください。
export function collatzSteps(n: number): number {
  let current = n;
  let steps = 0;
  while (current !== 1) {
    current = current % 2 === 0 ? current / 2 : current * 3 + 1;
    steps++;
  }
  return steps;
}
