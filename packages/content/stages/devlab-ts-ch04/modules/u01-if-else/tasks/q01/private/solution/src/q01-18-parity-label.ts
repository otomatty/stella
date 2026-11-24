// 問18 偶数なら "偶数"、奇数なら "奇数"（三項演算子で書く）
//     例: parityLabel(7) → "奇数"
// 引数と戻り値に型注釈を付けます。
export function parityLabel(n: number): "偶数" | "奇数" {
  return n % 2 === 0 ? "偶数" : "奇数";
}
