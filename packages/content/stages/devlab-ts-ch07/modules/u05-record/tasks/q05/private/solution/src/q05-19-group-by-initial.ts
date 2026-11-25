// 問19 単語を最初の1文字ごとにまとめた Record<string, string[]> を返す
//     例: groupByInitial(["apple", "avocado", "banana"]) → { a: ["apple", "avocado"], b: ["banana"] }
// 引数と戻り値に型注釈を付けます。

export function groupByInitial(words: readonly string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const word of words) {
    const key = word.slice(0, 1);
    groups[key] = [...(groups[key] ?? []), word];
  }
  return groups;
}
