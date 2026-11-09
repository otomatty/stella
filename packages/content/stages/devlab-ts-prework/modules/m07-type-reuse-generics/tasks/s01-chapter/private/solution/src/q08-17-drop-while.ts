// 07-q08 ジェネリクスのユーティリティ ドリル
//
// 教材: https://typescriptbook.jp/reference/generics
//       https://typescriptbook.jp/reference/generics/type-variables

// 問17
export function dropWhile<T>(items: readonly T[], predicate: (item: T) => boolean): T[] {
  let index = 0;
  while (index < items.length) {
    const item = items[index];
    if (item === undefined || !predicate(item)) {
      break;
    }
    index++;
  }
  return items.slice(index);
}
