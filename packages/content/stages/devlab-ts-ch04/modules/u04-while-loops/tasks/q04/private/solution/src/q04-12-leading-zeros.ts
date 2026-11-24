// 問12 先頭に続く「0」の数を返す
//     例: leadingZeros("000120") → 3
// 引数と戻り値に型注釈を付けます。
// 繰り返しには while 文を使います。
export function leadingZeros(text: string): number {
  let count = 0;
  while (text[count] === "0") {
    count++;
  }
  return count;
}
