// 問10 1〜n の合計を返す。ただし3の倍数は飛ばす（continue）
//     例: sumSkipThrees(6) → 12
// 引数と戻り値に型注釈を付けます。
// 繰り返しには while 文を使います。
export function sumSkipThrees(n: number): number {
  let total = 0;
  let i = 0;
  while (i < n) {
    i++;
    if (i % 3 === 0) {
      continue;
    }
    total += i;
  }
  return total;
}
