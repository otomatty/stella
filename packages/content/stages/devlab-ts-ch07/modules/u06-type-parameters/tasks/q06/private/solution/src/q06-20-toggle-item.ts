// 問20 item が含まれていれば除き、なければ末尾に足した新しい配列
//     例: toggleItem(["a", "b"], "a") → ["b"]
// 型変数を使い、unknown で型を置き換えないでください。
// 配列の引数は readonly T[] にします。

export function toggleItem<T>(items: readonly T[], item: T): T[] {
  return items.includes(item) ? items.filter((x) => x !== item) : [...items, item];
}
