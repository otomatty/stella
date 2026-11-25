// 問3 最初の要素を返す。空の配列なら 0
//     例: firstOrZero([5, 6]) → 5
// 引数と戻り値には型注釈を付けます。
export function firstOrZero(numbers: readonly number[]): number {
  return numbers[0] ?? 0;
}
