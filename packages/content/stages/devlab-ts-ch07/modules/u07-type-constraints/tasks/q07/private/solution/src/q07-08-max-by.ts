// 問8 fn の値がいちばん大きい要素。同じなら先の方。空なら undefined
//     例: maxBy(["a", "abc"], (s) => s.length) → "abc"
// 型変数を使い、unknown で型を置き換えないでください。

export function maxBy<T>(items: readonly T[], fn: (item: T) => number): T | undefined {
  let best: T | undefined;
  let bestValue = -Infinity;
  for (const item of items) {
    const value = fn(item);
    if (value > bestValue) {
      best = item;
      bestValue = value;
    }
  }
  return best;
}
