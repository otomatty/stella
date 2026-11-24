// 問6 それぞれの文字列の文字数を並べた配列を返す
//     例: lengths(["a", "bcd"]) → [1, 3]
// 引数と戻り値には型注釈を付けます。
// 要素を変換するには map が使えます。
export function lengths(words: readonly string[]): number[] {
  return words.map((w) => w.length);
}
