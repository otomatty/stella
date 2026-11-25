// 問3 60点以上なら "合格"、それ未満は "不合格"
//     例: passFail(60) → "合格"
// 引数と戻り値に型注釈を付けます。
// if-else 文で分けます。短い場合は三項演算子でも構いません。
export function passFail(score: number): "合格" | "不合格" {
  return score >= 60 ? "合格" : "不合格";
}
