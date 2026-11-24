// 問10 initial から始めて、fn(ここまでの値, 要素) で1つの値にまとめる
//     例: reduceNumbers([1, 2, 3], (acc, n) => acc + n, 0) → 6
// 引数と戻り値には型注釈を付けてください。
// コールバックの型は (n: number) => number のように書いてください。
// map、filter、find、some、every、reduce などは使わず、for-of や for で回してコールバックを直接呼んでください。

export function reduceNumbers(
  numbers: readonly number[],
  fn: (acc: number, n: number) => number,
  initial: number,
): number {
  let acc = initial;
  for (const n of numbers) {
    acc = fn(acc, n);
  }
  return acc;
}
