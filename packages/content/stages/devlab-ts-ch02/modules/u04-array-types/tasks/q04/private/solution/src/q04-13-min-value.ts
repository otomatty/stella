// 問13 最小値を返す。空の配列なら Error を投げる
//     例: minValue([3, 9, 2]) → 2
// 引数と戻り値には型注釈を付けます。
export function minValue(numbers: readonly number[]): number {
  if (numbers.length === 0) {
    throw new Error("空の配列です");
  }
  return Math.min(...numbers);
}
