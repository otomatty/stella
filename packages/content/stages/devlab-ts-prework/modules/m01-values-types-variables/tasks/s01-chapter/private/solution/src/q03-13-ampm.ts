// 01-q03 型推論 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-inference

// 問13
export function ampm(hour: number) {
  return hour < 12 ? "午前" : "午後";
}
