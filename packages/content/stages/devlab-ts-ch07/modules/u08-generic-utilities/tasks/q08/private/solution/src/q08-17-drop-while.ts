// 問17 先頭から、predicate が true のあいだの要素を飛ばし、残りを返す
//     例: dropWhile([1, 2, 5, 1], (n) => n < 3) → [5, 1]
// 型変数を使い、unknown で型を置き換えないでください。
// 配列の引数は readonly T[] にし、元の配列は変更しません。

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
