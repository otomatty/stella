// 問4 0 になるまでの手順の数を返す。偶数なら2で割り、奇数なら1を引く
//     例: stepsToZero(14) → 6
// 引数と戻り値に型注釈を付けます。
// 繰り返しには while 文を使います。
export function stepsToZero(n: number): number {
  let value = n;
  let steps = 0;
  while (value > 0) {
    value = value % 2 === 0 ? value / 2 : value - 1;
    steps++;
  }
  return steps;
}
