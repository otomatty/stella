// 05-q05 残余引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/rest-parameters

// 問9
export function anyTrue(...flags: boolean[]): boolean {
  return flags.some((flag) => flag);
}
