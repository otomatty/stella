// 01-q06 boolean型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/boolean
//       https://typescriptbook.jp/reference/values-types-variables/truthy-falsy-values

// 問19
export function isValidName(name: string, max: number): boolean {
  return name.length > 0 && name.length <= max;
}
