// 問15 単語を文字数ごとにまとめる。キーは文字数の文字列
//     例: groupByLength(["a", "bb", "c"]) → { "1": ["a", "c"], "2": ["bb"] }
// 引数と戻り値には型注釈を付けます。
// キーが自由なオブジェクトの型は { [key: string]: string[] } の形で書きます。
// キーがない場合の値は ?? で補えます。
export function groupByLength(words: readonly string[]): { [length: string]: string[] } {
  const groups: { [length: string]: string[] } = {};
  for (const word of words) {
    const key = String(word.length);
    groups[key] = [...(groups[key] ?? []), word];
  }
  return groups;
}
