// 問15 predicate が true の要素の数
//     例: countWhere([1, 2, 3], (n) => n > 1) → 2
// 型変数を使い、unknown で型を置き換えないでください。

export function countWhere<T>(items: readonly T[], predicate: (item: T) => boolean): number {
  let count = 0;
  for (const item of items) {
    if (predicate(item)) {
      count++;
    }
  }
  return count;
}
