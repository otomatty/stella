// 問6 0以上の整数の桁を逆に並べた数を返す（文字列にしない）
//     例: reverseNumber(1230) → 321
// 引数と戻り値に型注釈を付けます。
// 繰り返しには while 文を使います。
export function reverseNumber(n: number): number {
  let rest = n;
  let result = 0;
  while (rest > 0) {
    result = result * 10 + (rest % 10);
    rest = Math.floor(rest / 10);
  }
  return result;
}
