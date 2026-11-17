// 01-q06 boolean型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/boolean
//       https://typescriptbook.jp/reference/values-types-variables/truthy-falsy-values

// 問17
export function isMultipleOf3Or5(n: number): boolean {
  return n % 3 === 0 || n % 5 === 0;
}
