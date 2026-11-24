// 問9 2つの正の整数の最小公倍数を返す（a の倍数を順に調べ、b で割り切れたら止める）
//     例: lcm(4, 6) → 12
// 引数と戻り値に型注釈を付けます。
// 繰り返しには while 文を使います。
export function lcm(a: number, b: number): number {
  let value = a;
  while (value % b !== 0) {
    value += a;
  }
  return value;
}
