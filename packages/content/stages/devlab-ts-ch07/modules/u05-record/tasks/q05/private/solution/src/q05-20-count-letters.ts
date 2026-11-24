// 問20 文字ごとの出てきた回数を Record<string, number> で返す
//     例: countLetters("aab") → { a: 2, b: 1 }
// 引数と戻り値に型注釈を付けます。

export function countLetters(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const char of text) {
    counts[char] = (counts[char] ?? 0) + 1;
  }
  return counts;
}
