// 問6 「#」で始まっていれば true を返す
//     例: isHashtag("#agora") → true
// 戻り値には型注釈を付けてください。
// startsWith が使えます。
export function isHashtag(text: string): boolean {
  return text.startsWith("#");
}
