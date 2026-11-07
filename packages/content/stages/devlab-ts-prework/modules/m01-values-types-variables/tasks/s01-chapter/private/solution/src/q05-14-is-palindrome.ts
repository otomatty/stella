// 01-q05 string型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/string

// 問14
export function isPalindrome(text: string): boolean {
  let reversed = "";
  for (const c of text) {
    reversed = c + reversed;
  }
  return text === reversed;
}
