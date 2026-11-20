// 02-q06 タプル ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/tuple
//       https://typescriptbook.jp/reference/values-types-variables/array/destructuring-assignment-from-array

// 問14
export function headTail(items: readonly string[]): [string | undefined, string[]] {
  return [items[0], items.slice(1)];
}
