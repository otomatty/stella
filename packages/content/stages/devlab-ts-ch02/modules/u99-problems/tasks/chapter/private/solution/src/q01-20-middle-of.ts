// 02-q01 オブジェクトの型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/type-annotation-of-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/shorthand-property-names

// 問20
export function middleOf(range: { start: number; end: number }): number {
  return (range.start + range.end) / 2;
}
