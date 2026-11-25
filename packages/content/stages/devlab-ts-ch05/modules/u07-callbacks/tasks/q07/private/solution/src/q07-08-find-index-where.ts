// 問8 predicate が true になる最初の要素の番号。なければ -1
//     例: findIndexWhere(["a", "bb"], (s) => s.length === 2) → 1
// 引数と戻り値には型注釈を付けてください。
// コールバックの型は (n: number) => number のように書いてください。
// map、filter、find、some、every、reduce などは使わず、for-of や for で回してコールバックを直接呼んでください。

export function findIndexWhere(
  items: readonly string[],
  predicate: (s: string) => boolean,
): number {
  for (const [index, item] of items.entries()) {
    if (predicate(item)) {
      return index;
    }
  }
  return -1;
}
