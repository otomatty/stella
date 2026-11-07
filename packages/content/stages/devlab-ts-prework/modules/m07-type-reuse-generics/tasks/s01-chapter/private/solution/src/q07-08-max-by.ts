// 07-q07 型引数の制約 ドリル
//
// 教材: https://typescriptbook.jp/reference/generics/type-parameter-constraint

// 問8
export function maxBy<T>(items: readonly T[], fn: (item: T) => number): T | undefined {
  let best: T | undefined;
  let bestValue = -Infinity;
  for (const item of items) {
    const value = fn(item);
    if (value > bestValue) {
      best = item;
      bestValue = value;
    }
  }
  return best;
}
