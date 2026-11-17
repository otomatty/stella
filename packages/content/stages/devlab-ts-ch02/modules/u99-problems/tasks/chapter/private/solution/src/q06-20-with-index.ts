// 02-q06 タプル ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/tuple
//       https://typescriptbook.jp/reference/values-types-variables/array/destructuring-assignment-from-array

// 問20
export function withIndex(items: readonly string[]): [number, string][] {
  return items.map((item, i): [number, string] => [i, item]);
}
