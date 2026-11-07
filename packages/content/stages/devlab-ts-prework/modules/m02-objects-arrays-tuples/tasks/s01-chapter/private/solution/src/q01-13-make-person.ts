// 02-q01 オブジェクトの型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/type-annotation-of-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/shorthand-property-names

// 問13
export function makePerson(
  firstName: string,
  lastName: string,
): { firstName: string; lastName: string } {
  return { firstName, lastName };
}
