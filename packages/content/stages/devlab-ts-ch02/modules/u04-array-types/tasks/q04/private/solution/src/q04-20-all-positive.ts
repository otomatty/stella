// 問20 すべての要素が0より大きければ true（every を使う）
//     例: allPositive([1, 2, 3]) → true
// 引数と戻り値には型注釈を付けます。
export function allPositive(numbers: readonly number[]): boolean {
  return numbers.every((n) => n > 0);
}
