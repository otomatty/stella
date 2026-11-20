// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property

// 問9
export function nameWithMiddle(name: { first: string; middle?: string; last: string }): string {
  if (name.middle === undefined) {
    return `${name.first} ${name.last}`;
  }
  return `${name.first} ${name.middle} ${name.last}`;
}
