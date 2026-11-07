// 02-q01 オブジェクトの型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/type-annotation-of-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/shorthand-property-names

// 問14
export function measureText(measure: { value: number; unit: string }): string {
  return `${measure.value}${measure.unit}`;
}
