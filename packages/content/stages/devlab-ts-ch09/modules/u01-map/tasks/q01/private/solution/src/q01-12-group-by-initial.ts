// 問12 単語を、最初の1文字ごとにまとめた Map を返す（キーは最初に出てきた順、中の配列は元の順）
//     例: groupByInitial(["apple", "banana", "avocado"]) → Map { "a" => ["apple", "avocado"], "b" => ["banana"] }
// 引数と戻り値に型注釈を付けます。

export function groupByInitial(words: readonly string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const word of words) {
    const initial = word.slice(0, 1);
    const group = groups.get(initial);
    if (group === undefined) {
      groups.set(initial, [word]);
    } else {
      group.push(word);
    }
  }
  return groups;
}
