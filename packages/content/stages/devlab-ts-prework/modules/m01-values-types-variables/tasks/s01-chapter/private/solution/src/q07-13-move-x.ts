// 01-q07 リテラル型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types

// 問13
export function moveX(x: number, direction: "left" | "right"): number {
  return direction === "left" ? x - 1 : x + 1;
}
