// 01-q05 string型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/string

// 問15
export function maskPhone(phone: string): string {
  return `${phone.slice(0, 4)}****${phone.slice(8)}`;
}
