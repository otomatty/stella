// 問14 id が一致する要素だけを patch（Partial<T>）で上書きした新しい配列
//     例: updateById(rows, 1, { name: "z" }) → id 1 の name が "z"
// 型変数を使い、unknown で型を置き換えないでください。
// 配列の要素は id: number を持つ型に限ります。

export function updateById<T extends { id: number }>(
  items: readonly T[],
  id: number,
  patch: Partial<T>,
): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}
