// 問10 辞書順に並べた新しい配列を返す
//     例: sortWords(["b", "c", "a"]) → ["a", "b", "c"]
// 引数と戻り値には型注釈を付けます。
// [...配列] でコピーしてから sort で並べ替えます。
export function sortWords(words: readonly string[]): string[] {
  return [...words].sort();
}
