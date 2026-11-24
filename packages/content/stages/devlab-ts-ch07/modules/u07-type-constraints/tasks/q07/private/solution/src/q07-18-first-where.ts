// 問18 predicate が true の最初の要素。なければ undefined
//     例: firstWhere([1, 4, 6], (n) => n % 2 === 0) → 4
// 型変数を使い、unknown で型を置き換えないでください。

export function firstWhere<T>(items: readonly T[], predicate: (item: T) => boolean): T | undefined {
  for (const item of items) {
    if (predicate(item)) {
      return item;
    }
  }
  return undefined;
}
