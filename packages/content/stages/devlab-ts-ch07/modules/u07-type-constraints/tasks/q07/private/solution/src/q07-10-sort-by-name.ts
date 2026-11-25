// 問10 name プロパティを持つものに限り、name の辞書順に並べた新しい配列を返す（localeCompare を使う）
//     例: sortByName([{ name: "b" }, { name: "a" }]) → [{ name: "a" }, { name: "b" }]
// 型変数を使い、unknown で型を置き換えないでください。

export function sortByName<T extends { name: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}
