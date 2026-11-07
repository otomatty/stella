// 02-q04 配列の型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/array/type-annotation-of-array
//       https://typescriptbook.jp/reference/values-types-variables/array/readonly-array
//       https://typescriptbook.jp/reference/values-types-variables/array/how-to-loop-an-array

// 問12
export function maxValue(numbers: readonly number[]): number {
  if (numbers.length === 0) {
    throw new Error("空の配列です");
  }
  return Math.max(...numbers);
}
