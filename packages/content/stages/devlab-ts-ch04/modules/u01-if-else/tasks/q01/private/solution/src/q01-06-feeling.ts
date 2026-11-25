// 問6 気温が 15 未満なら "寒い"、28 以上なら "暑い"、それ以外は "ちょうどよい"
//     例: feeling(30) → "暑い"
// 引数と戻り値に型注釈を付けます。
// if-else 文で分けます。短い場合は三項演算子でも構いません。
export function feeling(celsius: number): "寒い" | "ちょうどよい" | "暑い" {
  if (celsius < 15) {
    return "寒い";
  }
  if (celsius >= 28) {
    return "暑い";
  }
  return "ちょうどよい";
}
