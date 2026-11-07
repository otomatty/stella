// 02-q05 配列を壊さない操作 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/array/array-operations
//       https://typescriptbook.jp/reference/values-types-variables/array/spread-syntax-for-array

// 問4
export function dropLast(items: readonly string[]): string[] {
  return items.slice(0, -1);
}
