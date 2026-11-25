// 問1 絶対値を返す（Math.abs を使わず、if で負なら符号を反転する）
//     例: absValue(-5) → 5
// 引数と戻り値に型注釈を付けます。
export function absValue(n: number): number {
  if (n < 0) {
    return -n;
  }
  return n;
}
