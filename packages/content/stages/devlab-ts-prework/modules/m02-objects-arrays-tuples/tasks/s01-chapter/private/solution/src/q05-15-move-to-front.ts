// 02-q05 配列を壊さない操作 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/array/array-operations
//       https://typescriptbook.jp/reference/values-types-variables/array/spread-syntax-for-array

// 問15
export function moveToFront(items: readonly string[], index: number): string[] {
  const item = items[index];
  if (item === undefined) {
    return [...items];
  }
  return [item, ...items.filter((_, i) => i !== index)];
}
