// 02-q01 オブジェクトの型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/type-annotation-of-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/shorthand-property-names

// 問17
export function makeScore(
  math: number,
  english: number,
  science: number,
): { math: number; english: number; science: number } {
  return { math, english, science };
}
