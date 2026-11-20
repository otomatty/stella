// 01-q05 string型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/string

// 問18
export function removeVowels(text: string): string {
  return text.replace(/[aeiou]/g, "");
}
