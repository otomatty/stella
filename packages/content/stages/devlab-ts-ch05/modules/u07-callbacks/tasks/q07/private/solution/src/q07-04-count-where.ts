// 問4 predicate が true の要素の数
//     例: countWhere(["a", "bb"], (s) => s.length > 1) → 1
// 引数と戻り値には型注釈を付けてください。
// コールバックの型は (n: number) => number のように書いてください。
// map、filter、find、some、every、reduce などは使わず、for-of や for で回してコールバックを直接呼んでください。

export function countWhere(items: readonly string[], predicate: (s: string) => boolean): number {
  let count = 0;
  for (const item of items) {
    if (predicate(item)) {
      count++;
    }
  }
  return count;
}
