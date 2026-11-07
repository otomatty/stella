// 02-q05 配列を壊さない操作 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/array/array-operations
//       https://typescriptbook.jp/reference/values-types-variables/array/spread-syntax-for-array

// 問17
export function take(numbers: readonly number[], n: number): number[] {
  return numbers.slice(0, n);
}
