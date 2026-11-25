// 問9 fn の値の合計
//     例: sumBy([{ price: 100 }, { price: 50 }], (x) => x.price) → 150
// 型変数を使い、unknown で型を置き換えないでください。

export function sumBy<T>(items: readonly T[], fn: (item: T) => number): number {
  let total = 0;
  for (const item of items) {
    total += fn(item);
  }
  return total;
}
