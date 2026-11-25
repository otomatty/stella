// 問17 配列をスプレッド構文で Math.max に渡して、最大値を返す。空の配列なら Error を投げる
//     例: maxOfArray([3, 9, 2]) → 9
// 引数と戻り値には型注釈を付けてください。

export function maxOfArray(numbers: readonly number[]): number {
  if (numbers.length === 0) {
    throw new Error("空の配列です");
  }
  return Math.max(...numbers);
}
