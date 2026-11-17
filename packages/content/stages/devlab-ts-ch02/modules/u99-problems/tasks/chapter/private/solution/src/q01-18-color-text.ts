// 02-q01 オブジェクトの型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/type-annotation-of-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/shorthand-property-names

// 問18
export function colorText(color: { r: number; g: number; b: number }): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}
