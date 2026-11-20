// 05-q05 残余引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/rest-parameters

// 問5
export function countArgs(...args: unknown[]): number {
  return args.length;
}
