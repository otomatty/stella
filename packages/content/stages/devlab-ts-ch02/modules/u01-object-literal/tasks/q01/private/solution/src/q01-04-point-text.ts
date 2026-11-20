// 02-q01 オブジェクトの型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/type-annotation-of-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/shorthand-property-names

// 問4
export function pointText(point: { x: number; y: number }): string {
  return `(${point.x}, ${point.y})`;
}
