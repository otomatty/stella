// 02-q01 オブジェクトの型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/type-annotation-of-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/shorthand-property-names

// 問16
export function scoreTotal(score: { math: number; english: number; science: number }): number {
  return score.math + score.english + score.science;
}
