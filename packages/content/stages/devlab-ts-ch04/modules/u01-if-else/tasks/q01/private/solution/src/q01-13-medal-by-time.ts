// 問13 タイム（秒）が 60 未満なら "金"、90 未満なら "銀"、120 未満なら "銅"、それ以外は "参加賞"
//     例: medalByTime(75) → "銀"
// 引数と戻り値に型注釈を付けます。
// if-else 文で分けます。短い場合は三項演算子でも構いません。
export function medalByTime(seconds: number): "金" | "銀" | "銅" | "参加賞" {
  if (seconds < 60) {
    return "金";
  }
  if (seconds < 90) {
    return "銀";
  }
  if (seconds < 120) {
    return "銅";
  }
  return "参加賞";
}
