// 07-q07 型引数の制約 ドリル
//
// 教材: https://typescriptbook.jp/reference/generics/type-parameter-constraint

// 問5
export function mergeObjects<A extends object, B extends object>(a: A, b: B): A & B {
  return { ...a, ...b };
}
