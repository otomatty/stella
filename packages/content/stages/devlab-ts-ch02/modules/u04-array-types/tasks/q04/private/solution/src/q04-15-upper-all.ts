// 問15 すべての英字を大文字にした配列を返す
//     例: upperAll(["a", "Bc"]) → ["A", "BC"]
// 引数と戻り値には型注釈を付けます。
// 要素を変換するには map が使えます。
export function upperAll(words: readonly string[]): string[] {
  return words.map((w) => w.toUpperCase());
}
