// 問9 60点以上なら "合格"、それ未満なら "不合格" を返す（戻り値は "合格" | "不合格" に推論される）
//     例: judge(60) → "合格"
// 戻り値の型は推論に任せてください。
export function judge(score: number) {
  return score >= 60 ? "合格" : "不合格";
}
