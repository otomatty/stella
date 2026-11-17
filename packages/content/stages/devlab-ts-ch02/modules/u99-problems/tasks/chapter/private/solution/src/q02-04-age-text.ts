// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property

// 問4
export function ageText(person: { age?: number }): string {
  return person.age === undefined ? "年齢不明" : `${person.age}歳`;
}
