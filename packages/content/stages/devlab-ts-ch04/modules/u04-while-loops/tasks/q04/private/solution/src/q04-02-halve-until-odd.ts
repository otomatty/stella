// 問2 偶数のあいだ2で割り続け、奇数になった値を返す（0 は 0 を返す）
//     例: halveUntilOdd(40) → 5
// 引数と戻り値に型注釈を付けます。
// 繰り返しには while 文を使います。
export function halveUntilOdd(n: number): number {
  if (n === 0) {
    return 0;
  }
  let value = n;
  while (value % 2 === 0) {
    value /= 2;
  }
  return value;
}
