// 問20 fn の値がいちばん小さい要素。同じなら先の方。空なら undefined
//     例: minBy(["abc", "a", "b"], (s) => s.length) → "a"
// 型変数を使い、unknown で型を置き換えないでください。
// 配列の引数は readonly T[] にし、元の配列は変更しません。

export function minBy<T>(items: readonly T[], fn: (item: T) => number): T | undefined {
  let best: T | undefined;
  let bestValue = Infinity;
  for (const item of items) {
    const value = fn(item);
    if (value < bestValue) {
      best = item;
      bestValue = value;
    }
  }
  return best;
}
