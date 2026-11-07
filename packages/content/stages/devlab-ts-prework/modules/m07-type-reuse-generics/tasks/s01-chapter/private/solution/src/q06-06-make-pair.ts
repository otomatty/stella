// 07-q06 型変数（ジェネリクス） ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問6
export function makePair<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}
