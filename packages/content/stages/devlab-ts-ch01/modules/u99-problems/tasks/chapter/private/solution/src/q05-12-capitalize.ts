// 01-q05 string型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/string

// 問12
export function capitalize(text: string): string {
  return `${text.slice(0, 1).toUpperCase()}${text.slice(1)}`;
}
