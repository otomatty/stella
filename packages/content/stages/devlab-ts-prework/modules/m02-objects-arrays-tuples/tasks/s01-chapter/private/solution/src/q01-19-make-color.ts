// 02-q01 オブジェクトの型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/type-annotation-of-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/shorthand-property-names

// 問19
export function makeColor(r: number, g: number, b: number): { r: number; g: number; b: number } {
  return { r, g, b };
}
