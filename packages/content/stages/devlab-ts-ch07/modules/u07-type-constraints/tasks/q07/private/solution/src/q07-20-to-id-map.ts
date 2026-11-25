// 問20 id プロパティを持つものに限り、id をキーにした Record<number, T> を返す
//     例: toIdMap([{ id: 1, name: "a" }]) → { 1: { id: 1, name: "a" } }
// 型変数を使い、unknown で型を置き換えないでください。

export function toIdMap<T extends { id: number }>(items: readonly T[]): Record<number, T> {
  const result: Record<number, T> = {};
  for (const item of items) {
    result[item.id] = item;
  }
  return result;
}
