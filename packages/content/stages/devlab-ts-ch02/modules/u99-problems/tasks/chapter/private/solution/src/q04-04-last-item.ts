// 02-q04 配列の型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/array/type-annotation-of-array
//       https://typescriptbook.jp/reference/values-types-variables/array/readonly-array
//       https://typescriptbook.jp/reference/values-types-variables/array/how-to-loop-an-array

// 問4
export function lastItem(items: readonly string[]): string | undefined {
  return items[items.length - 1];
}
