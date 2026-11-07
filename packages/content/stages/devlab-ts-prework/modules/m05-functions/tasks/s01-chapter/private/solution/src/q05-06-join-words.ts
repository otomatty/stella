// 05-q05 残余引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/rest-parameters

// 問6
export function joinWords(separator: string, ...words: string[]): string {
  return words.join(separator);
}
