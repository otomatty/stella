// 問16 先頭から、predicate が true のあいだの要素を集める（false が出たら止める）
//     例: takeWhile([1, 2, 5, 1], (n) => n < 3) → [1, 2]
// 型変数を使い、unknown で型を置き換えないでください。
// 配列の引数は readonly T[] にし、元の配列は変更しません。

export function takeWhile<T>(items: readonly T[], predicate: (item: T) => boolean): T[] {
  const result: T[] = [];
  for (const item of items) {
    if (!predicate(item)) {
      break;
    }
    result.push(item);
  }
  return result;
}
