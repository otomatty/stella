// 05-q05 残余引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/rest-parameters

// 問11
export function multiplyAll(...numbers: number[]): number {
  let result = 1;
  for (const n of numbers) {
    result *= n;
  }
  return result;
}
