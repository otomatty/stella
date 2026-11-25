// 問11 index 番目の要素を返す。負の数なら後ろから数える（-1 が最後）。範囲外なら undefined
//     例: nth(["a", "b", "c"], -1) → "c"
// 型変数を使い、unknown で型を置き換えないでください。
// 配列の引数は readonly T[] にします。

export function nth<T>(items: readonly T[], index: number): T | undefined {
  return index < 0 ? items[items.length + index] : items[index];
}
