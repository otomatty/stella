// 07-q07 型引数の制約 ドリル
//
// 教材: https://typescriptbook.jp/reference/generics/type-parameter-constraint

// 問14
export function updateById<T extends { id: number }>(
  items: readonly T[],
  id: number,
  patch: Partial<T>,
): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}
