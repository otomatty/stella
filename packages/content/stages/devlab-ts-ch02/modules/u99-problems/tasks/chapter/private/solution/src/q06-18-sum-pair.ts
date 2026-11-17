// 02-q06 タプル ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/tuple
//       https://typescriptbook.jp/reference/values-types-variables/array/destructuring-assignment-from-array

// 問18
export function sumPair([a, b]: [number, number]): number {
  return a + b;
}
