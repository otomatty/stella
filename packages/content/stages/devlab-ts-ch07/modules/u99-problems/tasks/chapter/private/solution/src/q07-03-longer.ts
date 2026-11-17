// 07-q07 型引数の制約 ドリル
//
// 教材: https://typescriptbook.jp/reference/generics/type-parameter-constraint

// 問3
export function longer<T extends { length: number }>(a: T, b: T): T {
  return b.length > a.length ? b : a;
}
