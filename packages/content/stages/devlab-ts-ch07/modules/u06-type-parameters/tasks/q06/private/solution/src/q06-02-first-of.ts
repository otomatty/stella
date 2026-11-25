// 問2 最初の要素を返す。空なら undefined
//     例: firstOf([3, 1]) → 3
// 型変数を使い、unknown で型を置き換えないでください。
// 配列の引数は readonly T[] にします。

export function firstOf<T>(items: readonly T[]): T | undefined {
  return items[0];
}
