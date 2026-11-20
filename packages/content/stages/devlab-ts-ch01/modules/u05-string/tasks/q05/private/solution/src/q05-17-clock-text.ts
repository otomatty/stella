// 01-q05 string型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/string

// 問17
export function clockText(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
