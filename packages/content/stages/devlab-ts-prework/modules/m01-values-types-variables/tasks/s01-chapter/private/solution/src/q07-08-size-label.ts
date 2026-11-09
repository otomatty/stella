// 01-q07 リテラル型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types

// 問8
export function sizeLabel(size: "S" | "M" | "L"): "小" | "中" | "大" {
  if (size === "S") {
    return "小";
  }
  if (size === "M") {
    return "中";
  }
  return "大";
}
