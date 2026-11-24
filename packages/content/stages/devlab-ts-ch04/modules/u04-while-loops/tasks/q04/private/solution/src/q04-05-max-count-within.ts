// 問5 1 + 2 + … + k が limit 以下になる、いちばん大きい k を返す
//     例: maxCountWithin(10) → 4
// 引数と戻り値に型注釈を付けます。
// 繰り返しには while 文を使います。
export function maxCountWithin(limit: number): number {
  let k = 0;
  let total = 0;
  while (total + (k + 1) <= limit) {
    k++;
    total += k;
  }
  return k;
}
