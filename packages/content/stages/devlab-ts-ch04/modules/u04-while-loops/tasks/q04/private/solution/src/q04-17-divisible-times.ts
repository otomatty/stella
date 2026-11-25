// 問17 n を d で割り切れなくなるまで割ったとき、割れた回数を返す（d は 2 以上）
//     例: divisibleTimes(48, 2) → 4
// 引数と戻り値に型注釈を付けます。
// 繰り返しには while 文を使います。
export function divisibleTimes(n: number, d: number): number {
  let value = n;
  let count = 0;
  while (value !== 0 && value % d === 0) {
    value /= d;
    count++;
  }
  return count;
}
