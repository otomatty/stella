// 問11 limit より大きい最初の要素の番号を返す（見つかったら break）。なければ -1
//     例: firstIndexOver([1, 5, 10], 4) → 1
// 引数と戻り値に型注釈を付けます。
// 繰り返しには while 文を使います。
export function firstIndexOver(numbers: readonly number[], limit: number): number {
  let found = -1;
  let i = 0;
  while (i < numbers.length) {
    if ((numbers[i] ?? -Infinity) > limit) {
      found = i;
      break;
    }
    i++;
  }
  return found;
}
