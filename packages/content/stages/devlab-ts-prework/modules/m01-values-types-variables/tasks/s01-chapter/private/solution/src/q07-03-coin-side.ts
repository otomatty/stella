// 01-q07 リテラル型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types

// 問3
export function coinSide(n: number): "表" | "裏" {
  return n % 2 === 0 ? "表" : "裏";
}
