// 05-q05 残余引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/rest-parameters

// 問15
export function countOf(target: string, ...items: string[]): number {
  return items.filter((item) => item === target).length;
}
