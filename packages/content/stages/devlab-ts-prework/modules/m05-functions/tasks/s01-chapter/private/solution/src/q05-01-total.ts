// 05-q05 残余引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/rest-parameters

// 問1
export function total(...numbers: number[]): number {
  let sum = 0;
  for (const n of numbers) {
    sum += n;
  }
  return sum;
}
