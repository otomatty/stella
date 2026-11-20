// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property

// 問18
export function isGuest(user: { name: string; memberId?: number }): boolean {
  return user.memberId === undefined;
}
