// 問13 id プロパティを持つものに限り、id が一致する要素を返す。なければ undefined
//     例: findById([{ id: 1, name: "a" }], 1) → { id: 1, name: "a" }
// 型変数を使い、unknown で型を置き換えないでください。

export function findById<T extends { id: number }>(items: readonly T[], id: number): T | undefined {
  return items.find((item) => item.id === id);
}
