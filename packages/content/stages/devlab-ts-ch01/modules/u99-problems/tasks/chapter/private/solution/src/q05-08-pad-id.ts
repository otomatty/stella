// 01-q05 string型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/string

// 問8
export function padId(id: number): string {
  return String(id).padStart(4, "0");
}
