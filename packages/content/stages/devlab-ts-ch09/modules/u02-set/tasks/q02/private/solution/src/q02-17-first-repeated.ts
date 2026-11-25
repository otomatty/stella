// 問17 前から見て、2回目に出てきた最初の要素を返す。なければ undefined
//     例: firstRepeated(["a", "b", "c", "b", "a"]) → "b"
// 引数と戻り値に型注釈を付けます。
// 重複や要素の有無を調べるために Set を使います。
// 引数の配列は変更しません。

export function firstRepeated(items: string[]): string | undefined {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item)) {
      return item;
    }
    seen.add(item);
  }
  return undefined;
}
