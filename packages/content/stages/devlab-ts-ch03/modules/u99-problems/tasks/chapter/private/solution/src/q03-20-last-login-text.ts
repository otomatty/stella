// 03-q03 null と undefined ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null
//       https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining

// 問20
export function lastLoginText(user: { lastLoginAt: Date | null }): string {
  return user.lastLoginAt?.toISOString().slice(0, 10) ?? "未ログイン";
}
