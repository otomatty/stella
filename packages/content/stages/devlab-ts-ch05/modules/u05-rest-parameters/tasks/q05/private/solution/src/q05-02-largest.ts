// 05-q05 残余引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/rest-parameters

// 問2
export function largest(first: number, ...rest: number[]): number {
  return Math.max(first, ...rest);
}
