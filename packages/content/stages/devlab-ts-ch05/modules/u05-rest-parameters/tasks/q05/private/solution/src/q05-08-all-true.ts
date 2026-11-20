// 05-q05 残余引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/rest-parameters

// 問8
export function allTrue(...flags: boolean[]): boolean {
  return flags.every((flag) => flag);
}
