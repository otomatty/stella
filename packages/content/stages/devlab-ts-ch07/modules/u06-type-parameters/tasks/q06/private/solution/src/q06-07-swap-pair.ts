// 07-q06 型変数（ジェネリクス） ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問7
export function swapPair<A, B>(pair: readonly [A, B]): [B, A] {
  return [pair[1], pair[0]];
}
