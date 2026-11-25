// 問16 0より大きい要素の数を返す
//     例: countPositive([3, -1, 0, 5]) → 2
// 引数と戻り値には型注釈を付けます。
// 条件を満たす要素を選ぶには filter が使えます。
export function countPositive(numbers: readonly number[]): number {
  return numbers.filter((n) => n > 0).length;
}
