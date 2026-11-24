// 問8 正なら "plus"、負なら "minus"、0 なら "zero" を返す（戻り値は "plus" | "minus" | "zero" に推論される）
//     例: sign(-3) → "minus"
// 戻り値の型は推論に任せてください。
export function sign(n: number) {
  if (n > 0) {
    return "plus";
  }
  if (n < 0) {
    return "minus";
  }
  return "zero";
}
