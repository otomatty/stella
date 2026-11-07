// 02-q05 配列を壊さない操作 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/array/array-operations
//       https://typescriptbook.jp/reference/values-types-variables/array/spread-syntax-for-array

// 問16
export function swapItems(items: readonly string[], i: number, j: number): string[] {
  const a = items[i];
  const b = items[j];
  if (a === undefined || b === undefined) {
    throw new Error("範囲外です");
  }
  const copied = [...items];
  copied[i] = b;
  copied[j] = a;
  return copied;
}
