// 問11 age プロパティを持つものに限り、age がいちばん大きい要素を返す。空なら undefined
//     例: oldest([{ name: "a", age: 30 }, { name: "b", age: 41 }]) → { name: "b", age: 41 }
// 型変数を使い、unknown で型を置き換えないでください。

export function oldest<T extends { age: number }>(items: readonly T[]): T | undefined {
  let best: T | undefined;
  for (const item of items) {
    if (best === undefined || item.age > best.age) {
      best = item;
    }
  }
  return best;
}
