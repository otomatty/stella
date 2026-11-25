// 問1 合計を返す。空の配列なら 0
//     例: sumAll([1, 2, 3]) → 6
// 引数と戻り値には型注釈を付けます。
// 合計は for-of で求められます。
export function sumAll(numbers: readonly number[]): number {
  let total = 0;
  for (const n of numbers) {
    total += n;
  }
  return total;
}
