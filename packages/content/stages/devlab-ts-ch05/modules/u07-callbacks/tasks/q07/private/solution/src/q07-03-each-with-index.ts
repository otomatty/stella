// 問3 それぞれの要素と番号を fn に渡して呼ぶ。何も返さない
//     例: eachWithIndex(["a", "b"], fn) → fn("a", 0)、fn("b", 1) の順に呼ぶ
// 引数と戻り値には型注釈を付けてください。
// コールバックの型は (n: number) => number のように書いてください。
// map、filter、find、some、every、reduce などは使わず、for-of や for で回してコールバックを直接呼んでください。

export function eachWithIndex(
  items: readonly string[],
  fn: (item: string, index: number) => void,
): void {
  for (const [index, item] of items.entries()) {
    fn(item, index);
  }
}
