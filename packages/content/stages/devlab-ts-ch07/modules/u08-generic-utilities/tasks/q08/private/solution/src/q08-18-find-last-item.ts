// 07-q08 ジェネリクスのユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問18
export function findLastItem<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
): T | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (item !== undefined && predicate(item)) {
      return item;
    }
  }
  return undefined;
}
