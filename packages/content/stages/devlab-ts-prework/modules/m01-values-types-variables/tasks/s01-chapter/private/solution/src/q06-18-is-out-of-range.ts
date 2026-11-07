// 01-q06 boolean型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/boolean
//       https://typescriptbook.jp/reference/values-types-variables/truthy-falsy-values

// 問18
export function isOutOfRange(value: number, min: number, max: number): boolean {
  return value < min || value > max;
}
