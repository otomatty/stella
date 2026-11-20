// 03-q03 null と undefined ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null
//       https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining

// 問6
export function cityOf(user: { address?: { city: string } }): string | undefined {
  return user.address?.city;
}
