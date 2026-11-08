// 01-q06 boolean型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/boolean
//       https://typescriptbook.jp/reference/values-types-variables/truthy-falsy-values

// 問14
export function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /\d/.test(password) && /[A-Z]/.test(password);
}
