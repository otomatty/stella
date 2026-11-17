// 07-q07 型引数の制約 ドリル
//
// 教材: https://typescriptbook.jp/reference/generics/type-parameter-constraint

// 問20
export function toIdMap<T extends { id: number }>(items: readonly T[]): Record<number, T> {
  const result: Record<number, T> = {};
  for (const item of items) {
    result[item.id] = item;
  }
  return result;
}
