// 01-q07 リテラル型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types

// 問11
export function priorityLabel(level: 1 | 2 | 3): "高" | "中" | "低" {
  if (level === 1) {
    return "高";
  }
  if (level === 2) {
    return "中";
  }
  return "低";
}
