// 02-q04 配列の型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/array/type-annotation-of-array
//       https://typescriptbook.jp/reference/values-types-variables/array/readonly-array
//       https://typescriptbook.jp/reference/values-types-variables/array/how-to-loop-an-array

// 問9
export function containsItem(items: readonly string[], target: string): boolean {
  return items.includes(target);
}
