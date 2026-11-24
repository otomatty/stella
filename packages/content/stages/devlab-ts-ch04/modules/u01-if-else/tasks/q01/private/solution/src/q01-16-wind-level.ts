// 問16 風速が 5 未満なら "弱い"、10 未満なら "やや強い"、それ以上は "強い"
//     例: windLevel(7) → "やや強い"
// 引数と戻り値に型注釈を付けます。
// if-else 文で分けます。短い場合は三項演算子でも構いません。
export function windLevel(speed: number): "弱い" | "やや強い" | "強い" {
  if (speed < 5) {
    return "弱い";
  }
  if (speed < 10) {
    return "やや強い";
  }
  return "強い";
}
