// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property

// 問3
export function emailText(user: { email?: string }): string {
  return user.email ?? "（未登録）";
}
