// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property

// 問10
export function isComplete(profile: { name?: string; email?: string }): boolean {
  return profile.name !== undefined && profile.email !== undefined;
}
