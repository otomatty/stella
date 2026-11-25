// 問7 正なら "正"、負なら "負"、0 なら "ゼロ"
//     例: signText(-2) → "負"
// 引数と戻り値に型注釈を付けます。
// if-else 文で分けます。短い場合は三項演算子でも構いません。
export function signText(n: number): "正" | "負" | "ゼロ" {
  if (n > 0) {
    return "正";
  }
  if (n < 0) {
    return "負";
  }
  return "ゼロ";
}
