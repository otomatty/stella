// 02-q01 オブジェクトの型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/type-annotation-of-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/shorthand-property-names

// 問12
export function fullNameOf(person: { firstName: string; lastName: string }): string {
  return `${person.lastName} ${person.firstName}`;
}
