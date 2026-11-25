// 問2 predicate が true の要素だけを集める
//     例: filterNumbers([1, 2, 3, 4], (n) => n % 2 === 0) → [2, 4]
// 引数と戻り値には型注釈を付けてください。
// コールバックの型は (n: number) => number のように書いてください。
// map、filter、find、some、every、reduce などは使わず、for-of や for で回してコールバックを直接呼んでください。

export function filterNumbers(
  numbers: readonly number[],
  predicate: (n: number) => boolean,
): number[] {
  const result: number[] = [];
  for (const n of numbers) {
    if (predicate(n)) {
      result.push(n);
    }
  }
  return result;
}
