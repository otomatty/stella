// 問14 各桁を足すことを、1桁になるまで繰り返した値を返す
//     例: digitalRoot(9875) → 2
// 引数と戻り値に型注釈を付けます。
// 繰り返しには while 文を使います。
export function digitalRoot(n: number): number {
  let value = n;
  while (value >= 10) {
    let sum = 0;
    let rest = value;
    while (rest > 0) {
      sum += rest % 10;
      rest = Math.floor(rest / 10);
    }
    value = sum;
  }
  return value;
}
