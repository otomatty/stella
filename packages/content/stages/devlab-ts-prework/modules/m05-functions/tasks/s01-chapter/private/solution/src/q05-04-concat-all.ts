// 05-q05 残余引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/rest-parameters

// 問4
export function concatAll(...texts: string[]): string {
  return texts.join("");
}
