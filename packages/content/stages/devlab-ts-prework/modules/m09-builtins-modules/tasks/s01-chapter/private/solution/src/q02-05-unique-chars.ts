// 09-q02 Set ドリル
//
// 教材: https://typescriptbook.jp/reference/builtin-api/set

// 問5
export function uniqueChars(text: string): string {
  return [...new Set(text)].join("");
}
