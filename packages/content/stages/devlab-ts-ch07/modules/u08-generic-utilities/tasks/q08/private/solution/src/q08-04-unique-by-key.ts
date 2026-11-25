// 問4 keyFn(要素) が同じものは最初の1つだけ残す。keyFn は string か number を返す
//     例: uniqueByKey(["ab", "cd", "e"], (s) => s.length) → ["ab", "e"]
// 型変数を使い、unknown で型を置き換えないでください。
// 配列の引数は readonly T[] にし、元の配列は変更しません。

export function uniqueByKey<T>(items: readonly T[], keyFn: (item: T) => string | number): T[] {
  const seen: (string | number)[] = [];
  const result: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.includes(key)) {
      seen.push(key);
      result.push(item);
    }
  }
  return result;
}
