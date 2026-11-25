// 問17 predicate が true の要素と false の要素に分け、[true の配列, false の配列] を返す
//     例: splitBy([1, 2, 3], (n) => n > 1) → [[2, 3], [1]]
// 引数と戻り値には型注釈を付けてください。
// コールバックの型は (n: number) => number のように書いてください。
// map、filter、find、some、every、reduce などは使わず、for-of や for で回してコールバックを直接呼んでください。

export function splitBy(
  numbers: readonly number[],
  predicate: (n: number) => boolean,
): [number[], number[]] {
  const yes: number[] = [];
  const no: number[] = [];
  for (const n of numbers) {
    if (predicate(n)) {
      yes.push(n);
    } else {
      no.push(n);
    }
  }
  return [yes, no];
}
