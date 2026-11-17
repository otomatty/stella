// 03-q03 null と undefined ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null
//       https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining

// 問12
export function countPresent(values: readonly (string | undefined)[]): number {
  return values.filter((value) => value !== undefined).length;
}
