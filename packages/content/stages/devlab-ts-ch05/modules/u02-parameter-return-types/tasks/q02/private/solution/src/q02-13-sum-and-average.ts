// 問13 合計と平均を { sum, average } で返す。空の配列なら両方 0
//     例: sumAndAverage([1, 2, 3]) → { sum: 6, average: 2 }
// 引数と戻り値には型注釈を付けてください。

export function sumAndAverage(numbers: readonly number[]): { sum: number; average: number } {
  let sum = 0;
  for (const n of numbers) {
    sum += n;
  }
  return { sum, average: numbers.length === 0 ? 0 : sum / numbers.length };
}
