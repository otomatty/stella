// 問14 平均を返す。空の配列なら 0
//     例: averageOf([2, 4, 9]) → 5
// 引数と戻り値には型注釈を付けます。
// 合計は for-of で求められます。
export function averageOf(numbers: readonly number[]): number {
  if (numbers.length === 0) {
    return 0;
  }
  let total = 0;
  for (const n of numbers) {
    total += n;
  }
  return total / numbers.length;
}
