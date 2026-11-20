// 02-q05 配列を壊さない操作 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/array/array-operations
//       https://typescriptbook.jp/reference/values-types-variables/array/spread-syntax-for-array

// 問6
export function removeAt(items: readonly string[], index: number): string[] {
  return items.filter((_, i) => i !== index);
}
