// 03-q03 null と undefined ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null
//       https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining

// 問18
export function bothPresent(a: string | null, b: string | null): boolean {
  return a !== null && b !== null;
}
