// 問7 タプル [a, b] を [b, a] にする
//     例: swapPair(["a", 1]) → [1, "a"]
// 型変数を使い、unknown で型を置き換えないでください。
// 引数は読み取り専用のタプルにします。

export function swapPair<A, B>(pair: readonly [A, B]): [B, A] {
  return [pair[1], pair[0]];
}
