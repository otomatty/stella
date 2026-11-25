// 問8 文字ごとに、出てきた回数を数える
//     例: countChars("banana") → { b: 1, a: 3, n: 2 }
// 引数と戻り値には型注釈を付けます。
// キーが自由なオブジェクトの型は { [key: string]: number } の形で書きます。
// キーがない場合の値は ?? で補えます。
export function countChars(text: string): { [char: string]: number } {
  const counts: { [char: string]: number } = {};
  for (const char of text) {
    counts[char] = (counts[char] ?? 0) + 1;
  }
  return counts;
}
