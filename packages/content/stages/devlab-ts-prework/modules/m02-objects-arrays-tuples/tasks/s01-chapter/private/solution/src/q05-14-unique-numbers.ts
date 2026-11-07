// 02-q05 配列を壊さない操作 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/array/array-operations
//       https://typescriptbook.jp/reference/values-types-variables/array/spread-syntax-for-array

// 問14
export function uniqueNumbers(numbers: readonly number[]): number[] {
  return numbers.filter((n, i) => numbers.indexOf(n) === i);
}
