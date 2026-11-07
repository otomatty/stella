// 07-q08 ジェネリクスのユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問20
export function minBy<T>(items: readonly T[], fn: (item: T) => number): T | undefined {
  let best: T | undefined;
  let bestValue = Infinity;
  for (const item of items) {
    const value = fn(item);
    if (value < bestValue) {
      best = item;
      bestValue = value;
    }
  }
  return best;
}
