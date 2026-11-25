// 問2 length を持つ値の配列から、length がいちばん短いものを返す（同じなら先の方）。空なら undefined。length を持つ型に限る
//     例: shortest(["abc", "a", "ab"]) → "a"
// 型変数を使い、unknown で型を置き換えないでください。

export function shortest<T extends { length: number }>(items: readonly T[]): T | undefined {
  let best: T | undefined;
  for (const item of items) {
    if (best === undefined || item.length < best.length) {
      best = item;
    }
  }
  return best;
}
