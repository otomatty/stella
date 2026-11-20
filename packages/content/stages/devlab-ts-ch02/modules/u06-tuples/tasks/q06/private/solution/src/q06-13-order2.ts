// 02-q06 タプル ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/tuple
//       https://typescriptbook.jp/reference/values-types-variables/array/destructuring-assignment-from-array

// 問13
export function order2(a: number, b: number): [number, number] {
  return a <= b ? [a, b] : [b, a];
}
