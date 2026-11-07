// 07-q07 型引数の制約 ドリル
//
// 教材: https://typescriptbook.jp/reference/generics/type-parameter-constraint

// 問12
export function sortByNumber<T>(items: readonly T[], fn: (item: T) => number): T[] {
  return [...items].sort((a, b) => fn(a) - fn(b));
}
