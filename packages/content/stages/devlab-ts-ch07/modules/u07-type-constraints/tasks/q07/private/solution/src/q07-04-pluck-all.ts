// 問4 それぞれの要素の key の値を並べた配列。戻り値の型は T[K][]
//     例: pluckAll([{ id: 1 }, { id: 2 }], "id") → [1, 2]
// 型変数を使い、unknown で型を置き換えないでください。
// key は配列の要素の型のプロパティ名に限ります。

export function pluckAll<T, K extends keyof T>(items: readonly T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}
