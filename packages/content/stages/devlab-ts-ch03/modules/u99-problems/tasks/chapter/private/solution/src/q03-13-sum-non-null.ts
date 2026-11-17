// 03-q03 null と undefined ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null
//       https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining

// 問13
export function sumNonNull(values: readonly (number | null)[]): number {
  let total = 0;
  for (const value of values) {
    if (value !== null) {
      total += value;
    }
  }
  return total;
}
