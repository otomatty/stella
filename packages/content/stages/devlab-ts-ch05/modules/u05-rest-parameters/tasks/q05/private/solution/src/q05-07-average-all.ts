// 05-q05 残余引数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/rest-parameters

// 問7
export function averageAll(...numbers: number[]): number {
  if (numbers.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const n of numbers) {
    sum += n;
  }
  return sum / numbers.length;
}
