// 02-q06 タプル ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/tuple
//       https://typescriptbook.jp/reference/values-types-variables/array/destructuring-assignment-from-array

// 問11
export function divmod(a: number, b: number): [number, number] {
  return [Math.floor(a / b), a % b];
}
