// 02-q03 分割代入とスプレッド構文 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/destructuring-assignment-from-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/spread-syntax-for-object

// 問19
export function combine(a: { x: number }, b: { y: number }): { x: number; y: number } {
  return { ...a, ...b };
}
