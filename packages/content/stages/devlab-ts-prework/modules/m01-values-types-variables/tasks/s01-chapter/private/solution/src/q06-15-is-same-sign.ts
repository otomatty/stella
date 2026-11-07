// 01-q06 boolean型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/boolean
//       https://typescriptbook.jp/reference/values-types-variables/truthy-falsy-values

// 問15
export function isSameSign(a: number, b: number): boolean {
  return (a > 0 && b > 0) || (a < 0 && b < 0);
}
