// 02-q05 配列を壊さない操作 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/array/array-operations
//       https://typescriptbook.jp/reference/values-types-variables/array/spread-syntax-for-array

// 問7
export function replaceAt(items: readonly string[], index: number, item: string): string[] {
  return items.map((value, i) => (i === index ? item : value));
}
