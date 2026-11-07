// 01-q07 リテラル型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types

// 問16
export function seasonOf(month: number): "春" | "夏" | "秋" | "冬" {
  if (month >= 3 && month <= 5) {
    return "春";
  }
  if (month >= 6 && month <= 8) {
    return "夏";
  }
  if (month >= 9 && month <= 11) {
    return "秋";
  }
  return "冬";
}
