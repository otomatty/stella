// 02-q02 オプションプロパティと readonly ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property

// 問1
export function greetUser(user: { name: string; nickname?: string }): string {
  return `こんにちは、${user.nickname ?? user.name}さん`;
}
