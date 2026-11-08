// 05-q02 引数と戻り値の型、void ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/function-parameters
//       https://typescriptbook.jp/reference/functions/void-type
//       https://typescriptbook.jp/reference/functions/pass-by-value

// 問13
export function sumAndAverage(numbers: readonly number[]): { sum: number; average: number } {
  let sum = 0;
  for (const n of numbers) {
    sum += n;
  }
  return { sum, average: numbers.length === 0 ? 0 : sum / numbers.length };
}
