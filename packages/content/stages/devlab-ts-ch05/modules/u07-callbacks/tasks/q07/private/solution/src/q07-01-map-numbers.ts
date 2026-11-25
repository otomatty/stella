// 問1 それぞれの要素に fn を当てはめた配列を返す
//     例: mapNumbers([1, 2], (n) => n * 10) → [10, 20]
// 引数と戻り値には型注釈を付けてください。
// コールバックの型は (n: number) => number のように書いてください。
// map、filter、find、some、every、reduce などは使わず、for-of や for で回してコールバックを直接呼んでください。

export function mapNumbers(numbers: readonly number[], fn: (n: number) => number): number[] {
  const result: number[] = [];
  for (const n of numbers) {
    result.push(fn(n));
  }
  return result;
}
