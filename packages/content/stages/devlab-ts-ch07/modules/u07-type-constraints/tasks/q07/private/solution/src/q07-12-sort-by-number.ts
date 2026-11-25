// 問12 fn の値の小さい順に並べた新しい配列（同じなら元の順）
//     例: sortByNumber(["ccc", "a"], (s) => s.length) → ["a", "ccc"]
// 型変数を使い、unknown で型を置き換えないでください。

export function sortByNumber<T>(items: readonly T[], fn: (item: T) => number): T[] {
  return [...items].sort((a, b) => fn(a) - fn(b));
}
