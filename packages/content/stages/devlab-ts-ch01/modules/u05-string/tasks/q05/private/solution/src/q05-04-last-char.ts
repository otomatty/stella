// 問4 最後の1文字を返す。空の文字列なら空の文字列を返す
//     例: lastChar("hello") → "o"
// 戻り値には型注釈を付けてください。
// slice が使えます。
export function lastChar(text: string): string {
  return text.slice(-1);
}
