// 01-q02 型注釈 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-annotation

// 問19
export function canDrive(age: number, hasLicense: boolean): boolean {
  return age >= 18 && hasLicense;
}
