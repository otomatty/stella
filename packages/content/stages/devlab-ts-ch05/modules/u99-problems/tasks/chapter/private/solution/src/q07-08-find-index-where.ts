// 05-q07 コールバック関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/callback-functions
//       https://typescriptbook.jp/reference/functions/function-type-declaration

// 問8
export function findIndexWhere(
  items: readonly string[],
  predicate: (s: string) => boolean,
): number {
  for (const [index, item] of items.entries()) {
    if (predicate(item)) {
      return index;
    }
  }
  return -1;
}
