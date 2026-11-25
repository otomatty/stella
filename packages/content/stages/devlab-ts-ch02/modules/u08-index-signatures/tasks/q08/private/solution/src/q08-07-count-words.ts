// 問7 単語ごとに、出てきた回数を数える
//     例: countWords(["a", "b", "a"]) → { a: 2, b: 1 }
// 引数と戻り値には型注釈を付けます。
// キーが自由なオブジェクトの型は { [key: string]: number } の形で書きます。
// キーがない場合の値は ?? で補えます。
export function countWords(words: readonly string[]): { [word: string]: number } {
  const counts: { [word: string]: number } = {};
  for (const word of words) {
    counts[word] = (counts[word] ?? 0) + 1;
  }
  return counts;
}
