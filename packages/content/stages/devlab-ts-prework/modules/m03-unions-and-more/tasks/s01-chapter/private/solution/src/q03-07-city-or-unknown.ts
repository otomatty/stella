// 03-q03 null と undefined ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null
//       https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining

// 問7
export function cityOrUnknown(user: { address?: { city: string } }): string {
  return user.address?.city ?? "不明";
}
