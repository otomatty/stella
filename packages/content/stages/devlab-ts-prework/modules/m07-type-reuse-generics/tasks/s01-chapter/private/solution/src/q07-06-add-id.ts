// 07-q07 型引数の制約 ドリル
//
// 教材: https://typescriptbook.jp/reference/generics/type-parameter-constraint

// 問6
export function addId<T extends object>(value: T, id: number): T & { id: number } {
  return { ...value, id };
}
