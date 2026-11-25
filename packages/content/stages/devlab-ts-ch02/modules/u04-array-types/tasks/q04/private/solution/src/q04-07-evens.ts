// 問7 偶数だけを集めた配列を返す
//     例: evens([1, 2, 3, 4]) → [2, 4]
// 引数と戻り値には型注釈を付けます。
// 条件を満たす要素を選ぶには filter が使えます。
export function evens(numbers: readonly number[]): number[] {
  return numbers.filter((n) => n % 2 === 0);
}
