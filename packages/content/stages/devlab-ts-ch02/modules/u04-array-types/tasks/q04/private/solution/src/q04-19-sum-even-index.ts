// 問19 0番目、2番目、4番目…の要素だけを合計する
//     例: sumEvenIndex([1, 2, 3, 4, 5]) → 9
// 引数と戻り値には型注釈を付けます。
// 要素とその位置を順に見るには forEach が使えます。
export function sumEvenIndex(numbers: readonly number[]): number {
  let total = 0;
  numbers.forEach((n, i) => {
    if (i % 2 === 0) {
      total += n;
    }
  });
  return total;
}
