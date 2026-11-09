// 01-q02 型注釈 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-annotation

// 問16
export function isBetween(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}
